# 拾卡 · Anki 卡包浏览器

静态网页，用于导入 Anki 卡包、按牌组或标签筛选、全文搜索并查看卡片正反面及原始字段。文件在浏览器 Worker 中解析，不上传、不持久保存；刷新网页后需要重新导入。

## 运行

在项目目录运行 `python3 -m http.server 8765 --directory dist`，然后打开 `http://127.0.0.1:8765`。所有运行依赖已包含在 `dist/vendor`，不需要安装或构建。

## 部署到 Netlify

连接 GitHub 仓库，发布分支选择 `main`。无需构建命令，发布目录为 `dist`；根目录的 `netlify.toml` 已设置发布目录。推送到 main 后由 Netlify 自动发布。

## 格式与边界

- 支持 `.apkg`、`.colpkg` 和独立 `.anki2` 数据库，单文件最大 256 MB。
- 数据库选择顺序为 `collection.anki21b`、`collection.anki21`、`collection.anki2`，避免读取新版包中的旧版占位数据库。
- 支持旧版 JSON 笔记类型，以及新版规范化 SQLite 表、Protobuf 配置、Zstandard 数据库与媒体。
- 显示普通卡、反向卡和填空卡；保留模板 CSS、字段、条件区域、包内图片/音频/字体。包含音频的标题按钮保留卡包样式并由网页接管播放；[sound:…] 使用 Anki 兼容的 replay-button / soundLink 与 SVG 圆形重播按钮，接受原卡包 CSS。原生 audio 保留原始 controls 设置。
- 不执行卡包里的脚本，不加载卡片外部资源。依赖脚本的图片遮挡、自定义扩展、TTS、MathJax/LaTeX 可能无法复现；“字段”页保留内容查看入口。
- `.anki2` 自身不包含媒体；如需图片或音频，请导出包含媒体的 `.apkg`。
- 网页只读，不修改卡包，不实现 Anki 排程、同步或学习记录。

## 示例

`dist/sample.apkg` 是原创植物学内容，共 12 张卡片，其中两张是填空卡。生成源为 `tools/make-sample.py`，用于维护用户可见示例，不是测试脚本。

## 方案来源

实现前比较了这些方案和已知问题：

- Anki 官方格式和存储实现（持续维护，AGPL-3.0）：https://github.com/ankitects/anki 。仅参照格式定义，没有复制其实现代码。
- a-flash-deck（GPL-3.0，2026-10-21 有代码更新）的兼容问题：https://github.com/rh-id/a-flash-deck/issues/43 。重点是新版包优先级、占位数据库和笔记类型支持。
- note-studio（README 声明 MIT，2026-06 有更新）：https://github.com/cortx-fyi/note-studio 。验证浏览器内 SQLite + Zstandard + Protobuf 的技术路线，未复制源代码。
- flashcards-viewer（2025-05 更新，仓库 API 未识别许可证）和 fuzzy-anki（旧项目）仅作为对比，没有作为本项目基础或复制代码。

音频重播按钮遵循 Anki 公开的样式接口：https://docs.ankiweb.net/templates/styling.html#audio-replay-buttons 。默认样式先应用，卡包自带样式可以覆盖，不把所有音频统一成浏览器播放器。

浏览器依赖：sql.js 1.15.2 (MIT)、fflate 0.8.3 (MIT)、fzstd 0.1.1 (MIT)、DOMPurify 3.4.17 (MPL-2.0 OR Apache-2.0)、protobufjs 8.8.1 (BSD-3-Clause)、Mustache 4.2.0 (MIT)。完整许可证在 `dist/vendor/LICENSES.txt`。
