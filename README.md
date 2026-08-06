# SceneForge

SceneForge 是一个面向演出空间、装置现场与沉浸式内容的**网页场景查看器和舞台预演工具**。

当前仓库已经从概念文档转为可运行的第一版应用骨架：

- 场地目录与切换；
- Three.js / React Three Fiber 场景查看；
- 镜头预设；
- cue / state 切换；
- 本地视频映射到演出屏幕；
- 可开关的地面反射预览；
- WebXR 能力检测与 Vision Pro / Quest 的 immersive VR 入口；
- 场景 manifest 校验、测试、CI 与 GitHub Pages 部署流程。

> 当前 BO Live House 和 UFO Terminal 都是 `illustrative` 演示几何，不是施工测量模型。

## 技术路线

- **底层渲染：** Three.js
- **应用层：** React + React Three Fiber
- **XR：** WebXR（稳定路径为 WebGL2）
- **WebGPU：** 作为渐进增强单独验证，不牺牲 WebGL2 / WebXR 回退
- **Apple Vision Pro：** Safari WebXR immersive VR + 可选 USDZ / HTML `<model>` / Quick Look 资产层
- **实时媒体：** 浏览器端使用 WebRTC/HLS/本地文件；NDI 通过本地 bridge 转换，不宣称网页直接读取 NDI

浏览器使用 WebXR，而不是直接使用 OpenXR。OpenXR 只应出现在后续原生运行时适配层。

## 本地运行

```bash
npm install
npm run dev
```

完整验证：

```bash
npm run verify
```

## 项目结构

```text
src/
  components/      R3F 场景、控制面板、视频屏幕与能力显示
  data/            场地 manifest
  domain/          场景协议与 cue engine
  lib/             运行时能力检测与媒体 bridge 契约
docs/
  platform-architecture-2026.md
  media-bridge.md
.github/
  workflows/       CI 与 GitHub Pages
  ISSUE_TEMPLATE/  可直接委派给 coding agent 的任务格式
```

## 当前边界

第一阶段不是做一个通用 3D 编辑器，而是跑通：

1. 选择一个场地；
2. 浏览与切换镜头；
3. 映射一段演出视频；
4. 切换 cue / state；
5. 分享网页预览；
6. 在 Vision Pro 或 Quest 中进入 WebXR 查看。

暂不承诺：网页直接读取 NDI、visionOS 浏览器 passthrough AR、完整 timecode 中控、show-critical 实时渲染替代 Resolume/Notch/TouchDesigner。

## 文档

- [2026 平台架构与竞品定位](docs/platform-architecture-2026.md)
- [NDI / live media bridge](docs/media-bridge.md)
- [AI 模块研究摘要](docs/ai-modules-research.md)
- [AI 模块路线图](docs/ai-modules-roadmap.md)

## 自动化开发与审批

仓库已加入：

- `AGENTS.md`；
- `.github/copilot-instructions.md`；
- 结构化 issue 表单；
- PR 模板；
- `quality-gate`（format/lint、typecheck、test、build）；
- Dependabot 分组更新；
- GitHub Pages 部署 workflow。

建议在仓库设置中要求 `quality-gate / verify`、至少一名人工审批，并把 Copilot/Codex 自动 review 作为附加审查而不是唯一审批者。

## License

MIT
