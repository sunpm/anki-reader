---
name: 拾卡 · Anki Reader
description: 深森林导航、浅绿索引与白色卡面的本地卡包浏览器。
colors:
  forest: "#173f35"
  forest-hover: "#2b5945"
  lime: "#dce9ad"
  lime-hover: "#ecf5c7"
  ink: "#203c33"
  muted: "#627269"
  ground: "#f2f5ee"
  white: "#fff"
  topbar: "#fbfcf8"
  list-surface: "#fcfdf9"
  line: "#dfe6dc"
  row-line: "#edf0e8"
  selected: "#eaf1df"
  row-hover: "#f1f5e9"
  deck-text: "#d7e4d8"
  deck-hover: "#245045"
  deck-active: "#356050"
  focus: "#8aac59"
  search-line: "#dce4d7"
  search-focus: "#73916a"
  tabs-surface: "#f1f4ec"
  tabs-text: "#66735c"
  tag-surface: "#f0f4e7"
  tag-text: "#61744c"
  status-surface: "#e4eed3"
  status-text: "#25462d"
  error-surface: "#f8e9df"
  error-text: "#943d20"
typography:
  display:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "36px"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-0.025em"
  headline:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "25px"
    fontWeight: 600
    letterSpacing: "-0.02em"
  title:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "17px"
    fontWeight: 550
  card-title:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "13px"
    fontWeight: 550
    lineHeight: 1.6
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "12px"
    fontWeight: 400
  button:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
  card-content:
    fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Segoe UI", sans-serif'
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1.75
  fields-content:
    fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Segoe UI", sans-serif'
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.75
rounded:
  keycap: "3px"
  tag: "4px"
  tab: "5px"
  toolbar-hover: "6px"
  control: "7px"
  button: "8px"
  panel: "14px"
  drop-overlay: "18px"
spacing:
  inset: "3px"
  tight: "4px"
  compact: "6px"
  small: "8px"
  control: "12px"
  medium: "16px"
  content: "20px"
  section: "24px"
  large: "32px"
  workspace: "36px"
  wide: "40px"
components:
  button-primary:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.white}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "12px 22px"
  button-primary-hover:
    backgroundColor: "{colors.forest-hover}"
  button-import-accent:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.forest}"
    rounded: "{rounded.button}"
    padding: "12px 10px"
  button-import-accent-hover:
    backgroundColor: "{colors.lime-hover}"
  button-import-toolbar:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    padding: "8px 12px"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
  button-navigation:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    width: "38px"
    height: "38px"
  input-search:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px 11px"
  navigation-deck:
    backgroundColor: "transparent"
    textColor: "{colors.deck-text}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "11px 12px"
  navigation-deck-active:
    backgroundColor: "{colors.deck-active}"
    textColor: "{colors.white}"
  tag:
    backgroundColor: "{colors.tag-surface}"
    textColor: "{colors.tag-text}"
    typography: "{typography.label}"
    rounded: "{rounded.tag}"
    padding: "4px 8px"
  card-row:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    padding: "17px 22px"
  card-row-selected:
    backgroundColor: "{colors.selected}"
  face-tabs:
    backgroundColor: "{colors.tabs-surface}"
    rounded: "{rounded.control}"
    padding: "3px"
  face-tab:
    backgroundColor: "transparent"
    textColor: "{colors.tabs-text}"
    typography: "{typography.label}"
    rounded: "{rounded.tab}"
    padding: "7px 14px"
  face-tab-selected:
    backgroundColor: "{colors.white}"
    textColor: "{colors.forest}"
  browser-panel:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.panel}"
---

# Design System: 拾卡 · Anki Reader

## Overview

**Creative North Star: "植物图鉴"**

深森林色导航像装订封面，浅绿列表承载索引，白色预览承载卡片内容。界面使用中文系统字体、细分隔线与小圆角，靠明暗区域和留白区分层级。

工具区保持紧凑，阅读区留出充足空间。简体中文文案直接命名动作与内容；必要的表单标签、控件名称和状态提示保留。本文从现有 HTML、CSS 和 JavaScript 抽取；导入卡包自己的模板样式属于卡片内容，不是应用界面 token。

**Key Characteristics:**
- 深森林导航、浅绿选中底色、白色阅读面。
- 紧凑列表与宽松预览并置，窄屏上下排列。
- 系统中文字体、线性图标、细边框和少量阴影。
- 用控件名称和状态表达行为，避免重复解释布局。

## Colors

