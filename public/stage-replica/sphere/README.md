# Sphere / Immersive Dome

**Issue #81 · P0 · 交付文档（V2）**
Stage Replica 第 1 个 Demo。参考：Sphere（Las Vegas）的 Media Plane 与 immersive dome 演出。

> ⚠️ **教学预演 PROXY。** dome 半径、观众地面、舞台平台、机位、4096²/2048² 分辨率**全部是教学 proxy**，不代表 Sphere 实际场馆尺寸，也不代表其 16K × 16K 母版规格。

---

## 1｜在线看

| | |
|---|---|
| 预演页 | https://ewanqian.github.io/SceneForge/stage-replica/sphere/ |
| 交付录屏 28s（宣传版） | `delivery/v2-promo-28s.mp4` |
| 导演版完整 32s（含切机位 + 丢源） | `delivery/v2-director-32s.mp4` |
| 对照图 reference → graybox → V1 → V2 | `delivery/reference-graybox-v1-v2.png` |
| 参考冻结（confirmed vs proxy） | [`reference/reference.md`](reference/reference.md) |
| 灰盒说明（S2） | [`systems/stage-replica/graybox-sphere.md`](../../../systems/stage-replica/graybox-sphere.md) |
| V1 评审与裁定 | [`systems/stage-replica/review-v1.md`](../../../systems/stage-replica/review-v1.md) |
| V1→V2 改动与实测 | [`systems/stage-replica/review-diff-v1-v2.md`](../../../systems/stage-replica/review-diff-v1-v2.md) |

**确定性审阅入口：**

```
?t=4|12|20|28                          HORIZON / ENCLOSE / FULL_FIELD / APERTURE
?view=AUDIENCE_CENTER|AUDIENCE_LEFT|STAGE_LOOKBACK|DEBUG_ORBIT
?mode=front-window|mirror-extend|shader-fill|square-master
?quad=0|1  ?hud=0|1  ?record=1  ?drop=1  ?dropAt=<秒>
```

---

## 2｜Confirmed 与 proxy

**可公开引用（官方页面逐字）：**

> *"With over 3 acres of display surface, the 16k x 16k media plane wraps up, over and around the audience to create a fully immersive visual environment."*

> *"The highest-resolution LED screen on earth, bringing audiences into new worlds."*

**本 Demo 的修正记录：**

| 原文档写法 | 官方原文 | 处理 |
|---|---|---|
| 「画面向上、**向后**并围绕观众展开」 | "wraps up, **over** and around the audience" | 采用官方措辞；原文**没有"向后"的依据**，不写入对外文案 |
| pipeline 含 "**capture**" | 官方六项为 Creative & Design / AI & Generative Effects / Production / VFX & Motion Graphics / Post Production / Experiential Production | 删除未获支持的 "capture" |
| 第三参考链接 `…/spherestudios/v-u2-immersive-concert-film` | 已 **404** | 换为 `/case-study/v-u2-an-immersive-concert-film` |

**proxy（非真实场馆尺寸）：** dome 半径 25m · 观众地面 ⌀34m · 舞台平台 14×8m（高度 0.9m 为本 Demo 补充，brief 未给） · 眼高 1.6m · 母版 proxy 4096² · fast 2048² · program out 1920×1080 · 四个机位坐标与 FOV 均为自定。

---

## 3｜它要问什么，以及 V2 之后的答案

| # | 问题 | 回答 |
|---|---|---|
| 1 | 10 秒内能看懂核心空间关系吗？ | **能。** 一旦 FULL_FIELD 打开，"画面占据整个视野、观众被包住"这件事立刻可读——这也是 Sphere 案例最该先被看懂的一点。 |
| 2 | 人物 / 屏幕 / 观看位置有明确尺度吗？ | **有，但尺度靠 dome 覆盖读数与 5m 比例尺共同承担。** V1 声明了比例尺却**没有绘制**（构建期发现并修掉）；V2 起画面里有 5m 地面比例尺。 |
| 3 | 四个状态真的不同吗？ | **是，而且是测出来的。** 点亮面积（V1→V2）：FULL_FIELD 69.7%→84.8%、STAGE_LOOKBACK 21.0%→87.9%、HORIZON 3.4%→5.7%、APERTURE 4.8%→7.4%；穹顶覆盖（真实立体角占比）HORIZON 2.4% / ENCLOSE 17.2% / FULL_FIELD 100% / APERTURE 4.6%。四个状态不是同一个画面的四种亮度。 |
| 4 | V1 完整播放发现了什么？ | ① **方位角羽化写成了状态比例**（`azMax*0.70`），导致背面 ±180° 全黑——FULL_FIELD 名不副实；② HUD 显示「占用 100%」而画面明显不是，判据本身错了；③ 5m 比例尺在 `scene.json` 里声明却从未渲染；④ 角标宣称 4096² 运行时母版，而实际源画布是 1280×720。 |
| 5 | V2 具体删掉 / 改变 / 保留了什么？ | **改变**：羽化改为固定弧度（`min(0.30, azMax*0.5)`）；FULL_FIELD 允许过冲（`elevMax: π/2+0.25`、`azMax: π+0.4`）；HUD 的「占用」换成**真实立体角**穹顶覆盖；媒体窗口方位角跟随观看者（`uAzCenter` / `azRel`）。**新增**：5m 比例尺几何。**保留**：四状态命名与顺序、32s、四机位名称、proxy 体系。**V1 与 V1.1 全部产物保留。** |
| 6 | 比静态效果图多获得信息吗？ | **是。** 静态图能显示"一张大画面"，但**只有跑起来**才读得出"画面从一条地平线扩展到包住整个视野、再收成一个光孔"这件事，以及穹顶覆盖率从 2.4% → 100% 的变化。 |
| 7 | 能作为工作坊案例解释"为什么要预演"吗？ | **可以，而且这个 Demo 教的是最常见的一种失败**：画面"看起来像"不等于它在测它声称在测的东西——V1 的 HUD 认真显示「占用 100%」，而背面其实是黑的。判据写错，比画面难看危险得多。 |

---

## 4｜仍未做到（不掩饰）

1. **观众密度与人群规模不做**（brief 明确不追求真实人群模拟）；"被包住"是靠**几何**读出来的。
2. **音频未实现。**
3. `DEBUG_ORBIT` 是工程机位，不是观看位置；把它当"观众视角"看会误读。
4. 交互手感、移动端与 XR 未测试。
5. **dome 不符合 SceneForge 的 `venueManifestSchema`**（`layout: box|arena`、单一 `screen`），因此本 Demo 以独立静态页存在；schema 是否扩展仍是开放问题。

---

## 5｜本地运行

```bash
npm run build
python -m http.server 8123 --bind 127.0.0.1 -d dist
```

```bash
chrome --headless=new --disable-gpu --hide-scrollbars --window-size=1600,900 \
  --virtual-time-budget=11000 --screenshot=out.png \
  "http://127.0.0.1:8123/stage-replica/sphere/?t=20&quad=0"
node tools/record-cdp.mjs \
  "http://127.0.0.1:8123/stage-replica/sphere/?record=1&hud=0&quad=0" <outDir> 50
```
