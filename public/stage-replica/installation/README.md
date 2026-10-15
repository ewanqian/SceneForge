# Installation / Black Box

**Issue #80 · P2 · 交付文档（V2）**
Stage Replica 第 3 个 Demo。参考：Ryoji Ikeda — *data-verse*。

> ⚠️ **教学预演 PROXY。** 本 Demo 不是 data-verse 的复刻，是把它当作"用极少量素材 + 尺寸 / 观看距离 / 声音 / 持续时间构成完整现场"的案例来预演。

---

## 1｜在线看

| | |
|---|---|
| 预演页 | https://ewanqian.github.io/SceneForge/stage-replica/installation/ |
| 走查录屏（干净，无 HUD） | `delivery/v2-walkthrough-48s.mp4` |
| 走查录屏（含读数，证据版） | `delivery/v2-walkthrough-hud-48s.mp4` |
| 对照图 | `delivery/reference-v1-v2-installation.png` |
| V1 评审与裁定 | [`systems/stage-replica/review-installation-v1.md`](../../../systems/stage-replica/review-installation-v1.md) |
| V1→V2 改动与实测 | [`systems/stage-replica/review-diff-installation-v1-v2.md`](../../../systems/stage-replica/review-diff-installation-v1-v2.md) |

**确定性审阅入口**（任何人都能定位到同一帧）：

```
?t=6|18|30|46          四个状态
?view=CENTER|FAR|LEFT|FLOOR
?floor=0|1             墙面 only / 墙 + 地面
?hud=0|1  ?quad=0|1  ?record=1  ?drop=1  ?dropAt=<秒>
```

---

## 2｜Confirmed 与 proxy（这条界线是硬性的）

| 项 | 值 | 性质 |
|---|---|---|
| 主投影尺寸 | **10.24 × 5.4 m** | **官方公布的最低展示尺寸**（原文：*dimensions variable (minimum: W10.24 x H5.4m)*） |
| 器材 | *DCI-4K DLP projector, computer, speakers* | **官方原文** |
| 母版分辨率 | 4096 × 2160 | **由已确认的 DCI-4K 换算**（不是引用） |
| 运行时源 | 2048 × 1080 | 母版的一半，比例一致（1.8963:1 = 10.24/5.4） |
| 黑盒房间 | 14 × 18 × 7 m | **教学 proxy**（参考无） |
| 观看距离 | 6 – 12 m | **教学 proxy**（参考无） |
| 地面投影 | 10.24 × 5.4 m | **课程比较实验**，非原作配置 |
| 音轨 | 无 | **未实现**（见 §4） |

参考原文见 [`reference/reference.md`](reference/reference.md)。

---

## 3｜它要问什么，以及 V2 之后的答案

| # | 问题 | 回答 |
|---|---|---|
| 1 | 10 秒内能看懂核心空间关系吗？ | **V1 不能，V2 可以。** V1 的 Program 机位实测只有 0.69% 点亮、没有任何尺度物；V2 起画面里始终有投影面、房间边线、5 m 比例尺与两根 1.7 m 参考柱。 |
| 2 | 屏幕与观看位置有明确尺度吗？ | **V2 有。** V1 四个机位实测 **0 个近白像素**（比例尺在相机身后）；V2 把比例尺移到投影面根部并在两侧立参考柱。 |
| 3 | 四个状态真的不同，还是只换了一个数？ | **V2 是真的不同，且可测**：池持续累积 → DENSE t=30 为 771 条 / 去重占用 28.7%；AFTERIMAGE t=46 为 1155 条（不再新增、缓慢消退）。V1 的四个状态只是四个独立抽样，"保留率"等于随机水平。 |
| 4 | V1 完整播放发现了什么？ | 独立评审判定 **does not hold up as the test it claims to be**：① AFTERIMAGE 把静态线条累积成横贯全屏的硬线（实测某行 frac>10 = **1.000**）；② 观看距离只改变缩放（源仅 125 px/m）；③ 墙+地面在 Program 机位做差分，UI 之外**逐位相同**；④ 尺度物从不入画；⑤ `?hud=0` 文档化了但没实现；⑥ **48 秒里最大的视觉事件是每 6 秒的整场重排**（\|Δ\| 3.528 > 状态切换 0.954），而 brief 明确禁止快速剪切。 |
| 5 | V2 具体删掉 / 改变 / 保留了什么？ | **删掉**：整场重排、残留模式下的静态装饰线、加色噪点素材、拷贝式地面。**改变**：源比例与分辨率、标记改为持续累积的池、AFTERIMAGE 实现方式、四机位取景与 fov、尺度参照摆放、DENSITY→去重占用。**保留**：48 秒、四状态命名与顺序、房间与投影尺寸、proxy/confirmed 标注纪律。**V1 全部产物保留不覆盖。** |
| 6 | 比静态效果图多获得信息吗？ | **是，而且这是 V2 最关键的改善。** V1 的四个状态"从静帧就能得到"；V2 的核心属性——**池在累积、余像是残留**——只能靠时间读出来：任一静帧都无法回答"这个场是刚生成的，还是从上一段留下的"。 |
| 7 | 能作为工作坊案例解释"为什么要预演"吗？ | **可以，而且能教一个更难的道理。** V1→V2 的过程本身就是案例：一个 demo 可以看起来没问题，却在**测试别的东西**。评审用测量证明了"距离只改变缩放"和"最大的事件是一次重排"——这正是为什么"要预演"和"要独立评审"是两件事。 |

---

## 4｜仍未做到的（不掩饰）

1. **声音没有实现。** brief 只要求"音频可以播放"，但**本 Demo 自己的问题包含声音**，所以这一项**没有被检验**。不会因为另外三项做了就算完成。
2. **观看距离的差别仍主要落在取景上。** V2 的源是 200 px/m 的浏览器 proxy；真实的 DCI-4K 投 10.24 m 约 400 px/m，"6 m vs 12 m 是像素间距/视力问题而非缩放问题"这一点**没有被证明**。
3. **地面投影是课程实验**，不是 data-verse 原作配置；它与墙面共用同一坐标系（贴墙边对齐后镜像延续），这是本项目的规定动作，不是参考做法。
4. **afterimage 是画布级残留**，不是真实的光学余像或视频反馈；它演示的是"不清屏会发生什么"。
5. 无头录制**不含音频通道**；交互手感、移动端与 XR 未测试。

---

## 5｜本地运行

```bash
npm run build            # 在 SceneForge 仓库根目录
python -m http.server 8123 --bind 127.0.0.1 -d dist
```

```bash
# 任一状态与机位（?t= 会从零重放标记池，保证可复现）
chrome --headless=new --disable-gpu --hide-scrollbars --window-size=1600,900 \
  --virtual-time-budget=11000 --screenshot=out.png \
  "http://127.0.0.1:8123/stage-replica/installation/?t=46&quad=0"

# 干净走查录屏
node tools/record-cdp.mjs \
  "http://127.0.0.1:8123/stage-replica/installation/?record=1&hud=0&quad=0" <outDir> 50
```

---

## 6｜工程约定

- 几何在 `scene.json`，cue 行为在 `main.js`（见仓库 `AGENTS.md`）。
- 复用 `../shared/fit-math.js`。
- 状态机：`SPARSE → ACCUMULATE → DENSE → AFTERIMAGE`，48 s，ramp 4 s，**不做快速导播**。
- 标记池是唯一状态载体；`?t=` 会从零重放，因此静帧可复现。
- V1 产物（录屏、静帧、评审、diff）全部保留，不被 V2 覆盖。
