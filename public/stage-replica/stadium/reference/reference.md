# Stadium / 360° Concert｜REFERENCE LOCK

**Demo:** 04 Stadium（Issue #79，P3）
**状态:** ✅ REFERENCE 完成（2026-10-15）
**规则:** 参考事实与教学 proxy 分离。

---

## 1｜来源与核验状态

| ID | 来源 | 核验方式 | 结果 |
|---|---|---|---|
| R1 | https://stufish.com/project/anna-vissi/ | HTTP 200 + 无头截图 + **DOM 抓取后逐字检索** | ✅ 有效（设计方官方项目页） |

**只有一条参考来源**，brief 也只给了一条。核验方式说明：这个页面图片极多，直接抓文本时正文会被图库与导航淹没，因此改用 `chrome --headless --dump-dom` 抓取 DOM 后再逐字检索关键词（95,000 / 30m / 20m / cylindrical / in the round），确认每条引文都真实存在于页面正文中。

---

## 2｜Confirmed（可公开引用，逐字）

**360° in-the-round 与观众规模：**

> "Designed specifically for Anna Vissi's one-night-only performance at OAKA Stadium, the set was conceived as a **true 360° "in the round" experience, with 95,000 people surrounding the performance on all sides**."

**几何关系（本 Demo 的核心参照）：**

> "At the heart of the pitch, a **20m cylindrical blow-through LED screen** rises like a beacon above a **30m circular stage**."

**屏幕透明性 → 屏后布光的原理（brief 只说"屏幕后可布光"，这里给出了原因）：**

> "The **transparency of the screen allowed lighting to be positioned behind it**, adding depth to both the lighting and content and creating more intricate visual compositions across the stage."

**brief 的三条主张全部逐字成立：** 360° / 95,000 人环绕 ✅、30m 圆形舞台 ✅、20m 圆柱 LED ✅，另加因果说明（blow-through 透明性）✅。

**附带的、可引用的上下文（不是本 Demo 的主参考）：**

> "The Greatest Hits Live tour kicked off at Sheffield Arena on April 12th featuring a **10m diameter LED covered revolving and transformable** …"

这是同一巡演的室内场馆版本，说明圆形舞台方案在两种尺度上都成立；本 Demo 参照的是 OAKA 的室外 360° 版本。

---

## 3｜Proxy（本项目自定，**非真实尺寸**）

| 项 | 值 | 性质 |
|---|---|---|
| LED 圆柱 | ⌀20 m | **参考确认** |
| 主舞台 | ⌀30 m | **参考确认** |
| 观众规模 | 95,000 | **参考确认**（本 Demo 不做人群模拟） |
| 圆柱高度 | **8 m** | **教学 proxy** — 参考**没有给出高度** |
| Arena 碗体 | ⌀120 m | **教学 proxy**，低保真观众边界，不做真实馆体 |
| Performer zone | ⌀12 m | **教学 proxy** |
| Halo ring | ⌀12 m | **教学 proxy**（灯光环，不是屏幕） |
| Panorama 母版 | 4096 × 512 | 浏览器 proxy |
| Fast proxy | 2048 × 256 | 浏览器 proxy |
| Program out | 1920 × 1080 | 输出规格 |

**由已确认尺寸推导（可追溯的换算，不是自定）：** 圆柱周长 = π × 20 ≈ **62.8 m**；高度取 8 m 时，展开比例 ≈ **7.85 : 1**。4096 × 512 = 8:1 与之一致，因此 panorama 母版的**宽高比**是有依据的（高度本身仍是 proxy）。

**公开产物的固定标注用语：**
> ⌀20 m 圆柱 LED 与 ⌀30 m 圆形舞台来自 STUFISH 官方项目页；圆柱 8 m 高、⌀120 m 碗体、⌀12 m performer zone 与 halo ring 为教学 proxy。

---

## 4｜措辞核对（与 brief 逐条对齐）

| brief 的写法 | 参考是否支持 | 处理 |
|---|---|---|
| 360° in-the-round | ✅ 逐字 | 采用 |
| 95,000 人环绕观看 | ✅ 逐字 | 采用（仅作为规模参照，不做人群模拟） |
| 30m 圆形舞台 | ✅ 逐字 | 采用 |
| 20m 圆柱 blow-through LED | ✅ 逐字 | 采用 |
| 屏幕后可布光 | ✅ 支持，**并且给出了原因**（transparency） | 采用，并把"透明性"写进 Demo 的灯光穿透做法说明 |
| 圆柱 8 m 高 | ❌ 参考未给高度 | 保留为教学 proxy，明确标注 |
| ⌀120 m arena / ⌀12 m performer zone / ⌀12 m halo | ❌ 参考无 | 全部标注为教学 proxy |

---

## 5｜参考**没有**提供的

- 圆柱屏高度、像素间距、亮度等工程参数。
- 观众席的具体形态与坡度（本 Demo 只用一个低保真碗体表示"四周有人"）。
- 演出内容与时间结构（四状态 `LOW/BUILD/PEAK/RELEASE` 是课程自定）。
- 导播方式（Cut / 多机位切换是课程自定的技术练习，不是参考的做法）。

---

## 6｜这个 Demo 在四个 Demo 里的独特价值

brief 把它定为 **P3 / 技术型第 4 Demo**，职责是补完 **Camera / Director / Program Out**。参考事实支持这个定位：这是一个**圆形中心 + 环绕屏 + 人物中心性**的场地，观众在 360° 里没有单一"正面"——所以"摄像机本身也在重新编排演出"这件事，在这里第一次成为必须回答的问题，而不是附加功能。

这也解释了为什么它排在最后：Sphere / Festival / Installation 用的是"选机位"，Stadium 用的是"**导播**"。

---

## 7｜截图与公开边界

参考页截图保存在 `_local/`（`01-stufish-anna-vissi.png`），由 `.gitignore` 排除，不进入公开仓库；公开仓库只保留链接与逐字短句引用。

---

## 8｜REFERENCE 完成判据

- [x] 唯一参考链接核验（HTTP 200）
- [x] 用 DOM 抓取 + 逐字检索确认引文真实存在，而不是靠二手转述
- [x] confirmed 与 proxy 分离；明确写出"圆柱高度无参考依据"
- [x] 区分了"参考原文"（⌀20 / ⌀30 / 95,000）与"由原文推导"（7.85:1 展开比）
- [x] 补充了 brief 未给出的原理（blow-through 透明性 → 屏后布光）
- [ ] 交给 GRAYBOX 前：`scene.json` 每个尺寸可追溯回 §3
