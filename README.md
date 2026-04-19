# jd-reviews

Claude Code Skill：抓取京东商品评论，保存为本地 CSV 文件。

## 功能

- 自动处理京东登录（持久化 profile，登录一次永久复用）
- 自动定位评论弹层，处理虚拟滚动
- 收集 100 条评论，去重后保存为 `reviews.csv`

## 安装

将本仓库克隆到 Claude Code skills 目录：

```bash
git clone git@github.com:SeoToolkit/jd-reviews.git ~/.claude/skills/jd-reviews
```

## 使用

在 Claude Code 中输入：

```
/jd-reviews https://item.jd.com/xxxxxxx.html
```

## 依赖

```bash
sudo npm install -g @playwright/cli@latest
```

## 踩坑记录

详见 [SKILL.md](./SKILL.md)，记录了 6 个实际遇到的问题及解决方案：

1. 京东跳转验证/登录页
2. CSS Modules 选择器定位
3. 虚拟滚动只能抓到少量评论
4. mousewheel 无法触发弹层内滚动
5. run-code 里不能用 document/setTimeout
6. --raw eval 输出需要两次 JSON.parse
