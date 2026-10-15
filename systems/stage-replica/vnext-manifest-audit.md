# Stage Replica vNext｜P0.5 统一 Scene Manifest 审计

**对应:** Issue #42 §4（P0.5 — Generalize Scene Manifest）
**状态:** 讨论稿（issue 明确写「建议讨论而非直接实现」，本文不实现）
**方法:** 逐字读取四个 Demo 的 `scene.json`，用**文件里真实存在的字段**回答一个问题：

> **`surfaces[] + shape` 够不够表达四个已验证的 Demo？**

---

## 1｜先把事实摆出来

### 1.1 顶层键的分布

| 顶层键 | Sphere | Festival | Installation | Stadium | 共同？ |
|---|---|---|---|---|---|
| `sceneId` / `units` / `note` | ✅ | ✅ | ✅ | ✅ | **4/4** |
| `structure` | ✅ | ✅ | ✅ | ✅ | **4/4** |
| `screens` | ✅ | ✅ | ✅ | ✅ | **4/4** |
| `cameras` | ✅ | ✅ | ✅ | ✅ | **4/4** |
| `cue` | ✅ | ✅ | ✅ | ✅ | **4/4** |
| `programCamera` | ✅ | ✅ | ✅ | ✅ | **4/4** |
| `v2Changes` | — | ✅ | ✅ | ✅ | 3/4（**文档，不是场景数据**） |
| `adaptationModes` | ✅ | — | — | — | 1/4 |
| `panoramaModes` | — | — | — | ✅ | 1/4 |
| `lightThroughScreen` | — | — | — | ✅ | 1/4 |
| `derivedGeometry` | — | ✅ | — | — | 1/4（**可推导**） |
| `screenRelationship` | — | ✅ | — | — | 1/4 |
| `heightTension` | — | — | — | ✅ | 1/4（**provenance**） |

**已经统一的部分比想象的多：** `sceneId / units / note / structure / screens / cameras / cue / programCamera` 这 8 个键 **4/4 全有**。四个完全不同的演出（穹顶 / 双墙 / 黑盒 / 圆柱）**已经在共用同一套 cue 与 camera 结构**——这是最大的既成资产。

### 1.2 screen 层字段

| 字段 | Sphere | Festival | Installation | Stadium |
|---|---|---|---|---|
| `id` / `shape` / `physicalSize` / `raster` / `source` / `fallback` | ✅ | ✅ | ✅ | ✅ |
| `transform` | **—** | ✅ | ✅ | ✅ |
| `note` | — | — | ✅ | — |

`shape` 实际取值：`dome`（1）、`plane`（2 个 Demo 共 3 处）、`cylinder`（1）——**四个 Demo 用到 3 种 shape**。

`physicalSize` 的键**按 shape 完全不同**，这正是不能只靠 `shape` 字符串解决的地方：

```
dome      → { radiusM, coverage: "hemisphere" }
plane     → { widthM, heightM }
cylinder  → { diameterM, heightM, circumferenceM, unwrappedAspect }
```

### 1.3 camera / cue 层（已经统一）

| | 结果 |
|---|---|
| `cameras[]` | `id / label / position / target / fovDeg / eyeHeightM` **4/4 一致**；`eyeHeightM` 可为 `null`（技术机位）；`note` 可选 |
| `cue` | `durationSec / rampSec / states[]` **4/4 一致**，`states[].{id,label,start,end}` **4/4 一致** |
| `programCamera` | **4/4 一致** |

---

## 2｜结论：`surfaces[] + shape` 是**必要但不充分**

要让它真的够用，还差**四件**，每件都由上表的证据直接推出：

### ① `physicalSize` 必须是按 shape 的判别联合（discriminated union）

不是 `physicalSize: {...}` 一个松对象，而是：

```ts
const physicalSize = z.discriminatedUnion("shape", [
  z.object({ shape: z.literal("plane"),     widthM: z.number(), heightM: z.number() }),
  z.object({ shape: z.literal("cylinder"),  diameterM: z.number(), heightM: z.number() }),
  z.object({ shape: z.literal("dome"),      radiusM: z.number(), coverage: z.enum(["hemisphere","partial"]) }),
  z.object({ shape: z.literal("curvedPlane"), widthM: z.number(), heightM: z.number(), curvatureRadiusM: z.number() }),
]);
```

理由：`circumferenceM` 与 `unwrappedAspect` 在 Stadium 里**是从 diameter 推出来的**（62.8 = π×20，7.85 = 62.8÷8），它们不该出现在手写 manifest 里——手写就会和几何脱钩。

