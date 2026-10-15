# P0.5 · 统一 Scene Manifest — 一致性检查

**在线:** https://ewanqian.github.io/SceneForge/stage-replica/conformance/
**对应:** Issue #42 §4（P0.5 — Generalize Scene Manifest）
**设计审计:** [`systems/stage-replica/vnext-manifest-audit.md`](../../../systems/stage-replica/vnext-manifest-audit.md)

这个页面把四个官方 Demo 的 legacy manifest **真的读进来、转成统一 schema、真的跑校验**。它回答的不是"能不能读四种文件"，而是：

> **一张 schema 能不能表达这四个 Demo，而不丢掉让它们各自成立的东西？**

---

## 1｜本次运行的结果

| | |
|---|---|
| **用统一 schema 初始化成功** | **4 / 4** |
| **v1 比例缺陷被规则抓出** | **2 / 4**（正确的两项，且**没有**误伤另外两项） |
| 映射过程中丢弃的键 | **0**（四个 Demo 都是空数组） |
| bespoke 行为被保留 | 每个 Demo 都带 `behaviour.module` + `params` |

| Demo | behaviour 模块 | 媒体面 | 机位 | 状态 | fit 模式 | 比例校验 |
|---|---|---|---|---|---|---|
| Sphere | `sphere-dome` | 1 dome | 4 | 4 | 4 | 无比例约束（dome） |
| Festival | `two-wall` | 2 plane | 4 | 4 | 0 | 物理 2.000:1 · runtime 一致 ✓ |
| Installation | `black-box` | 2 plane | 4 | 4 | 0 | 物理 1.896:1 · runtime 一致 ✓ |
| Stadium | `cylinder-stage` | 1 cylinder | 4 | 4 | 4 | 展开 7.854:1 · master 一致 ✓ |

---

## 2｜校验器不只是容器——它有五条规则

审计的结论是：**统一 schema 的价值在规则里，不在字段里。** 所以 schema 带规则，而不是只做类型检查。

| # | 规则 | 为什么 |
|---|---|---|
| 1 | `aspect(runtime) ≈ aspect(physicalSize)` | **两个真 bug 都能被它拦下**：Festival 声明 2048×1024 却渲染 1280×720；Installation 声明 4096×2160 却从未被读取 |
| 2 | `aspect(master) ≈ unwrappedAspect`（cylinder） | 这条把 raster 与高度绑在一起。Stadium 之所以「8m 高度不能单独改」，就是因为它这条**是过的** |
| 3 | `fallback.implemented` 必须是 `true` / `false` | 「声明了」不等于「实现了」——Installation 评审抓到的正是这一类 |
| 4 | `behaviour.module` 必填 | 否则场景会被悄悄压平成通用的亮度/覆盖/循环 |
| 5 | `cue.states` 必须连续且铺满 `durationSec` | 否则存在渲染器只能猜的空白 |

另外还有：`programCamera` 必须指向真实机位、camera 必须有 `positionM`/`targetM`/`fovDeg`、`transform` 对除 dome 以外必填（dome 按定义居中，强加一个假 transform 是错的）。

### 规则有牙齿的证明：拿 v1 跑一遍

同一次运行会用 `variant: "v1"` 再跑一遍——**即这四个 Demo 被独立评审抓出缺陷之前真实发布的 raster 值**。结果：

- Festival → `1280x720 is 1.778:1 but the surface is 2.000:1 - the picture would be stretched` ✅ 报出
- Installation → `1280x720 is 1.778:1 but the surface is 1.896:1` ✅ 报出
- Sphere → 无比例约束，正确地**不报**
- Stadium → `4096×512` 与 `7.854:1` 一致，正确地**不报**

**2/4 而不是 4/4 才是正确结果。** 如果四项全报，说明规则在乱叫；如果一项不报，说明它是装饰。

---

## 3｜bespoke 行为是**带走**的，不是压平的

Issue #42 §4 明确要求四个 Demo 不能丢掉各自的 shader 与状态逻辑。所以统一 schema 里 `behaviour.module` 是必填，`params` 可以任意：

| Demo | 进入 `behaviour.params` 的东西 |
|---|---|
| Sphere | 立体角覆盖、媒体窗口跟随观看者、网格环参数 |
| Festival | 两屏 `join` 关系、`derivedGeometry`、独立态右屏翻转 |
| Installation | 持续累积的标记池、真实余像、**取消整场重排**、观看距离 |
| Stadium | 旋转驱动覆盖弧、屏后灯柱（blow-through）、PEAK 灯柱升起、RELEASE 观众环 |

另外，Sphere 的 `adaptationModes` 与 Stadium 的 `panoramaModes`——**同一个概念的两个名字**——在统一 schema 里都变成 `fit.modes`。这是本次审计最直接的一处收益。

---

## 4｜这次运行顺带查出一个**新的真缺陷**

校验器对 Sphere 报出一条警告：

```
surfaces[0] (DOME_MAIN): fallback "local-loop" is declared but NOT implemented
```

这不是误报。`sphere/scene.json` 声明了 `fallback: { type: "local-loop" }`，而 `sphere/main.js` 第 701 行是：

```js
if (streamState !== "offline") { source.draw(cueTime, sample.density, sample.bright); }
```

也就是**掉线时直接跳过绘制、留下上一帧**——那是冻结，不是本地 loop。这正是 Installation 评审在它自己身上抓到的那一类问题（「声明 local-loop，实现是冻结+变暗」），**Sphere 也有，而且此前没有任何地方记录过**。

Stadium 则相反：`stadium/main.js` 在 `streamState !== "live"` 时确实绘制了一条独立的扫描条，所以它的 `implemented: true` 是**读代码核实过的**，不是猜的。两处的判定依据都写进了适配器注释。

---

## 5｜仍未做到（不掩饰）

1. **四个 Demo 还没有真的从统一 schema 初始化。** 本页面证明的是**设计可行、且不丢东西**，还**没有**把四份 `scene.json` 换成统一格式、也没有改各自的 `main.js` 去读它。P0.5 的验收最后一条（"四个 Demo 都能从统一 manifest 初始化"）目前是**用适配器验证的，不是真的迁移**。
2. **适配器是桥，不是终点。** 它有 4 份分支逻辑；迁移完成后它应该只剩下「读旧文件」的历史用途。
3. **schema 还没有和运行时的类型系统接起来。** SceneForge 主仓库用 zod；这里是一份手写校验器，为的是让页面本身零依赖、可离线跑。两者应该在迁移时合一。
4. **没有覆盖 bespoke 行为的等價性**：本页面证明「不丢字段」，没有证明「迁移后渲染逐像素一致」。那需要把四个 Demo 也接到统一 schema 之后再跑 `?t=` 静帧比对。
5. **`curvedPlane` 与 `projection` 两种 shape 在 schema 里定义了但没有实例**——四个 Demo 恰好用不到。

---

## 6｜复现

```bash
npm run build
python -m http.server 8123 --bind 127.0.0.1 -d dist
# 打开 /stage-replica/conformance/  ，或取机器可读结果：
chrome --headless=new --disable-gpu --virtual-time-budget=30000 --dump-dom \
  "http://127.0.0.1:8123/stage-replica/conformance/?probe=1"
```

```js
// 或直接调用
import { validateScene } from "../shared/scene-schema.js";
import { adaptLegacy } from "../shared/legacy-adapters.js";
const { scene } = adaptLegacy(await (await fetch("../festival/scene.json")).json(), "festival");
validateScene(scene);   // -> { ok, errors, warnings, info }
```
