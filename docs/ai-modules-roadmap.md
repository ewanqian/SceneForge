# SceneForge AI 模块路线图

> 场景铸造 · 2026-03-23

---

## 状态与定位

### 当前状态

SceneForge 仍处于产品定义收束阶段。

公开仓库目前聚焦四件事：
1. 场景存档
2. 演出系统归档
3. 展览空间存档
4. 计划与路线图管理

### AI 在 SceneForge 的角色

**AI 在 SceneForge 最适合的角色，不是主控脑，而是分析层、识别层和辅助决策层。**

路线：
```
硬实时层 → AI 语义层 → cue/state 决策层
```

> AI 实时演出的完整技术研究与实验方案，详见 [VIRTURA Research Laboratory](https://github.com/ewanqian/VIRTURA-SpacePort/blob/main/stations/research-laboratory/ai-live-performance/README.md)。

---

## 模块 1：Input Adapters

- 本地音频文件
- 系统音频 loopback
- 麦克风 / line in
- playlist / track metadata
- 摄像头视频流

---

## 模块 2：Fast Analysis

优先不用"大模型"，先做：
- onset
- BPM
- beat/downbeat
- RMS
- low/mid/high band
- section boundary

这层负责演出最关键的硬实时。

---

## 模块 3：AI Semantics

再加：
- MusiCNN / VGGish / Effnet embedding
- auto-tagging
- face landmarks + blendshapes
- pose landmarks
- hand gesture categories

---

## 模块 4：Cue / State Engine

给每个状态一个规则：
- `if beat_confidence > x and energy > y then pulse`
- `if section_change then transition`
- `if face_mouth_open > z then trigger voice layer`
- `if gesture=raise_hand then advance cue`

---

## 模块 5：Viewer / Web Preview

最后才是 SceneForge 原本最擅长的：
- 版本切换
- 镜头浏览 / 自动巡游
- 全屏 / 返回 / 退出
- 网页分享
- 远程确认

---

## 下一步最值得先做的三个实验

### 实验一：音频到 state

先别上大模型，只做：
- beat
- section
- energy
- low/mid/high
然后映射到 SceneForge 的 3~5 个状态。

### 实验二：摄像头到 cue

用 MediaPipe 做：
- head yaw/pitch
- mouth open
- arms up
- one-hand gesture
把它接成浏览、触发、切换。

### 实验三：离线曲库分析

拿常演的 20 首曲子，提前跑：
- BPM
- section
- tags
- embedding
生成一份 `track-profile.json`，演出时只做实时校正。

---

## 导航

- [返回 SceneForge 主入口](../README.md)
- [AI 模块研究 → Research Laboratory](https://github.com/ewanqian/VIRTURA-SpacePort/blob/main/stations/research-laboratory/ai-live-performance/research/ai-modules-research.md)
