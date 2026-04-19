---
name: jd-reviews
description: 抓取京东商品评论并保存到本地 CSV 文件。要求用户输入商品 URL 和需要抓取的数量。自动处理登录、评论弹层、虚拟滚动等问题。Use when user wants to scrape JD.com product reviews.
allowed-tools: Bash(playwright-cli:*) Bash(python3:*) Bash(cat:*) Bash(mkdir:*) Bash(sed:*)
---

# 京东商品评论抓取

抓取指定京东商品的评论，保存为本地 CSV 文件。

## 发起询问 (IMPORTANT)

如果用户没有在当前请求中提供商品链接和提取数量，请立即停止执行并询问用户：
1. 需要抓取的京东商品 URL？
2. 需要抓取多少条评论？(如果不指定则默认 100)

## 前置条件

```bash
# 检查 playwright-cli 是否安装
playwright-cli --version
# 如未安装：
sudo npm install -g @playwright/cli@latest
```

## 执行流程

### Step 1：打开有头浏览器（首次需登录）

```bash
# --headed 打开可见浏览器窗口，--profile 持久化登录状态
# ${JD_URL} 是用户提供的京东链接
playwright-cli open --headed --profile=~/.jd-profile "${JD_URL}"
```

**检查登录状态**：如果页面要求登录，请提示**用户在浏览器窗口中完成登录**，登录后告知继续。
登录状态保存在 `~/.jd-profile`，下次直接复用，无需重新登录。

### Step 2：导航到商品页并打开评论弹层

如果刚才进行了登录，需要重新导航到指定商品页：
```bash
playwright-cli goto "${JD_URL}"
```

用 snapshot 找"全部评价"按钮的 ref：

```bash
playwright-cli snapshot 2>&1 | grep -i "全部评价"
```

输出示例：`- generic [ref=e280] [cursor=pointer]: 全部评价`

点击打开评论弹层：

```bash
playwright-cli click [替换为搜到的ref]
```

截图确认弹层已打开：

```bash
playwright-cli screenshot --filename=reviews-dialog.png
```

### Step 3：配置并运行收集脚本

京东评论弹层使用**虚拟滚动**，不能一次性提取所有评论，需要边滚动边收集。

将目标抓取数量写入脚本：
```bash
# ${TARGET_COUNT} 是用户要求抓取的数量，默认为 100
sed -i.bak -e "s/const TARGET = [0-9]*/const TARGET = ${TARGET_COUNT}/" {SKILL_DIR}/scripts/collect_reviews.js
```

执行脚本：
```bash
playwright-cli run-code --filename={SKILL_DIR}/scripts/collect_reviews.js
```

### Step 4：取出数据，生成 CSV

```bash
# 取出收集好的数据
playwright-cli --raw eval "window.__reviews__" > /tmp/jd_reviews_raw.json

# 生成 CSV (${TARGET_COUNT} 替换为实际数字)
python3 << 'PYEOF'
import json, csv, sys

with open('/tmp/jd_reviews_raw.json') as f:
    content = f.read().strip()

try:
    reviews = json.loads(json.loads(content))
except:
    reviews = json.loads(content)

TARGET_COUNT = ${TARGET_COUNT}
output = 'reviews.csv'
with open(output, 'w', newline='', encoding='utf-8-sig') as f:
    writer = csv.DictWriter(f, fieldnames=['user', 'content', 'date', 'spec'])
    writer.writeheader()
    writer.writerows(reviews[:TARGET_COUNT])

print(f"已保存 {len(reviews[:TARGET_COUNT])} 条评论到 {output}")
PYEOF
```

### Step 5：关闭浏览器

```bash
playwright-cli close
```

---

## 踩坑记录与解决方案 (不变)
### 问题1：京东跳转验证/登录页...
(略，详见历史文档)

---

## 踩坑记录与解决方案

### 问题1：京东跳转验证/登录页

**现象**：直接 `playwright-cli open` 打开商品页，被重定向到登录页。

**解决**：使用 `--headed` 打开有头浏览器，让用户手动登录；用 `--profile` 持久化登录状态，下次复用。

```bash
playwright-cli open --headed --profile=~/.jd-profile "https://..."
```

### 问题2：评论 DOM 选择器不对

**现象**：用 `.comment-item`、`.comment-list` 等常见选择器找不到评论节点。

