# SceneForge AI 模块研究与规划

> 数字场景演出中的 AI 角色、技术选型与落地路线

> **完整技术研究报告现已迁移至 [VIRTURA Research Laboratory](https://github.com/ewanqian/VIRTURA-SpacePort/blob/main/stations/research-laboratory/ai-live-performance/research/ai-modules-research.md)。**

---

## 核心结论

### 1. SceneForge 仓库定位

SceneForge 当前仍处于产品定义收束阶段，定位是：

- 网页端场景查看器
- 舞台预演器
- cue/event-based 编排工具
- 轻量网页发布与分享入口

**AI 在 SceneForge 最适合的角色：不是主控脑，而是分析层、识别层和辅助决策层。**

### 2. 最适合的架构：三层混合系统

```
音频/视频输入
    ↓
特征提取（规则层）
    ↓
AI 语义识别（AI 层）
    ↓
置信度过滤
    ↓
cue/state 引擎（决策层）
    ↓
SceneForge viewer / previs
```

---

## 技术选型清单（摘要）

### 低层实时分析器（非 AI）

| 工具 | 用途 |
|---|---|
| **aubio** | onset、pitch、beat、notes、MFCC |
| **librosa** | tempo、beat、onset、频谱 |
| **madmom** | downbeat/bar |

### AI 语义识别层

| 工具 | 用途 |
|---|---|
| **Essentia** | 高层音乐描述、auto-tagging、embedding |
| **Demucs** | stems 分离（vocals/drums/bass/other） |
| **Basic Pitch** | 音频转 MIDI |

### 视觉识别层

| 工具 | 用途 |
|---|---|
| **MediaPipe Face Landmarker** | 3D face landmarks、blendshape scores |
| **MediaPipe Pose Landmarker** | 身体关键点、3D 世界坐标姿态点 |
| **MediaPipe Gesture Recognizer** | 手势分类、手部 landmarks |

详细技术文档：[Research Laboratory 完整报告 →](https://github.com/ewanqian/VIRTURA-SpacePort/blob/main/stations/research-laboratory/ai-live-performance/research/ai-modules-research.md)

---

## ComfyUI 角色定位

**ComfyUI 更适合当"实验台"和"拼装台"，不适合直接当整套实时演出的核心分析中枢。**

建议用法：预演分析 / 离线抽特征 / 接生成流程 / 但不作为 show-critical 的唯一数据源。

---

## 导航

- [返回 SceneForge 主入口](../README.md)
- [AI 模块路线图](./ai-modules-roadmap.md)
- [完整技术报告 → Research Laboratory](https://github.com/ewanqian/VIRTURA-SpacePort/blob/main/stations/research-laboratory/ai-live-performance/research/ai-modules-research.md)
