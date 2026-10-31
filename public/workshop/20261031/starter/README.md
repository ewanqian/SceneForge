# 舞台草稿 · 快速上手

## 先体验

打开 https://ewanqian.github.io/SceneForge/workshop/20261031/ 。浏览器即可操作课程地图和屏幕演示，无需安装环境。

## 修改自己的工程

1. 从 https://www.deepseek.com/download/ 下载系统支持的 DeepSeek Harness 桌面安装包，按课堂引导配置 DeepSeek API。无需自行构建 Harness 源码。
2. 下载并解压课堂的 Stage_Replica_Starter.zip，在 Harness 中打开这个文件夹。
3. 发送下面的委托，让 Agent 启动预览并做一处修改：

> 请先读 AGENTS.md、README.md 和 scene.js，不读取 vendor 中的引擎源码。先使用应用自带或电脑现有的 Node 运行 preview.mjs，打开本地预览；也可使用现有 Python 运行 serve.py。不安装 Docker，不新增框架，不运行 npm install。保留原版，只调整主屏宽度和一个侧面机位。完成后说明怎样比较人物、屏幕和画面的比例。若现有运行时不可用，给出具体情况，先用公开网页继续体验。

不需要参加者先手动配置终端工具。preview.mjs 仅用 Node 内置模块，无依赖安装；serve.py 是已有 Python 时的另一个入口。预览使用 http://localhost:8766/ ，窗口/进程保持运行。

## 文件与保存

index.html 是界面，scene.js 是空间、屏幕、人物、机位和时间逻辑，style.css 是样式，vendor/ 是已附带的 Three.js 与许可。修改主要在 scene.js；不必阅读引擎文件。

工程固定提供主屏、顶屏和人物。增加屏幕需要修改源码；参数JSON不包含新增几何或视频文件。保存整个工程目录、原始媒体与两个版本，课后可以继续发展。
