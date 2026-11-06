# 拾卡 · Anki 卡包浏览器

使用 Next.js App Router、TypeScript 和 shadcn/ui 的 Anki 卡包浏览器。支持按牌组或标签筛选、全文搜索、查看卡片正反面及原始字段。文件在浏览器 Worker 中解析，不上传、不持久保存；刷新网页后需要重新导入。

## 运行

使用 Node.js 22，在项目目录运行：

```sh
npm ci
npm run dev
```

打开 `http://localhost:3000`。

```sh
npm run typecheck
npm run lint
npm run build
```

构建产物在 `out/`，可用 `python3 -m http.server 8765 --directory out` 预览。无需 Node.js 生产服务器。开发与构建命令会从已安装依赖生成 SQLite WASM、加载器及许可证清单到 `public/vendor/`，不要手动编辑这些文件。

## 代码结构

- `src/app/`：页面、元信息和暖灰 / 炭黑 / 陶土橙主题。
- `src/components/anki-reader.tsx`：导入、筛选、分页和卡片导航。
- `src/components/card-preview.tsx`：iframe 预览及音频交互。
- `src/components/ui/`：官方 shadcn CLI 引入的组件源码；配置在 `components.json`。
- `src/lib/parser.worker.ts`：卡包解析与入口校验。
- `src/lib/card-renderer.ts`：Anki 模板、填空及本地媒体渲染。

使用 Webpack 构建 Worker；应用和 Worker 之间只共享类型。没有 API 路由或服务端文件上传。

应用界面的导航、列表、状态提示、空状态、分页、滚动区及表单统一使用 shadcn/ui；布局与主题由应用层维护，卡包模板保持独立。项目约定见 `AGENTS.md`，组件映射见 `DESIGN.md`。

shadcn 源码有两处本地修正，升级时需保留或核对上游修复：`SidebarMenuSkeleton` 使用固定宽度，避免渲染时调用 `Math.random()`（[上游问题](https://github.com/shadcn-ui/ui/issues/8666)）；`useIsMobile` 使用 React `useSyncExternalStore` 订阅媒体查询，避免 effect 内同步设置状态。未关闭对应 lint 规则。

## 部署到 Netlify

连接 GitHub 仓库，发布分支选择 `main`。构建命令为 `npm run build`，发布目录为 `out`；根目录的 `netlify.toml` 已配置 Node.js 22 与静态导出。推送到 main 后由 Netlify 自动发布。

## 格式与边界

- 支持 `.apkg`、`.colpkg` 和独立 `.anki2` 数据库，单文件最大 256 MB。
- 数据库选择顺序为 `collection.anki21b`、`collection.anki21`、`collection.anki2`，避免读取新版包中的旧版占位数据库。
- 支持旧版 JSON 笔记类型，以及新版规范化 SQLite 表、Protobuf 配置、Zstandard 数据库与媒体。
- 显示普通卡、反向卡和填空卡；保留模板 CSS、字段、条件区域、包内图片/音频/字体。包含音频的标题按钮保留卡包样式并由网页接管播放；[sound:…] 使用 Anki 兼容的 replay-button / soundLink 与 SVG 圆形重播按钮，接受原卡包 CSS。原生 audio 保留原始 controls 设置。
- 不执行卡包里的脚本，不加载卡片外部资源。依赖脚本的图片遮挡、自定义扩展、TTS、MathJax/LaTeX 可能无法复现；“字段”页保留内容查看入口。
- `.anki2` 自身不包含媒体；如需图片或音频，请导出包含媒体的 `.apkg`。
- 网页只读，不修改卡包，不实现 Anki 排程、同步或学习记录。

## 示例

`public/sample.apkg` 是原创植物学内容，共 12 张卡片，其中两张是填空卡。生成源为 `tools/make-sample.py`，运行 `python3 tools/make-sample.py` 可重新生成。它用于维护用户可见示例，不是测试脚本。

## 方案来源

实现前比较了这些方案和已知问题：

- Anki 官方格式和存储实现（持续维护，AGPL-3.0）：https://github.com/ankitects/anki 。仅参照格式定义，没有复制其实现代码。
- a-flash-deck（GPL-3.0，2026-10-21 有代码更新）的兼容问题：https://github.com/rh-id/a-flash-deck/issues/43 。重点是新版包优先级、占位数据库和笔记类型支持。
- note-studio（README 声明 MIT，2026-06 有更新）：https://github.com/cortx-fyi/note-studio 。验证浏览器内 SQLite + Zstandard + Protobuf 的技术路线，未复制源代码。
- flashcards-viewer（2025-05 更新，仓库 API 未识别许可证）和 fuzzy-anki（旧项目）仅作为对比，没有作为本项目基础或复制代码。

音频重播按钮遵循 Anki 公开的样式接口：https://docs.ankiweb.net/templates/styling.html#audio-replay-buttons 。默认样式先应用，卡包自带样式可以覆盖，不把所有音频统一成浏览器播放器。

框架迁移采用 [Next.js 静态导出](https://nextjs.org/docs/app/guides/static-exports) 和 [shadcn/ui 官方组件](https://github.com/shadcn-ui/ui)（均为 MIT）。实施前检索了 [Next.js Worker 构建问题](https://github.com/vercel/next.js/issues/100131) 和 [shadcn 的 hydration 问题](https://github.com/shadcn-ui/ui/issues/6205)。

浏览器解析库仍为 sql.js、fflate、fzstd、DOMPurify、protobufjs 和 Mustache。依赖版本由 `package-lock.json` 锁定；许可证由 `tools/prepare-assets.mjs` 汇总到 `public/vendor/LICENSES.txt`，shadcn 源码许可证保留在 `licenses/shadcn-ui.txt`。
