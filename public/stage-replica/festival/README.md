# Festival / Two-Wall Stage

**Issue #78 · P1 · 交付文档（V2）**
Stage Replica 第 2 个 Demo。参考：Vita Motus 设计、Goldenvoice 制作的 Coachella **Quasar** 舞台。

> ⚠️ **教学预演 PROXY。** 参考**未公布任何尺寸**；舞台 44×20m、双屏各 18×9m、内旋 18°、DJ 平台 6×4m、2048×1024 raster 全部为自定 proxy。

---

## 1｜在线看

| | |
|---|---|
| 预演页 | https://ewanqian.github.io/SceneForge/stage-replica/festival/ |
| 交付录屏 28s（干净 Program 输出） | `delivery/v2-delivery-28s.mp4` |
| 导演版 32s（无 HUD / 无四分屏） | `delivery/v2-director-clean-32s.mp4` |
| 对照图 reference → V1 → V2 | `delivery/reference-v1-v2-festival.png` |
| 参考冻结（confirmed vs proxy） | [`reference/reference.md`](reference/reference.md) |
| V1 评审与裁定（含 V2 范围） | [`systems/stage-replica/review-festival-v1.md`](../../../systems/stage-replica/review-festival-v1.md) |
| V1→V2 改动与实测 | [`systems/stage-replica/review-diff-festival-v1-v2.md`](../../../systems/stage-replica/review-diff-festival-v1-v2.md) |

**确定性审阅入口：**

```
?t=4|12|20|28               LOW / BUILD / PEAK / RELEASE
?view=FOH_WIDE|DJ_FRONT|STAGE_LEFT|HIGH_WIDE
?quad=0|1  ?hud=0|1  ?record=1  ?cuts=1  ?drop=1  ?dropAt=<秒>
```

---

## 2｜Confirmed 与 proxy

**可公开引用（来源页逐字）：** 两块 monolithic LED 墙、**艺人在两块墙中间**演出、实时内容播放（X-Live + Unreal Engine）、中央为**三角形** DJ 舞台。

**proxy（参考未公布尺寸）：** 舞台 44×20m · 双屏各 18×9m · 内旋 18°（**自定**）· DJ 平台 6×4m · 单屏 raster 2048×1024（2:1，与 18×9m 屏幕一致）。

---

## 3｜它要问什么，以及 V2 之后的答案

这个 Demo 的核心变量只有一个：**`join`**——两块屏什么时候是两块独立画面，什么时候合成一整张。

| # | 问题 | 回答 |
|---|---|---|
| 1 | 10 秒内能看懂核心空间关系吗？ | **V2 能。** 一开场就是半透明概念图，直接标注 `两块独立 / 合成一个整体` 与中央缺口。V1 的问题是"合成"在画面上**根本不成立**（见 #4）。 |
| 2 | 人物 / 屏幕 / 观看位置有明确尺度吗？ | **部分。** 人物 1.7m 有标注，5m 比例尺在地面；但两块屏在 V 形深处的透视压缩较强，侧后方机位读尺度仍需靠近。 |
| 3 | 四个状态真的不同吗？ | **V2 是真的不同。** 除了 `join` 从 5%→100%，V2 起独立态与合成态**在画面上可区分**（非对称斜线是否连成一条）；RELEASE 也按 brief 实现「一侧先退、中心保留」。 |
| 4 | V1 完整播放发现了什么？ | 独立评审判定 **holds up with caveats**，并指出四条硬问题：① PEAK 的"合成"被 **168px（≈5.6m）黑场**劈开，而每侧可见的半地标只有 90px——**缺口比地标本身还宽**；② `join` 只在 FOH_WIDE / HIGH_WIDE 两个**非人类机位**上可读，DJ_FRONT 把两屏都裁出画外；③ performer 站在墙面前方 **10m**，不在两屏"之间"——这是**对参考的误读**（原文是 *artists performing in the middle*）；④ brief 对 RELEASE 的定义是「一侧先退、中心保留」，V1 只做了整体变暗；⑤ 屏幕 18×9m 是 2:1，源却是 16:9 且无比例校正，画面被**横向拉伸约 12.5%**；⑥ `fallback` 声明 `local-loop` 实现却是"冻结+变暗"。 |
| 5 | V2 具体删掉 / 改变 / 保留了什么？ | **改变**：几何（人移进 V 形喉部、缺口 8.9→3.28m）、四机位、源宽高比（→2048×1024 = 2:1）、跨缝地标（对称椭圆 → **非对称斜线**）、独立态表达（右屏垂直翻转）、RELEASE 形态、fallback 实现（真本地 loop）。**保留**：32s / 四状态命名与顺序 / 机位命名 / proxy 体系。**删掉**：无。**V1 全部产物保留。** |
| 6 | 比静态效果图多获得信息吗？ | **是，且 V2 后强得多。** 静态图无法回答"两块屏何时该分开"；现在能直接演示：**同一条斜线**在独立态是两块各自的图形，在合成态跨过缺口连成一条。 |
| 7 | 能作为工作坊案例解释"为什么要预演"吗？ | **可以。** 这个 Demo 能现场演示两件只有跑起来才看得见的事：① 缺口 8.9m 时"合成"看着根本不成立（V1 证据保留）；② 把人和屏幕关系摆对之后，"**什么时候分开、什么时候连接**"才第一次成为可选择的东西。 |

---

## 4｜仍未做到 / 已知张力（不掩饰）

1. **两块屏之间 3.28m 的缺口永远不可能无缝**——那里站着人。因此 PEAK 的判据是「**构图跨缝连成一体**」而不是「像素连续」，从 `DJ_FRONT` 看仍是一片纵长黑带。
2. **右屏垂直翻转是"独立"的廉价表达**：确实让两屏读起来不同，但仍是同一素材的变体，不是第二条源。brief 允许同一 source 通过 crop / UV / offset 形成两种构图，故不违规；真双源属后续范围。
3. **源改成 2:1 后每帧绘制成本约 4 倍**，实测 CDP 抓帧率 59.98 → 46.04 fps（录屏采样率，非页面 rAF）。
4. **音频未实现**；交互手感、移动端与 XR 未测试。
5. **双屏不符合 SceneForge 的 `venueManifestSchema`**，以独立静态页存在。

---

## 5｜本地运行

```bash
npm run build
python -m http.server 8123 --bind 127.0.0.1 -d dist
```

```bash
chrome --headless=new --disable-gpu --hide-scrollbars --window-size=1600,900 \
  --virtual-time-budget=11000 --screenshot=out.png \
  "http://127.0.0.1:8123/stage-replica/festival/?t=20&quad=0"
node tools/record-cdp.mjs \
  "http://127.0.0.1:8123/stage-replica/festival/?record=1&cuts=1&hud=0&quad=0" <outDir> 50
```
