# Stadium / 360° Concert

**Issue #79 · P3 · 交付文档（V2）**
Stage Replica 第 4 个 Demo —— 技术型收尾，主题是 **Camera / Director / Program Out**。
参考：STUFISH 设计的 Anna Vissi / OAKA 体育场（360° in-the-round）。

> ⚠️ **教学预演 PROXY。** 本 Demo 不是那场演出的复刻，是把它当作"**摄像机本身也在编排演出**"的案例来预演。

---

## 1｜在线看

| | |
|---|---|
| 预演页 | https://ewanqian.github.io/SceneForge/stage-replica/stadium/ |
| 干净导演版 32s（无 HUD / 无四分屏） | `delivery/v2-delivery-clean-32s.mp4` |
| 导演版 32s（含四分屏，证据版） | `delivery/v2-director-32s.mp4` |
| 四种比例模式对照 | `delivery/pano-modes-compare.png` |
| 对照图 | `delivery/reference-v1-v2-stadium.png` |
| V1 评审与裁定 | [`systems/stage-replica/review-stadium-v1.md`](../../../systems/stage-replica/review-stadium-v1.md) |
| V1→V2 改动与实测 | [`systems/stage-replica/review-diff-stadium-v1-v2.md`](../../../systems/stage-replica/review-diff-stadium-v1-v2.md) |

**确定性审阅入口：**

```
?t=4|12|20|28            四个状态
?view=BOWL_WIDE|PERFORMER_FRONT|ORBIT_45|TOP
?pano=panorama|front-window|repeat|fill
?cuts=1                  四次切机位（0→8→16→24→28s）
?quad=0|1  ?hud=0|1  ?record=1  ?drop=1  ?dropAt=<秒>
数字键 1–4 = Cut，Space = 回 Program
```

---

## 2｜Confirmed 与 proxy

| 项 | 值 | 性质 |
|---|---|---|
| 圆柱 LED | ⌀20 m | **可确认**（STUFISH 逐字） |
| 主舞台 | ⌀30 m | **可确认**（STUFISH 逐字） |
| 观众规模 | 95,000 环绕 | **可确认**（仅作参照，不做人群模拟） |
| 屏幕透明性 | blow-through，灯光可置于屏后 | **可确认**（STUFISH 逐字，并给出了原因） |
| **圆柱高度** | **8 m** | **教学 proxy —— 且与参考照片不符，见 §4** |
| Arena 碗体 | ⌀120 m | 教学 proxy |
| Performer zone / halo | ⌀12 m | 教学 proxy |
| Panorama | 4096×512 母版 / 2048×256 运行时 | 展开比 7.85:1 由已确认尺寸推导 |

参考原文见 [`reference/reference.md`](reference/reference.md)。核验方式：该页图片极多，直接抓文本会被图库淹没，因此用 `chrome --dump-dom` 抓 DOM 后**逐字检索**确认引文真实存在。

---

## 3｜它要问什么，以及 V2 之后的答案

| # | 问题 | 回答 |
|---|---|---|
| 1 | 10 秒内能看懂核心空间关系吗？ | **部分能。** 同心几何（⌀30 舞台 / ⌀20 圆柱 / ⌀12 人物区）在 TOP 视角一眼可读，环形屏的覆盖弧也读得出。360°「没有单一正面」靠覆盖弧绕行与 45° 轨道机位读出来，95,000 的规模感仍主要靠一圈围栏刻度 + 角标文字。 |
| 2 | 人物 / 屏幕 / 观看位置有明确尺度吗？ | **V2 有。** V1 声明了 5m 比例尺却从未绘制；V2 把它画在舞台前缘，四个机位均可见。performer 改为自发光后，TOP 视角径向剖面上的中心亮度从周围 19 提升到 **181**，人形可辨（V1 实测 max RGB 126,112,131，分离不出人形）。 |
| 3 | 四个状态真的不同吗？ | **V2 是真的不同，而且改的是关系。** 覆盖弧 91°→180°→360°→80° 且**真的在旋转**（见 §5 的实测）；PEAK 时 8 根屏后灯柱**升到圆柱之上**（灯光越过屏幕成为事件）；RELEASE 时**观众环点亮到 100%**（回到"被环绕"）。 |
| 4 | V1 完整播放发现了什么？ | 独立评审判定 **holds up with caveats**：导播层是真的，但 ① RING 的「旋转」在**世界空间是空操作**（HUD 显示 163° 而几何纹丝不动）；② 四种比例模式里**三种画的是同一张画**（差异像素 0.00–0.02%）;③ 声明过的 5m 比例尺**从未绘制**；④ performer 在广角机位完全分离不出；⑤ 四状态只换弧角，RELEASE 与 LOW 几乎是同一帧；⑥ 8m 高度与参考照片的高径比矛盾却从未标注。 |
| 5 | V2 具体删掉 / 改变 / 保留了什么？ | **删掉**：无特征的噪点式母版、世界固定的覆盖弧、单一"展开比"读数。**改变**：覆盖弧跟随旋转、源换成四象限大图形、16:9 切片位置、四状态新增两个关系变量、performer 材质、比例尺（新增）、HUD 按模式显示实际比值。**保留**：32s、四状态命名与顺序、四机位名称、8m 高度与 4096×512 raster（并已标注张力）、导播与四分屏实现。**V1 全部产物保留。** |
| 6 | 比静态效果图多获得信息吗？ | **是。** 静态图能显示"覆盖 360°"，但只有跑起来才看得出覆盖弧在**转**、灯柱**升过**圆柱、观众环**亮起**——这三件都是时间性的关系。而**导播这件事本身只能跑起来才有**：同一个画面在四个机位下读法不同（BOWL_WIDE 看不出人 / PERFORMER_FRONT 同时揭示人物与屏幕透明 / ORBIT_45 给出另一组灯柱 / TOP 才读得出同心关系）。 |
| 7 | 能作为工作坊案例解释"为什么要预演"吗？ | **可以，而且这个 Demo 教两件事。** ① "摄像机也在编排演出"——同样两块屏，换机位就换叙事；② **更难得的一件**：V1 的"旋转"看起来完全正常（HUD 认真地显示 163°），但几何纹丝不动 —— **只有测量才能发现**。这正是"要预演"与"要独立评审"是两件事的最好论据。 |