配色集中在低饱和绿与接近白色的纸面；前置 token 是颜色值的唯一规范。sidecar 的八阶 OKLCH 色带仅供文档面板预览，由实际颜色生成，不作为新增的应用配色。

### Primary
- **森林绿**（`forest`）：侧栏、主操作和当前卡面文字；`forest-hover` 是主按钮悬停色。
- **浅黄绿**（`lime`）：侧栏导入按钮及品牌图标；悬停使用 `lime-hover`。
- **浅绿索引**（`selected`）：当前卡片整行底色。牌组使用 `deck-active`；未选中牌组悬停使用 `deck-hover`。

### Neutral
- **深绿墨色**（`ink`）与**灰绿文字**（`muted`）：主要内容和次级信息。
- **浅绿底纸**（`ground`）：工作区背景；`white` 承载预览，`list-surface` 承载列表，`topbar` 承载顶部栏。
- **细绿灰边线**（`line`、`row-line`、`search-line`）：面板边界、行间分隔和输入轮廓。
- **柔和标签底色**（`tag-surface`）和**标签文字**（`tag-text`）：卡片标签；标签没有交互选中态。

状态提示使用 `status-surface` / `status-text`，错误提示使用 `error-surface` / `error-text`。键盘焦点使用 `focus`；搜索容器聚焦使用 `search-focus`。

**The Selection Rule.** 当前卡片用整行浅绿底色表示；当前牌组用加亮绿色底色表示；当前卡面用白色标签和加重文字表示。

## Typography

界面使用系统无衬线字体栈，中文回退为 PingFang SC 和 Microsoft YaHei；不加载外部字体。卡片 iframe 使用独立系统字体栈，允许卡包模板覆盖。

- **Display**：欢迎标题；移动端由 `display` 缩为 29px。
- **Headline**：牌组标题；移动端缩为 22px。
- **Title**：导入区标题。
- **Card title**：列表主标题。摘要沿用 `body`；两者均单行省略。
- **Label**：导航、筛选、计数、标签和工具栏。未指定行高的控件沿用浏览器正常行高。
- **Button**：主要操作；侧栏导入按钮采用相同字号，字重为 650。
- **Card content**：未被卡包 CSS 覆盖时的卡片正文，居中显示；字段视图使用 `fields-content` 并左对齐。字段标题为 11px、500 字重。

品牌名使用 25px、650 字重与 0.02em 字距；英文副标为 12px、400 字重与 0.06em 字距。计数采用等宽数字。字号由具体信息角色决定，不采用统一倍率扩展。

## Layout

桌面外壳为 `220px minmax(0, 1fr)` 两列。侧栏固定在视口顶部，高度为 `100dvh`；主区域可伸展。顶部栏最小高度为 78px，左右内边距为 40px。

欢迎区最大宽度为 760px，使用自动外边距与 `50px 50px 30px` 内边距。导入目标为居中虚线容器，内边距为 35px。

工作区内边距为 `32px 36px 0`。浏览面板默认两列为 `minmax(250px, 34%) minmax(0, 1fr)`，高度为 `calc(100dvh - 258px)`，最小 420px、最大 950px。列表与预览各自滚动；搜索和筛选位于列表上方，翻页位于下方。每页显示 60 张卡片。预览内边距为 `25px 34px`。

| 条件 | 现有布局变化 |
| --- | --- |
| ≥1600px | 工作区左右内边距 60px；列表固定 360px；欢迎区最大宽度 850px。 |
| ≤1050px | 侧栏 184px；工作区 `26px 22px 0`；列表 `minmax(220px, 40%)`；预览内边距 20px；顶部栏左右 24px。 |
| ≤760px | 侧栏成为顶部区域，牌组导航横向滚动；隐藏英文副标、侧栏导入和底部本地处理提示。顶部栏最小高度 55px，导入仍可见。工作区 `24px 16px 0`；面板改为单列，高度自动；列表内容最小 100px、最大 240px；预览最小高度 420px，滚动区最大高度 600px。 |

移动端卡片行内边距为 `14px 18px`，预览内边距为 `20px 24px`。牌组标题可换行，文件名及列表条目使用省略，媒体宽度不超过卡面容器。

## Elevation & Depth

主体以底色、1px 边界和空间分区建立层次。侧栏、面板、列表与按钮没有投影；仅当前卡面标签使用 `0 2px 4px #173f3510` 的轻阴影。文件拖入时出现固定全屏覆盖层，距视口边缘 15px，以半透明浅绿底色与虚线边界提示放置，层级为 `z-index: 5`。

