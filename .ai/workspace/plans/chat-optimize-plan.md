---
name: chat-optimize-plan
type: plan
updated: 2026-06-05
status: ready
owner: 代码编写者
related:
  - status: [[status]]
  - 规范: 启动器.md / 代码编写者.md / 项目集目录说明.md
---

# Chat 模块优化计划

## 目标

1. **任务1 — 选中标签更显眼**：`#chat-tabs` 里 `.chat-tab.active` 当前背景与聊天区同色，区分度弱。加强调色使其明显突出。
2. **任务2 — 主题切换**：齿轮 Settings 区域提供 light/dark 手动切换（图标表达）；同时监听系统主题，系统变化时对称跟随。

## 已确认的决策（与用户对齐）

- 冲突规则：**案1「直近事件优先」**——手动切换保持，直到系统下次变化时被系统覆盖。
- 只做 **light / dark** 两态，用图标表达（无 Auto 第三态）。
- 系统切到亮色时 app **对称**跟随切回亮色（非单向）。
- 主题实现：**方案B**——把 `@media (prefers-color-scheme)` 改为 `html[data-theme]` 属性驱动，由 JS 决定当前主题。
- 持久化：`localStorage`（键 `theme`），不进 `config.json`。

## 关键发现（影响实现，务必先读）

两个生效主题文件 `web/lib/theme-brutal.css`（亮）/ `web/lib/theme-brutal-dark.css`（暗）：

- **整份文件只被一个 `@media (prefers-color-scheme: light|dark)` 外壳包裹**，内含 `:root` 变量（~22 个，带 `!important`）+ ~80 条组件规则 + 一个 `@keyframes sidebar-highlight-brutal`。
- **大量组件规则写死了各自主题的颜色**（非全部走变量），例如：
  - `.message:hover` 暗 `#000` / 亮 `neo-orange`
  - inline-code 暗 `#28251F/neo-orange` / 亮 `#EFEFEF/#C01343`
  - tooltip、tree 选中文字色（`#E8E3D8` vs `#FFF`）等
  - ⇒ 仅覆盖 `:root` 变量**不够**，否则手动切换后组件颜色与背景错配。必须让整份规则随 `data-theme` 走。
- **亮色文件内部还嵌了一层多余的 `@media (prefers-color-scheme: light)`**（包住部分 toolbar 规则），转换时需展平。

⇒ 方案B 的正确做法不是"改一行外壳"，而是 **rescope 整份规则**（详见任务2 步骤）。

## 影响文件清单

| 文件 | 改动 | 备注 |
|------|------|------|
| `web/chat.css` | 任务1：`.chat-tab.active` 强调样式 | 自有文件，无需 PATCHED |
| `web/lib/theme-brutal.css` | 任务2：去 `@media` 外壳 → `html[data-theme="light"]` 前缀；展平内层多余 `@media` | vendored，需 `PATCHED` |
| `web/lib/theme-brutal-dark.css` | 任务2：去 `@media` 外壳 → `html[data-theme="dark"]` 前缀 | vendored，需 `PATCHED` |
| `web/index.html` | 任务2：`<head>` 内联首屏脚本；Settings 面板加主题切换项 | 防 FOUC + UI |
| `web/app.js` | 任务2：`applyTheme()` / `toggleTheme()` / 系统监听 / meta theme-color 同步 | 核心逻辑 |
| `web/offline.js` | 任务2：核对 SW 缓存清单含被改文件并按需 bump 版本 | 离线一致性 |

---

## 任务1 — 选中标签更显眼

文件：`web/chat.css`，仅改 `.chat-tab.active` 及标签名样式。

方案（颜色用 `--col-marker` = `neo-orange #e8912d`，在亮/暗两套主题里都定义且醒目）：

```css
.chat-tab.active {
    background: var(--col-bg);
    border-top: 2px solid var(--col-marker);   /* 顶部强调条 */
    border-bottom: 2px solid var(--col-bg);
    margin-bottom: -1px;
}
.chat-tab .chat-tab-name {        /* 未选中：略弱化以增加对比 */
    color: var(--col-tx-alt);
}
.chat-tab.active .chat-tab-name {
    color: var(--col-tx);
    font-weight: 600;
}
```

- 具体强调色/线宽可微调；选 `--col-marker` 是为了 light/dark 都明显（brutal 的 `--col-link` 是近黑/米白，不够跳）。
- 验收：选中标签有橙色顶条 + 文字加深加粗，与未选中明显区分；暗色与亮色下均成立。

---

## 任务2 — 主题切换（方案B）

### 2.1 CSS：属性驱动改造（两份 vendored 文件，标 `PATCHED`）