### ② "素材如何落到面"必须是 surface 的一部分，而不是 Demo 私有块

现在这件事**在四个 Demo 里被叫了两个名字**：

| Demo | 字段 | 实际含义 |
|---|---|---|
| Sphere | `adaptationModes[]` | 16:9 素材如何映射到 dome（前区窗口 / 镜像延展 / 程序化补全 / 1:1 母版） |
| Stadium | `panoramaModes[]` | 16:9 素材如何映射到 cylinder（前区窗口 / ×4 重复 / 拉伸 / 8:1 全景） |

**这是同一个概念**（`fit` / mapping mode），却被写成两个不同名字、两套不同取值。统一为 `fit: { mode, ... }` 是 P0.5 最直接的一处收益。Festival 与 Installation 没有这个块，是因为它们的屏是 1:1 对应（但**都因此出过比例 bug**，见 §3）。

### ③ 需要真正的 `objects[]`，而不是 `structure` 这个杂物袋

现在 `structure` 在四份文件里装的是**完全不同的东西**：

| Demo | `structure` 内容 |
|---|---|
| Sphere | `domeRadiusM`, `audienceFloorDiameterM`, `stagePlatform{...}`, `gridRingM`, `gridRadials`, `scaleBarM` |
| Festival | `stage{...}`, `djPlatform{shape:"triangle", positionM}`, `gridSpacingM`, `scaleBarM` |
| Installation | `room{...}`, `projectionMain`, `projectionFloor`, `viewerNearM/FarM`, `scaleBarM`, `referencePost*` |
| Stadium | `arenaBowlDiameterM`, `mainStageDiameterM`, `performerZoneDiameterM`, `ledCylinder*`, `haloRingDiameterM`, `scaleBarM` |

关键观察：**`scaleBarM` 是 4/4 唯一的公共字段**——说明"已知尺寸参照"是**每个场景都需要的**，应该是一等公民，而不是各 Demo 自己画。

`performer` 更是各写各的：Festival 放进 `structure.djPlatform.positionM`，Stadium 只有 `performerHeightM` 而位置**硬编码在 main.js 里**，Sphere 的 performer 也在代码里。Issue #42 提议的 `performers[]` 是对的，而且**这是 P0 的硬需求**——参与者要能移动人，就必须让人进 manifest。

建议：

```ts
objects: z.array(z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("platform"), shape: z.enum(["box","triangle","disc"]), sizeM: z.tuple([z.number(),z.number(),z.number()]), transform: transformSchema }),
  z.object({ kind: z.literal("room"),     widthM: z.number(), depthM: z.number(), heightM: z.number() }),
  z.object({ kind: z.literal("ring"),     diameterM: z.number(), heightM: z.number() }),
  z.object({ kind: z.literal("bowl"),     diameterM: z.number(), rake: z.number() }),   // 为后续人群层预留
]))
performers: z.array(z.object({ positionM: z.tuple([z.number(),z.number(),z.number()]), heightM: z.number() }))
scaleReference: z.object({ lengthM: z.number(), positionM: z.tuple([z.number(),z.number(),z.number()]) })
```

### ④ provenance 必须与场景数据分离

`v2Changes`（3/4）、`heightTension`（1/4）、`derivedGeometry`（1/4）、`screenRelationship`（1/4）性质完全不同，混在 manifest 里正是现在 schema 难以稳定的原因：

| 类别 | 例子 | 归属 |
|---|---|---|
| **场景数据** | `lightThroughScreen.screenOpacity`、`fit` 模式 | → 进 surface / 进 manifest |
| **可推导** | `derivedGeometry.centreGapM`（= 2×(10.2−9·cos18°)）、`circumferenceM` | → **删掉**，运行时算 |
| **provenance / 注释** | `v2Changes`、`heightTension`、各 `note` | → 移到独立的 `annotations` 或**根本不进运行时 manifest**（它们是交付文档的内容） |

---

## 3｜比"能表达"更值钱的：schema 应该是**校验器**，不只是容器

四轮独立评审里，**有两个真 bug 是"声明的 raster 与实际渲染不一致"**，而两者都可以被一条 schema 规则在构建期拦下：