按钮颜色过渡为 0.15s；导入目标背景和边框过渡同为 0.15s。读取提示用 1s 线性无限旋转指示器。`prefers-reduced-motion: reduce` 下关闭动画与过渡。

## Shapes

面板与导入目标使用 `panel` 圆角；主要按钮采用 `button` 圆角；搜索、牌组按钮、卡面标签组及前后导航采用 `control` 圆角。标签和键帽使用更小的圆角。卡片列表行保持平直边缘，以整行背景和顶部分隔线组织。

图标为无填充、圆头圆角的线性 SVG，常规描边为 1.6px。控件内通常为 14–20px；欢迎区上传图标为 32px、1.3px 描边。圆形仅用于本地状态点与读取指示器。

## Components

### Buttons

主要按钮用森林绿背景和白字。侧栏导入按钮使用浅黄绿背景；顶部导入与关闭卡包为透明按钮。前后卡片导航是 38px 方形细边框按钮；列表分页按钮为 25×26px。翻面按钮最小宽度为 160px，内边距 `11px 20px`，带空格键提示。

按钮悬停改变背景或文字；关闭卡包悬停时出现下划线。常规键盘焦点为 3px 轮廓，偏移 3px。禁用按钮透明度为 0.35，鼠标为默认指针；禁用图标额外使用 0.65 透明度。读取期间禁用导入、示例及关闭卡包。

### Inputs / Fields

搜索框是带图标、文本输入和 `/` 键帽的单一容器，内边距 `10px 11px`。聚焦时容器边框与 1px 外轮廓一起变色；内部输入不重复画焦点环。输入即时筛选。标签筛选采用无填充、无边框的原生 select，宽度不超过筛选行的 62%。

### Navigation

牌组条目包含图标、名称和右侧数量；长名称单行省略，悬停可见完整标题。选中状态同时更新背景、文字及 `aria-pressed`。窄屏条目横向排列，图标隐藏，保持可横向滚动。

### Cards / Containers

列表行包含标题、摘要和一行牌组/模板信息。悬停使用 `row-hover`，当前项使用 `selected`；选择后展示正面。搜索与筛选尽量保留仍在结果中的当前项，否则选择第一项。空结果显示一句提示，卡片操作禁用。

预览在独立 iframe 内显示卡片模板；字段入口提供左对齐的原始内容。卡面内容长度决定 iframe 高度，图片区和音视频不超出容器。应用颜色和字体不覆盖卡包已定义的卡面风格。

`[sound:…]` 使用 Anki 的 `replay-button` / `soundLink` 与标准圆形三角 SVG 重播按钮，默认样式置于卡包 CSS 之前，卡包样式优先。自定义标题按钮保留原有样式，点击由宿主从头播放对应音频，不执行卡包脚本。原生 audio 保持卡包的 controls 设置，不自动添加控件；同一卡面开始播放一段音频时，暂停其他音频。

### Face Tabs

正面、背面、字段位于浅色标签组。当前项以白底、森林绿文字、550 字重和轻阴影显示；`aria-selected` 跟随状态。切换卡片回到正面，切换卡面回到预览滚动区顶部。空格翻面，左右方向键切换卡片，`/` 聚焦搜索；焦点在表单或按钮内时不拦截这些按键。

### Chips

卡片标签采用柔和底色和紧凑内边距，在预览底部居中换行。示例卡包标记使用细边框、4px 圆角和 `3px 7px` 内边距；两者都是状态文本。

### Import and Status

初始导入区使用 1.5px 虚线边界，提供明确的选择按钮。文件拖入页面时使用覆盖层提示放置。读取状态在顶部显示旋转指示器，读取完成后消失；错误提示使用浅暖色背景并提供关闭按钮。模板语法提示显示在预览内，保留“字段”入口。

## Do's and Don'ts

### Do:
- **Do** 沿用前置 token 和现有控件状态，保持列表、导航与卡面选中态一致。
- **Do** 保留必要的表单标签、控件名称、焦点和禁用反馈。
- **Do** 在窄屏将列表与预览上下排列，保留顶部导入和横向牌组导航。
- **Do** 将卡包自带模板样式留在预览边界内。

### Don't:
- **Don't** 为当前卡片加回侧边粗色条；现有选择标识是整行浅绿背景。
- **Don't** 添加重复解释布局的副标签或说明段落。
- **Don't** 将植物学示例内容当作所有卡包的固定内容风格。
- **Don't** 为列表行、主面板或常规按钮增加现有实现没有的阴影。