---

## 4｜仍未做到 / 已知张力（不掩饰）

1. **圆柱 8m 高度与参考照片不符。** 参考**没有公布高度**。照片里圆柱的高径比接近 1:1，而 8m/20m 是 0.4，"rises like a beacon"在这个比例下并不相像。保留 8m 的理由是：brief 给的圆柱 raster `4096×512 = 8:1` 与 `62.8m ÷ 8m = 7.85:1` 是**自洽的一对**，单独改高度会让 raster 契约失效。张力现已写在角标、`scene.json` 的 `heightTension` 段与 diff 文档中。**若课程更看重照片比例，高度必须与 raster 一起改为约 4:1。**
2. **95,000 人没有可视化。** brief 明确不做人群模拟；规模感只由一圈 96 个刻度与角标文字承担，且那圈刻度只在 BOWL_WIDE 与 TOP 机位入画。
3. **没有音频。** brief 未要求，本 Demo 也未实现。
4. **16:9 的三种"错误处理"是刻意的对照实验**，不是参考做法；参考的是可用的 8:1 全景母版。
5. 交互手感、移动端与 XR 未测试。

---

## 5｜V2 的关键实测（这是本 Demo 最值得记录的部分）

**覆盖弧是否真的在转**（`?pano=front-window` 隔离该弧，TOP 视角，圆柱投影半径 ≈156px 环带每 30° 一箱）：

| 时刻 | V1 | V2 |
|---|---|---|
| t=8 | `[0,29926,33943,0,0,0,0,2220,4708,0,883,0]` | `[4,0,5,5,0,4,4,0,5,4,0,4]` |
| t=16 | **与 t=8 完全相同** | `[16,0,9,4,0,5,5,0,5,5,0,9]` |
| t=23 | **与 t=8 完全相同** | `[5,0,5,5,0,5,5,0,5,8,3,15]` |

亮弧圆均值角 **99.9° → 16.0° → 327.0°**（V1 三次同值）。
> 口径：V1 统计像素数、本项目统计点亮角度，数值不可比大小，**只有"三次是否相同"这个判据可比**，已从"相同"翻转为"不同"。

**比例模式可分辨性**（PERFORMER_FRONT、t=20、平均绝对差）：panorama↔repeat **1.90 → 7.49**、panorama↔fill **3.01 → 8.69**。

---

## 6｜本地运行

```bash
npm run build
python -m http.server 8123 --bind 127.0.0.1 -d dist
```

```bash
# 四种比例模式对照（view=PERFORMER_FRONT）
#   ?pano=panorama | repeat | fill | front-window
# 验证旋转是否真的移动几何
chrome --headless=new --disable-gpu --hide-scrollbars --window-size=1600,900 \
  --virtual-time-budget=11000 --screenshot=out.png \
  "http://127.0.0.1:8123/stage-replica/stadium/?t=23&view=TOP&pano=front-window&quad=0"
# 干净导演版录屏
node tools/record-cdp.mjs \
  "http://127.0.0.1:8123/stage-replica/stadium/?record=1&cuts=1&hud=0&quad=0" <outDir> 50
```

---

## 7｜工程约定

- 几何在 `scene.json`，cue 行为在 `main.js`（见仓库 `AGENTS.md`）。
- 复用 `../shared/fit-math.js`。
- 状态机：`LOW → BUILD → PEAK → RELEASE`，32s，ramp 1.6s。
- 圆柱用**圆柱 UV**（方位角由世界坐标反算），不是平面 UV 贴到曲面上。
- 导播层：`?cuts=1` 走文档化的四次切机位；四分屏用 scissor viewport 渲染，program 图块单独描边。
- V1 产物（录屏、静帧、评审、diff）全部保留，不被 V2 覆盖。
