# AGENTS.md

AI 编码助手的项目指南。进入项目后先读这个文件，细节按需查阅索引链接。

## 项目概述

Files.md 是本地优先的 Markdown 笔记 PWA。数据存储在纯 `.md` 文件中，不离开设备。包含：
- **Web 前端**：PWA，直接打开 `web/index.html` 即可运行，无需构建
- **Go 后端**：可选的 Telegram Bot + 同步服务器（一个二进制）
- **本地优先**：默认 OPFS，可切换到本地文件系统 API，支持自托管同步

## 常用命令

```bash
# Go
go build ./...
go test ./...
go test ./server/... -v

# JS 语法检查
node -c web/chat.js

# 运行服务器
go run cmd/server/server.go

# 实用脚本（在笔记文件目录下运行）
go run /path/to/cmd/whoop/whoop.go           # 添加 Whoop 健康指标到 journal
go run /path/to/cmd/tomdlinks/tomdlinks.go . # wikilinks → markdown links
go run /path/to/cmd/backlink/backlink.go     # 插入反向链接
go run /path/to/cmd/shifttime/shifttime.go   # 调整 journal 时间戳（时区变更后用）
```

## 目录结构

```
web/                    前端 PWA（无构建系统）
  index.html            唯一入口
  app.js                主初始化、全局状态、路由（isChat/isMemFS 等）
  chat.js               Chat.md 聊天界面，消息渲染、Chat tabs、快速入口
  files.js              文件系统核心：内存镜像、OPFS/LocalFS、服务器同步
  editor.js             CodeMirror 编辑器初始化和配置
  modals.js             搜索弹窗（SearchModal）及其他弹窗 UI
  welcome.js            首次启动引导页
  offline.js            Service Worker，PWA 离线支持
  app.css / chat.css    全局样式 / 聊天样式
  lib/                  Vendored 依赖（CodeMirror、HyperMD、mermaid、latex 等）

server/                 Go 后端
  bot.go                Telegram Bot 核心逻辑（消息处理、命令路由）
  bot_settings.go       Bot 设置相关命令
  bot_forwards.go       Bot 转发消息处理
  chat.go               Chat.md 消息解析与写入逻辑
  worker.go             定时任务 Worker（习惯提醒、定时移动等）
  fs/                   服务端文件系统抽象（跨平台，含 Windows/Linux/Darwin/WASM）
  sync/                 同步服务器（mtime 比较、fslog 追加日志、merge）
  journal/              日记文件解析与写入（journal/YYYY.MM Month.md）
  habits/               习惯追踪逻辑
  userconfig/           用户配置（config.json）读写
  db/                   Redis 抽象（含 db_fake.go 用于测试）
  config/               服务器启动配置
  stats/                使用统计
  plugins/              插件（world_clock 等）
  i18n/                 国际化字符串（含俄语 ru.json）
  pkg/tg/               Telegram API 封装（含 tg_fake.go）
  pkg/txt/              文本工具
  pkg/slice/            切片工具

cmd/
  server/server.go      服务器入口（Bot + 同步服务器）
  backlink/             插入反向链接脚本
  tomdlinks/            wikilinks 转换脚本
  whoop/                Whoop 健康数据导入脚本
  shifttime/            时间戳调整脚本

tests/                  E2E 测试（Playwright）
  files.spec.js         文件操作测试
  chat.spec.js          聊天功能测试
  editor.spec.js        编辑器测试
  sidebar.spec.js       侧边栏测试
  sync.spec.js          同步测试
  perf.spec.js          性能测试

docs/                   详细文档（按需查阅）
vendor/                 Go 依赖（自包含，不依赖外部 CDN）
```

## 核心概念（术语）

| 术语 | 含义 |
|------|------|
| `filename` | 带扩展名的文件名，如 `note.md`（用作 ID） |
| `header` | 去掉扩展名并首字母大写，如 `Note` |
| `body` | 文件内容 |
| `dir` | 分类目录，如 `happiness`（只支持一级嵌套） |
| `mtime` | 文件内容修改时间（用于同步） |
| `ctime` | 文件元数据变化时间（用于追踪移动/重命名） |
| `userID` | 即 Telegram chatID |

