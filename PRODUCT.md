# Product
<!-- impeccable:product-schema 1 -->
## Platform
web
## Product Purpose
读取 Anki 卡包，在网页中浏览和搜索其内容。
## Users
持有 Anki 卡包、希望无需导入 Anki 就能查看内容的人。
## Stack
Next.js App Router、React、TypeScript、Tailwind CSS 与 shadcn/ui。浏览器 Worker 中解析 ZIP、SQLite、Zstandard、Protobuf；使用 Next.js 静态导出部署到 Netlify。
## Capabilities and Constraints
用户已明确选择列表搜索、点开查看正反面。支持牌组和标签筛选，媒体在本地读取。卡包不上传。不增加自动化测试代码。单文件上限 256 MB；自定义脚本模板不执行，保留原始字段查看入口。
应用界面凡有对应的官方 shadcn/ui 组件，统一使用，包括导航、状态、列表和表单；卡包自带内容与样式不在替换范围内。