**解决**：京东评论弹层用的是 CSS Modules 类名（如 `_rateListBox_1ygkr_1`）和自定义组件类名（如 `jdc-pc-rate-card`）。用 `[class*=xxx]` 模糊匹配定位：

```bash
# 探测评论容器
playwright-cli --raw eval "['[class*=_rateListBox]','[class*=card]'].map(s => s+': '+document.querySelectorAll(s).length).join('\n')"

# 确认选择器
playwright-cli --raw eval "document.querySelectorAll('.jdc-pc-rate-card').length"
```

实际有效选择器：
- 评论弹层容器：`[class*=_rateListContainer]`
- 单条评论：`.jdc-pc-rate-card`
- 用户名：`.jdc-pc-rate-card-nick`
- 评论内容：`.jdc-pc-rate-card-main-desc`
- 日期：`.date.list`
- 商品规格：`.jdc-pc-rate-card-info .info`

### 问题3：虚拟滚动导致只能抓到少量评论

**现象**：评论弹层 DOM 里始终只有 3~7 条评论，即使页面已滚动很长。

**原因**：京东评论弹层使用虚拟滚动（Virtual Scroll），只渲染当前可见区域的节点，滚出视口的节点会被销毁。

**解决**：用 `run-code` 执行 JS 脚本，边滚动边提取，用 Map 去重累积：

```javascript
// 关键逻辑
const allReviews = new Map();
for (let i = 0; i < 80; i++) {
  const visible = await page.evaluate(() => [...document.querySelectorAll('.jdc-pc-rate-card')].map(...));
  visible.forEach(r => allReviews.set(r.user + '|' + r.content.slice(0,40), r));
  if (allReviews.size >= 100) break;
  await page.evaluate(() => { document.querySelector('[class*=_rateListContainer]').scrollTop += 1500; });
  await page.waitForTimeout(1500);
}
```

### 问题4：mousewheel 无法触发弹层内滚动

**现象**：`playwright-cli mousewheel 0 800` 滚动的是页面，不是评论弹层内部。

**解决**：直接用 `page.evaluate` 修改弹层容器的 `scrollTop`，绕过鼠标事件。

### 问题5：run-code 里不能用 document/setTimeout

**现象**：`run-code` 脚本里直接写 `document.querySelector(...)` 报 `ReferenceError: document is not defined`；写 `setTimeout` 报 `setTimeout is not defined`。

**解决**：
- `document` 要通过 `page.evaluate(() => document.xxx)` 访问
- 延时用 `page.waitForTimeout(ms)` 替代 `setTimeout`

### 问题6：--raw eval 输出需要两次 JSON.parse

**现象**：`playwright-cli --raw eval "window.__reviews__"` 输出的内容，用 `json.loads()` 一次解析后得到的是字符串，不是列表。

**原因**：`--raw` 输出的是 JS 值的 JSON 表示，`window.__reviews__` 本身已经是 JSON 字符串，所以输出是一个被 JSON 编码的字符串（带外层引号）。

**解决**：
```python
content = f.read().strip()
reviews = json.loads(json.loads(content))  # 两次解析
```

---

## 完整命令速查

```bash
# 1. 首次登录（之后复用 profile）
playwright-cli open --headed --profile=~/.jd-profile "https://passport.jd.com/new/login.aspx"

# 2. 打开商品页
playwright-cli open --headed --profile=~/.jd-profile "{JD_URL}"

# 3. 找评价按钮 ref
playwright-cli snapshot 2>&1 | grep "全部评价"

# 4. 点击打开评论弹层
playwright-cli click {ref}

# 5. 运行收集脚本
playwright-cli run-code --filename={SKILL_DIR}/scripts/collect_reviews.js

# 6. 导出 CSV
playwright-cli --raw eval "window.__reviews__" > /tmp/jd_reviews_raw.json
python3 -c "import json,csv; r=json.loads(json.loads(open('/tmp/jd_reviews_raw.json').read())); csv.DictWriter(open('reviews.csv','w',newline='',encoding='utf-8-sig'),['user','content','date','spec']).writeheader() or csv.DictWriter(open('reviews.csv','a',newline='',encoding='utf-8-sig'),['user','content','date','spec']).writerows(r); print(len(r),'条')"

# 7. 关闭
playwright-cli close
```