## 预定义文件结构（用户笔记目录）

```
Chat.md               聊天收集箱（主入口，详见 docs/chat-md-architecture.md）
Later.md              稍后处理的任务
Read.md / Watch.md / Shop.md   清单
brain/                笔记（每文件一个想法）
journal/YYYY.MM Month.md       日记（按月）
habits/               习惯追踪
archive/              归档
media/                图片（png/jpg/webp/gif）
config.json           用户配置
```

## 代码风格

### Go 后端
- 有对应 `_test.go`，写测试
- 错误作为返回值，不 panic；忽略错误需注释说明原因
- 方法名无 `get*` 前缀
- 优先 fake（如 `db_fake.go`、`tg_fake.go`），不用 mock/stub
- 用 `gofumpt` 格式化

### 前端
- 直接修改 `lib/` 中的代码，用 `PATCHED` 注释标记
- 无构建系统：10 年后打开 `index.html` 仍能工作
- 跨文件引用用 `getElementById`，不用其他文件定义的全局变量

## 常见陷阱

- **跨文件变量**：用 `getElementById` 而非全局变量（见 [docs/frontend-pitfalls.md](docs/frontend-pitfalls.md)）
- **竞态条件**：大多数 bug 来自异步流被中断，注意 await 与 lock 之间的窗口期
- **contentEditable 回车**：需同时 `preventDefault()` + `stopPropagation()` + `return false`
- **CSS 作用域**：新组件 CSS 必须用父容器限定，不用裸 class 选择器
- **中文 IME**：不能依赖 `e.isComposing`，需手动追踪 compositionstart/end

## 设计原则

1. **最小化代码**：PR 应删除或简化代码，而非增加
2. **依赖自包含**：所有依赖在 `vendor/` 和 `web/lib/` 中，无外部 CDN
3. **功能克制**：新功能前问"这真的必要，还是只是多巴胺？"
4. **跨平台兼容**：文件名禁用 `:<>?*` 等特殊字符
5. **本地优先**：数据不离开设备

## AI 协作工作流

沉淀自实际会话的协作模式与坑点：

### 上下文紧张 → 子代理并行
当上下文快满、且任务可拆分成独立文件时，派 `code-writer` 子代理并行执行，主代理只做协调 + grep 验证 + commit。子代理 prompt 指向 plan 文件作为 context 来源（如 `C:\Users\fyycb\.claude\plans\*.md`），**不要把整个会话历史塞给子代理**——子代理有独立 context window。代表案例：Plan C 用 2 个子代理分别实现 `lib/fs.js` 和 `chat.js`。

### 提交消息：多 `-m` 形式
PowerShell 环境下 here-string (`@'...'@`) 在 Bash tool 中会被字面化，commit 消息首尾会出现 `@` 装饰字符（无功能影响，纯展示瑕疵）。规避方法：用 `git commit -m "subject" -m "body1" -m "body2"` 多 `-m` 形式，git 自动加段落空行。

### 历史清理：amend + rebase
需要改旧 commit 消息（清掉装饰字符等）且**未推送**时：
1. `git checkout <bad-commit>` (detach)
2. `git commit --amend -m "new message"`
3. `git rebase --onto <new-hash> <old-hash> <branch>` 对每个 dependent branch
4. 重新 `git merge` 处理可能复现的 conflict

## 详细文档索引

| 文档 | 内容 |
|------|------|
| [docs/frontend-pitfalls.md](docs/frontend-pitfalls.md) | 前端开发陷阱详解 |
| [docs/chat-md-architecture.md](docs/chat-md-architecture.md) | Chat.md 架构与前后端数据现状 |
| [docs/function-README.md](docs/function-README.md) | 当前已实现的功能说明（数据完整性 / 全局常驻 / 浮窗按钮 / Tab 管理） |
| [docs/PR-index.md](docs/PR-index.md) | PR 历史索引 |
| [README.md](README.md) | 用户文档、功能介绍、ADRs（架构决策记录） |
