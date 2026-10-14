# Festival / Two-Wall Stage｜REFERENCE LOCK

**Demo:** 02 Festival（Issue #78，P1）
**状态:** ✅ REFERENCE 完成（2026-10-15）
**规则:** 参考事实与教学 proxy 必须分离。本项目**没有找到任何公开的场馆尺寸**，因此 SPEC 里每一个数字都是 proxy。

---

## 1｜来源与核验状态

| ID | 来源 | 核验方式 | 结果 |
|---|---|---|---|
| R1 | https://vitamotus.com/project/coachella-quasar-2024/ | HTTP 200 + 无头截图 + 原文抓取 | ✅ 有效（设计方官方项目页） |
| R2 | https://vitamotus.com/press/ | HTTP 200 + 无头截图 + 原文抓取 | ✅ 有效（设计方新闻聚合页，含多家媒体直接引语） |
| R3 | https://jakehalbakken.com/work/quasar-stage-coachella-2024/ | HTTP 200 + 无头截图 + 原文抓取 | ✅ 有效（Creative Producer 个人项目页） |

三条链接**全部有效**——没有出现 Sphere 那边那种 404 断链。

---

## 2｜Confirmed（可公开引用，逐字）

### 2.1 空间关系

> "Quasar features **two monolithic LED walls**, designed to create a dynamic and immersive environment."
> —— R1，设计方原文

> "The stage, which has been designed by longtime Coachella collaborator Vita Motus, will be assembled from **two massive LED walls with the artists performing in the middle**."
> —— IQ Magazine，收录于 R2

> "Sitting on **opposites of the stage where the artists will perform**, the production team will be able to trigger real-time designs…"
> —— We Rave You，收录于 R2

**中央元素是三角形**（brief 把它写成可选的"三角形 / 楔形"，实际是有依据的）：

> "Heather Shaw … pointed out the stage walls' **angle**. The walls are separated by a **triangular DJ stage in the center**, which Shaw describes as **'digital scenic.'**"
> —— The Desert Sun，收录于 R2

### 2.2 实时与时间结构

> "The use of **X-Live and Unreal Engine** allows for real-time content playback, pushing the boundaries of live performance visuals."
> —— R1

> "…the production team will be able to trigger **real-time designs** throughout the **marathon 3+ hours sets**."
> —— We Rave You，收录于 R2

> "…designed to host **extended, three-to-four-hour DJ sets**."
> —— Coachella Valley Weekly，收录于 R2

### 2.3 与环境的关系（brief 的"与周围景观共存"确有依据）

> "These walls not only display real-time graphics but also **integrate with the physical landscape of Coachella**, providing a seamless visual experience…"
> —— R1

> "The stage includes **two LED walls designed to use augmented reality against the iconic Coachella backdrop**, creating an immersive experience not seen at Coachella before."
> —— Coachella Valley Weekly，收录于 R2

### 2.4 镜像（brief 未提到的一条设计事实）

> "We have two monolithic LED walls. They have dimension to it that will be scenic thanks to the **mirror** so that it feels like it's also part of the environment."
> —— Heather Shaw（Vita Motus 创始人），The Groove Cartel，收录于 R2

### 2.5 其它可核验事实

- 取代原 Sahara 帐篷的位置；是 Coachella 自 2013 年 Yuma 以来**第一个新的舞曲舞台**（IQ Magazine / R1）。
- 制作设计：**Vita Motus Design Studio**；音乐节制作：**Goldenvoice**；Creative Producer of Production Design：**Jake Halbakken**（R3）。
- 2024 演出艺人包含 Eric Prydz、Anyma、Honey Dijon、Green Velvet（R1）。

---

## 3｜Proxy（本项目自定，**非真实尺寸**）

**重要：参考中没有给出任何尺寸。** 下表的每一个数字都是本项目为教学预演自定的，不得表述为 Quasar 的真实尺寸。

| 项 | 值 | 性质 |
|---|---|---|
| 舞台 | 44 m W × 20 m D | 教学 proxy |
| Screen L / R | 18 m × 9 m，各向内 18° | 教学 proxy（**内旋角是自定的**；参考只确认"有角度"，没有给度数） |
| DJ 平台 | 6 m × 4 m | 教学 proxy（**三角形**这一点有参考依据，尺寸没有） |
| 单屏 raster | 2048 × 1024 | 浏览器 proxy |
| Preview master | 2560 × 1440 | 输出规格 |

**公开产物的固定标注用语：**
> 几何尺寸与 2048×1024 分辨率为教学预演 proxy。参考来源（Vita Motus / Coachella Quasar 2024）确认了"两块对置 monolithic LED 墙 + 艺人位于中央 + 实时内容播放 + 与场地景观共存"的关系，但未公布任何尺寸。

---

## 4｜措辞核对（与 brief 逐条对齐）

| brief 的写法 | 参考是否支持 | 处理 |
|---|---|---|
| 两块巨型 LED 墙 | ✅ 逐字支持（"two monolithic LED walls"） | 采用 |
| 艺人 / DJ 在中间 | ✅ 支持（"artists performing in the middle"） | 采用 |
| 实时内容 playback | ✅ 支持，且可补充实现方式（X-Live + Unreal Engine） | 采用并补全 |
| 数字画面与周围景观共存 | ✅ 支持（"integrate with the physical landscape"；"augmented reality against the iconic Coachella backdrop"） | 采用，措辞改用官方原文 |
| DJ 平台可做三角形 / 楔形 | ✅ **有依据**（"triangular DJ stage in the center"） | 从"可选"升级为"有依据"，形状定为三角形 |
| 内旋 18° | ❌ 参考只确认"有角度"，**没有度数** | 保留为 proxy，明确标注自定 |
| 44×20 m 舞台、18×9 m 屏、6×4 m 平台 | ❌ 参考无任何尺寸 | 全部标注为教学 proxy |
| （brief 未提及）镜像 | ✅ 参考提到 "thanks to the mirror" | 记录为已知设计事实；是否进入 Demo 由 GRAYBOX 决定 |

---

## 5｜参考**没有**提供的（必须自己决定并留痕）

- 所有尺寸与角度（见 §3）。
- 两块屏在演出中具体如何拆合、切换的时间结构（四状态 `LOW/BUILD/PEAK/RELEASE` 是课程自定）。
- 观众席形态与规模（不做人群模拟）。
- 屏幕像素间距 / 峰值亮度等工程参数。

---

## 6｜截图与公开边界

参考页截图保存在 `_local/`（`01-vitamotus-quasar.png` / `02-jakehalbakken-quasar.png` / `03-vitamotus-press.png`），由 `.gitignore` 排除，**不进入公开仓库**；公开仓库只保留链接与逐字短句引用。

---

## 7｜REFERENCE 完成判据

- [x] 三条参考链接逐条核验（全部 200，无断链）
- [x] confirmed 与 proxy 分离，且明确写出"参考未公布任何尺寸"
- [x] brief 的每条描述都核对到原文，一处（内旋角）判定为无依据的 proxy，一处（三角形）从可选升级为有依据
- [x] 补充了两条 brief 未提的设计事实（X-Live + Unreal Engine；mirror）
- [x] 截图来源与公开边界写明
- [ ] 交给 GRAYBOX 前：`scene.json` 中每个尺寸都要能追溯回 §3
