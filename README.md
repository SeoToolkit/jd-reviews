# jd-reviews

> 抓取京东商品评论，保存为本地 CSV 文件。

一个通用 AI Agent Skill，兼容所有支持 SKILL.md 标准的 AI 编程助手。

---

## 支持的 AI 工具

SKILL.md 已成为主流 AI CLI 工具的事实标准，本 skill 可直接用于：

| 工具 | Skills 目录 | 触发方式 |
|------|------------|---------|
| [Claude Code](https://claude.ai/code) | `~/.claude/skills/` | `/jd-reviews` |
| [OpenClaw](https://github.com/openclaw/openclaw) | `~/.openclaw/skills/` | `/jd-reviews` |
| [Hermes Agent](https://hermes.ai) | `~/.hermes/skills/` | `/jd-reviews` |
| [Gemini CLI](https://geminicli.com) | `~/.gemini/skills/` | `/jd-reviews` |
| [GitHub Copilot CLI](https://githubnext.com/projects/copilot-cli) | `~/.copilot/skills/` | 自然语言触发 |

---

## 安装

### 方式一：克隆到对应工具的 skills 目录

```bash
# Claude Code
git clone git@github.com:SeoToolkit/jd-reviews.git ~/.claude/skills/jd-reviews

# OpenClaw
git clone git@github.com:SeoToolkit/jd-reviews.git ~/.openclaw/skills/jd-reviews

# Gemini CLI
git clone git@github.com:SeoToolkit/jd-reviews.git ~/.gemini/skills/jd-reviews

# Hermes Agent
git clone git@github.com:SeoToolkit/jd-reviews.git ~/.hermes/skills/jd-reviews
```

### 方式二：用 cc-switch 统一管理（推荐）

[cc-switch](https://github.com/farion1231/cc-switch) 是一个跨平台桌面应用，可以统一管理 Claude Code、Codex、Gemini CLI、OpenClaw 等工具的 skills，无需手动复制到各个目录。

安装 cc-switch 后，在 Skills 管理界面添加本仓库地址，即可一键同步到所有已安装的 AI 工具。

---

## 使用

安装后，在任意支持的 AI 工具中触发：

```
/jd-reviews https://item.jd.com/xxxxxxx.html
```

或直接用自然语言：

```
帮我抓取这个京东商品的 100 条评论：https://item.jd.com/xxxxxxx.html
```

AI 会自动按照 SKILL.md 中的流程执行，处理登录、评论弹层、虚拟滚动等问题，最终输出 `reviews.csv`。

---

## 依赖

```bash
sudo npm install -g @playwright/cli@latest
```

---

## 功能

- 持久化登录状态（`~/.jd-profile`），登录一次永久复用
- 自动定位评论弹层，处理 CSS Modules 动态类名
- 解决虚拟滚动问题，边滚动边收集，Map 去重
- 收集 100 条评论，保存为 `reviews.csv`（含用户名、内容、日期、商品规格）

---

## 踩坑记录

详见 [SKILL.md](./SKILL.md)，记录了 6 个实际遇到的问题及解决方案：

1. 京东跳转验证/登录页 → `--headed --profile` 持久化登录
2. CSS Modules 选择器定位 → `[class*=xxx]` 模糊匹配
3. 虚拟滚动只能抓到少量评论 → 边滚动边收集 + Map 去重
4. `mousewheel` 无法触发弹层内滚动 → 直接修改 `scrollTop`
5. `run-code` 里不能用 `document`/`setTimeout` → `page.evaluate` + `page.waitForTimeout`
6. `--raw eval` 输出需要两次 `JSON.parse`

---

## 文件结构

```
jd-reviews/
├── SKILL.md                 # 完整流程 + 踩坑解决方案（AI 读取执行）
├── scripts/
│   └── collect_reviews.js   # 虚拟滚动收集脚本
└── README.md
```
