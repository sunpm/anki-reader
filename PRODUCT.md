# Product
<!-- impeccable:product-schema 1 -->
## Platform
web
## Product Purpose
读取 Anki 卡包，在网页中浏览和搜索其内容。
## Users
持有 Anki 卡包、希望无需导入 Anki 就能查看内容的人。
## Stack
实现选择：buildless HTML/CSS/JavaScript，浏览器 Worker 中解析 ZIP、SQLite、Zstandard、Protobuf。未指定框架，按任务需要采用静态网页。
## Capabilities and Constraints
用户已明确选择列表搜索、点开查看正反面。支持牌组和标签筛选，媒体在本地读取。卡包不上传。不增加自动化测试代码。单文件上限 256 MB；自定义脚本模板不执行，保留原始字段查看入口。