对 `theme-brutal-dark.css`（暗）：
1. 删除第 1 行 `@media (prefers-color-scheme: dark) {` 与文件末尾匹配的 `}`。
2. `:root {` 这一块改写为 `html[data-theme="dark"] {`（变量直接挂在该选择器上即等价于 `:root`，全局可见）。
3. 其余每条顶层选择器加前缀 `html[data-theme="dark"] `（如 `.message` → `html[data-theme="dark"] .message`，`::selection` → `html[data-theme="dark"] ::selection`）。
4. `@keyframes sidebar-highlight-brutal` 提到顶层（不加前缀，keyframes 全局；两文件内容一致，无害）。

对 `theme-brutal.css`（亮）：同上，前缀用 `html[data-theme="light"] `；**额外**：展平内部多余的 `@media (prefers-color-scheme: light)`，把其内规则直接并入（否则手动选亮但系统为暗时这批规则不生效）。

实现方式：因选择器多，建议**整体重写文件**（带前缀版本）而非逐条手改，减少遗漏；顶部加 `/* PATCHED: media-query → data-theme attribute driven (manual theme toggle) */` 注释。

> 不采用 CSS 原生嵌套（`html[data-theme="dark"]{ … }` 包裹）方案：虽 diff 更小，但会给原本扁平的 vendored 文件引入嵌套特性，老环境不支持时整份主题失效，blast radius 大，违背"10 年后仍可打开"。前缀法无新特性依赖，更稳。

### 2.2 首屏脚本（`web/index.html` `<head>`，防 FOUC）

在 `<head>` 内、绘制前同步设好属性：

```html
<script>
(function () {
  try {
    var t = localStorage.getItem('theme');
    if (t !== 'light' && t !== 'dark') {
      t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) {}
})();
</script>
```

### 2.3 切换 UI（Settings 面板，图标表达）

在 `#settings-panel .settings-body` 加一项「外观 / Appearance」，含一个图标按钮（sun/moon 切换），`onclick="toggleTheme()"`。图标随当前主题切换（亮色显示月亮=点击转暗，暗色显示太阳=点击转亮）。

### 2.4 JS 逻辑（`web/app.js`，案1）

```js
function currentTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light';
}
function applyTheme(theme) {                  // 单一入口
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);       // 每次都持久化 = 直近事件优先
  syncThemeColorMeta(theme);                   // PWA 地址栏色
  updateThemeToggleIcon(theme);                // sun/moon 图标
}
function toggleTheme() {                        // 手动（齿轮面板图标）
  applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
}
// 系统变化 → 对称跟随（案1：覆盖手动选择）
matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', e => applyTheme(e.matches ? 'dark' : 'light'));
```

- 初始图标/meta 在 `init()` 里按 `currentTheme()` 同步一次。
- `syncThemeColorMeta`：更新 `<meta name="theme-color">`（现为 media 驱动，手动覆盖时需 JS 设 content，亮 `#F8F8F7` / 暗 `#262624`）。

### 2.5 Service Worker（`web/offline.js`）

- 核对缓存清单是否包含 `theme-brutal.css`/`theme-brutal-dark.css`（当前疑似仍列着未使用的 `theme-light.css`/`theme-dark.css`，需对齐）。
- CSS/JS 有改动，按项目 `?v=` 机制 bump 版本，确保离线缓存刷新。

---

## 实施顺序

1. 任务1（`chat.css`）——独立、低风险，先做先验。
2. 任务2 CSS 改造（两份 brutal 文件，整体重写带前缀）。
3. `index.html` 首屏脚本 + Settings UI。
4. `app.js` 逻辑 + meta 同步。
5. `offline.js` 缓存核对 + 版本 bump。

## 验证计划

- 手动：系统亮/暗各一次，切到聊天页 → 标签高亮明显；齿轮里点图标切换，全局（含 inline-code、tooltip、tree 选中、引用块、代码块）配色一致无错配。
- 案1 验证：手动切到与系统相反 → 保持；改系统主题触发 change → app 跟随翻转。
- 对称验证：系统 dark→light 与 light→dark 都跟随。
- FOUC：硬刷新（Cmd/Ctrl+Shift+R）无"先亮后暗"闪。
- PWA：standalone 模式地址栏/状态栏色与当前主题一致。
- 离线：断网后刷新主题与样式仍正确（SW 缓存已更新）。
- `node -c web/app.js` 语法检查；E2E（`tests/`，若环境具备）跑 chat/editor 相关用例。

## 风险与回滚

- 风险：rescope 遗漏某条选择器 → 该组件在手动模式下失色。缓解：整体重写 + 改后逐区域目视核对（标题/链接/引用/代码/列表/消息/侧栏/搜索/tooltip）。
- 风险：`!important` 与详细度 —— `html[data-theme="x"]`（0,1,1）> `:root`（0,1,0），且无 `@media` 竞争，覆盖成立。
- 回滚：两份 brutal 文件改动集中且标 `PATCHED`，可整文件还原；JS/HTML 改动独立成块，易撤。

## 待确认（实现前可并行）

- 切换图标放在 **Settings 面板**（本计划默认）还是工具栏独立 sun/moon 图标？（按 "齿轮Settings按钮" 字面默认放面板内）
