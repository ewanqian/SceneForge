# Sphere Graybox｜S2 构建说明

**阶段:** S2 GRAYBOX + 尺度契约
**日期:** 2026-10-15
**状态:** 结构可运行，已用无头 Chrome 截图核验

---

## 1｜这一版是 / 不是

**是：** 只读的几何与尺度骨架 —— 半球 dome、观众地面、舞台平台、performer 尺度参考、尺度网格、4 个机位定义。
**不是：** 没有内容映射、没有四状态、没有 media source、没有导播层（Quad Preview / Program Out / 键盘切换）。那些属于 S3。

设计原则来自 brief §1.3：**先把空间关系看清楚，不用高保真内容掩盖空间问题。** 所以这一版刻意保持无贴图、无材质细节。

---

## 2｜文件

| 文件 | 作用 |
|---|---|
| `scene.json` | 唯一尺寸与机位真相源。符合 `lab/stage-replica/shared/README.md` 的 manifest 契约 |
| `index.html` | 页面外壳、HUD（标题 / proxy 角标 / 尺寸读数 / 图例）、importmap（three@0.185.0，与 `lab/sceneforge-rtc` 同一加载方式） |
| `graybox.js` | 几何构建 + 单机位渲染 |

## 3｜尺寸溯源

| 尺寸 | 值 | 来源 |
|---|---|---|
| dome 半径 | 25 m | brief §2 proxy |
| 观众地面直径 | 34 m | brief §2 proxy |
| 舞台平台 | 14 m × 8 m | brief §2 proxy |
| 舞台平台高度 | 0.9 m | **本 Demo 补充**（brief 未指定；见 `reference/reference.md` §4） |
| performer 高度 | 1.7 m | 人体尺度参考 |
| 观众眼高 | 1.6 m | brief §2 proxy |
| 尺度网格 | 5 m 环距 + 12 条径向 | 本 Demo 补充，用于目视校核 |
| 5 m 比例尺 | 5 m | 本 Demo 补充 |

主 proxy 表（含 confirmed vs proxy 的完整区分）在 [`../reference/reference.md`](../reference/reference.md) §4。

---

## 4｜三个需要说明的技术决定

1. **dome 用 `BackSide` 渲染** —— 观众在球壳内部，必须渲染内表面。从外部看时用线框 + 降透明度（`DEBUG_ORBIT`），才能同时读到"壳"和"里面"。
2. **不用 `GridHelper`，改画径向/环形网格** —— 方形网格会溢出圆形观众地面，视觉上把人读成"站在方房间里"，正好和这个 Demo 要传达的"人在圆形空间内部"冲突。环形网格天然贴合。
3. **不加 `scene.fog`** —— 在 25 m 尺度上雾会被读成"屏幕在消失"，而这恰好是本 Demo 要证伪或证明的现象，不能预先用雾掩盖。SceneForge 在 99 m 尺度上遇到过同一问题，本 Demo 直接规避。

---

## 5｜已知不足（留给 S4 REVIEW 判断，此处不预先修饰）

1. **`STAGE_LOOKBACK` 目前几乎没有尺度锚点。** 机位在舞台中心回看观众，画面里只有地面、网格与 dome 线框；performer 就在机位原点，因此不可见。这个视角只有在 S3 有 dome 内容之后才有意义。**现在它不成立，记录在案。**
2. **`AUDIENCE_CENTER` 的"人在里面"主要靠 HUD 文字成立，不靠画面本身。** 画面下半部被舞台平台占据，dome 线框较暗，performer 相对偏小。是否需要在 S3 增加第二个尺度锚点（例如观众区的人形标记），交由 S4 观看后判断，不在此处先加。
3. **`DEBUG_ORBIT` 是唯一"10 秒内一眼看懂"的视角**，但它是讲解机位，不是观众体验机位。这条差距本身就是 brief 要反映的问题。

---

## 6｜运行

需要本地 HTTP 服务（`scene.json` 用 `fetch` 读取，`file://` 下会被浏览器拦截）：

```bash
python -m http.server 8123 --bind 127.0.0.1 -d "lab/stage-replica/sphere/build"
# 然后打开
# http://127.0.0.1:8123/index.html?view=AUDIENCE_CENTER
# ?view= 可选 AUDIENCE_CENTER | AUDIENCE_LEFT | STAGE_LOOKBACK | DEBUG_ORBIT
```

依赖：`three@0.185.0` 与 `three/addons/`，经 jsdelivr 加载（与仓库现有 `lab/sceneforge-rtc` 一致），无本地 npm 依赖。

---

## 7｜核验证据

无头 Chrome（`--headless=new`）对三个机位各截一图，已存入 `stills/`：

| 图 | 机位 | 能读到什么 |
|---|---|---|
| `stills/graybox-audience-center.png` | AUDIENCE_CENTER | 舞台平台、performer 1.7m、头顶 dome 线框、环形网格 |
| `stills/graybox-debug-orbit.png` | DEBUG_ORBIT | 半球线框完整覆盖 ⌀34m 圆形观众地面，舞台居中，5 m 比例尺可见 |
| `stills/graybox-stage-lookback.png` | STAGE_LOOKBACK | 只有地面/网格/dome 线框 —— 见 §5 第 1 条，此视角当前不成立 |

复现命令：

```bash
chrome --headless=new --disable-gpu --hide-scrollbars --window-size=1600,900 \
  --virtual-time-budget=12000 --screenshot=out.png \
  "http://127.0.0.1:8123/index.html?view=AUDIENCE_CENTER"
```

S4 / S6 沿用同一无头路径生成状态帧与对照图。

