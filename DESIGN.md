---
name: 拾卡 · Anki Reader
description: 炭黑导航、暖灰工作区与陶土橙操作色的本地卡包浏览器。
colors:
  background: "#f6f4f1"
  foreground: "#302c29"
  card: "#ffffff"
  primary: "#a44b30"
  secondary: "#efebe6"
  muted: "#756c64"
  accent: "#f3e8e0"
  border: "#e3ddd6"
  sidebar: "#292725"
  sidebar-foreground: "#f7f3ef"
  sidebar-primary: "#e2ab88"
  sidebar-accent: "#514039"
---

# 拾卡设计规范

本地卡包阅读工具。界面帮助用户导入、筛选与阅读，保留紧凑索引和宽松预览的布局。文案只说明动作、内容和必要状态，不重复解释布局。

## 配色

应用颜色源为 `src/app/globals.css` 的 CSS 变量，通过 Tailwind 语义色供 shadcn/ui 使用。

- 工作区使用暖灰 `background`，预览使用白色 `card`。
- 侧栏使用炭黑 `sidebar` 与浅暖灰文字；当前牌组使用深棕 `sidebar-accent`。
- 主要操作、焦点与欢迎标题使用陶土橙 `primary`。侧栏导入按钮使用浅陶色 `sidebar-primary`。
- 当前卡片使用整行浅陶底色 `accent`；没有侧边色条。
- 次要文字使用 `muted`，分隔线使用 `border`。
- 错误提示使用浅红底与深红文字；加载状态保留明确的进度文字。

卡包自带的 CSS、字体、颜色只在 iframe 内生效，不随应用配色替换。未指定模板样式的卡片采用暖黑文字、陶土色填空强调与白底。

## 字体与形状

使用系统无衬线字体，中文回退 PingFang SC 和 Microsoft YaHei，不请求外部字体。欢迎标题 36px、牌组标题 25px、卡片标题与表单控件沿用 shadcn 默认 14px，辅助信息 12px。移动端标题分别缩为 29px 和 22px。卡片默认正文 20px，字段内容 16px。

圆角通过 `--radius` 及 shadcn 默认组件样式统一。面板使用 12px 圆角，控件保持对应 size 与 variant 的完整样式；不另加全局按钮或表单焦点样式。图标使用 Lucide。

## 布局

桌面侧栏 220px，主区自适应。卡片面板为列表与预览两列，列表占约 34%，两侧独立滚动。列表每页 60 张卡片，底部保留页码和翻页。

- 1050px 以下：侧栏 184px，缩小工作区内边距。
- 760px 以下：侧栏转为顶部区域，牌组横向滚动；列表与预览上下排列，列表滚动区高 240px，预览滚动区高 420px。
- 1600px 以上：列表固定 360px，增加工作区留白。

长文件名、牌组名、列表标题使用省略；完整牌组名保留在 title。预览媒体不超过卡面宽度。

## 组件与交互

应用界面统一使用官方 shadcn/ui 源码，位于 `src/components/ui/`。通过组件的 size、variant、组合 API 和主题 token 定制；应用 CSS 只负责页面布局、品牌和卡面容器。

| 界面区域 | 组件 |
| --- | --- |
| 牌组侧栏与数量 | Sidebar、SidebarMenu、SidebarMenuButton、SidebarMenuBadge |
| 顶部路径 | Breadcrumb |
| 操作与文件选择入口 | Button、Input |
| 搜索、清空按钮、图标与快捷键提示 | InputGroup、InputGroupInput、InputGroupAddon、InputGroupButton、Kbd |
| 标签筛选 | Select、SelectTrigger、SelectContent、SelectItem |
| 卡片浏览面板与列表 | Card、ItemGroup、Item、Separator |
| 列表与卡面滚动区 | ScrollArea |
| 分页 | Pagination、PaginationContent、PaginationItem、Button |
| 正面、背面、字段 | Tabs |
| 标签及示例标记 | Badge |
| 导入、无结果及无卡片状态 | Empty |
| 读取状态、错误与模板提示 | Alert、Spinner |

Select 保留默认尺寸和完整边框、间距及焦点样式。下拉内容通过 Portal 展示，使用 `position="popper"`、`align="start"`，从触发器边缘展开。搜索附件按 InputGroup 的顺序与 align 属性组合；输入为空时展示 Kbd，点击其所在附件区域会聚焦搜索；有内容时展示 InputGroupButton 清空按钮，清空后保持搜索焦点。搜索输入使用 `type="text"` 和 `role="searchbox"`，避免浏览器额外绘制原生清空按钮。

导入支持文件选择与页面拖放；读取期间禁用导入、示例和关闭。关闭或替换卡包时释放本地媒体 URL。空结果保留简洁提示并禁用卡片操作。

筛选保持仍在结果中的当前卡片，否则选择第一张并回到正面。切换卡片回到正面；切换卡面回到预览顶部。正面、背面、字段采用可键盘操作的 Tabs；必要的控件名称和焦点提示保留。

快捷键：`/` 聚焦搜索，在标签选择器闭合时和卡面 iframe 内同样可用；输入文本时保留 `/` 的正常输入，打开的下拉菜单保留自身键盘导航。外层页面支持左右方向键切换卡片、空格翻面；表单控件、按钮和标签页上的方向键、空格保留控件行为。

预览 iframe 禁用脚本与外部资源。包内图片、字体和音频通过本地 Blob URL 加载。音频重播保留 Anki 的 `replay-button` / `soundLink` 样式接口；自定义音频按钮由宿主接管点击，不执行卡包脚本。原生 audio 保持原始 controls 设置，同一卡面一次只播放一段音频。

动态反馈仅用于加载和状态变化；遵循 `prefers-reduced-motion`。