| Demo | V1 的缺陷 | 本可由什么规则拦住 |
|---|---|---|
| Festival | 声明 `raster.master = 2048×1024`（2:1），实际运行时画布是 1280×720（16:9）→ 画面被横向拉伸 12.5% | `aspect(runtime) ≈ aspect(physicalSize)` |
| Installation | 声明 `4096×2160` 但从未被读取，运行时 1280×720 贴到 10.24×5.4 m → 拉伸 6.7% | 同上 |
| Stadium | `master 4096×512`（8:1）与 `unwrappedAspect 7.85` 一致 ✅ ——但正因为一致，**8m 高度不能单独改**（改了契约就断） | `aspect(master) ≈ unwrappedAspect(shape)` + 把高度与 raster 绑成一条约束 |
| Sphere | `4096×4096` 对 dome 无 aspect 概念 | 需要 dome 自己的规则（立体角 vs 像素） |

**结论：** 如果统一 schema 只做"能读四种文件"，收益有限；如果它同时带**三条校验规则**（面尺寸↔runtime 比例、master↔展开比、`fallback.implemented` 必须为真），它能自动拦掉我们已经花两轮评审才找到的缺陷。这是把 P0.5 从"重构"变成"投资"的关键。

另外两项现实的不一致：
- `raster` 的键有三种叫法：`master/fast/program`（Sphere、Stadium）、`master`（Festival）、`master/runtime`（Installation）。**`fast` 与 `runtime` 是同一件事**，必须选一个。
- `fallback.implemented` 只在 Festival / Installation 出现（2/4），而 Stadium / Sphere 的 `fallback` 声明**没有实现标记**——正是 review 抓出"声明 local-loop 实为冻结变暗"的那类问题。

---

## 4｜建议的最小统一样式（讨论用，不是最终稿）

```ts
scene
  schemaVersion: 1
  sceneId, units, note
  objects[]          // platform / room / ring / bowl
  performers[]
  scaleReference
  surfaces[]         // id, shape, physicalSize(判别联合), transform?, raster{master,runtime}, source, fallback{implemented}, fit?
  cameras[]          // id, label, position, target, fovDeg, eyeHeightM?
  cue                // durationSec, rampSec, states[]
  programCamera
  annotations?       // v2Changes / heightTension / note —— 不进运行时逻辑
  behaviourHook?     // bespoke shader / 状态逻辑的入口，保住四个 Demo 的个性
```

两点必须坚持（都来自 Issue #42 §4 的验收）：

1. **四个 Demo 都要能由它初始化**——否则统一没有意义。可以用四个现有 `scene.json` 作为回归样本：迁移后仍能产出**逐像素一致的静帧**（我们有 `?t=` 确定性入口，这条可以真的测）。
2. **不能强迫四个 Demo 退化成同一种视觉**——所以 `behaviourHook` 是 required，不是可选。dome 的立体角、双墙的 `join`、黑盒的累积池、圆柱的旋转弧**都不该被 schema 收平**。

---

## 5｜给 P0 的直接输入（不是 P0.5 的结论，但由同一次审计得出）

参与者要"不改核心源码就建自己的场景"，按现在的代码，**必须**先有：

| P0 验收项 | 今天卡在哪 |
|---|---|
| 增删 / 移动 ≥2 个 media surface | `screens[]` 已经是数组 ✅，但每个 Demo 的 main.js **硬编码**了材质与几何，加一个面没有通用路径 |
| 替换自己的素材 | `source.type` 只有 `"procedural"`；没有 `video` / `image` / `canvas` 类型，也没有 fallback 的实际接入点 |
| 保存 3–4 个状态 | `cue.states[]` 已统一 ✅，但状态**行为**（join / wrap / density）写在各 Demo 的 `STATE_PARAMS` 里，参与者改不了 |
| 建 ≥3 个机位 | `cameras[]` 已统一 ✅ ——**这是四项里唯一今天就能用的** |
| V1 播放 + review notes | 无存储、无导出（notes 只存在于 `status.json`，是我手写的） |
| V2 且 V1 不被覆盖 | 现在是靠**文件名约定**（`v1-*.png` / `v2-*.png`）和 git 纪律，没有机制 |
| 分享 URL / scene package | 无导出功能；`?t=` 等参数是审阅入口，不是场景序列化 |

一句话：**camera 与 cue 早已通用，surface 与 state behaviour 还没有。** P0 的工作量主要在这两块，而不是从零开始。

---

## 6｜我不建议现在做的事

- **不建议**为了统一而把四个 Demo 重写成同一个渲染器。四个 bespoke 行为正是四轮评审找到问题的载体；收平会让 V1→V2 的对照失去意义。
- **不建议**在 P0 之前先做 P1 Multi-angle Replay。它需要 master timeline 与 camera 序列化，而这两个都依赖 P0/P0.5 的 camera 模型。
- **不建议**现在补 Installation 的音频。Issue #42 §7 已把它列为暂缓项，而且它与"参与者 3 小时做出第五个"这个总验收无关。
