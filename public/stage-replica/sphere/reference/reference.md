# Sphere / Immersive Dome｜REFERENCE LOCK

**Demo:** 01 Sphere（Issue #81，P0）
**状态:** ✅ S1 完成（2026-10-15）
**规则:** 参考事实与教学 proxy 必须分离。任何对外产物不得把 proxy 写成真实场馆尺寸。

> 本文件是 Sphere REFERENCE LOCK 在 **SceneForge 仓库内的正式副本**。原先它只存在于 portfolio 仓库的 `lab/stage-replica/sphere/reference/`，导致四个 Demo 里只有 Sphere 的参考冻结不在看板所在仓库内。现两处内容一致。

---

## 1｜来源与核验状态

| ID | 来源 | 核验方式 | 结果 |
|---|---|---|---|
| R1 | https://www.thesphere.com/studios-proxy/spherestudios/canvases | HTTP 200 + 无头截图 + 原文抓取 | ✅ 有效，含 Media Plane 定义 |
| R2 | https://www.spherestudios.com/capabilities | HTTP 200 + 无头截图 + 原文抓取 | ✅ 有效，含六大能力 |
| R3 | https://www.spherestudios.com/case-study/v-u2-an-immersive-concert-film | HTTP 200 + 无头截图 + 原文抓取 | ✅ 有效（**替换了原记录的断链，见 §6**） |

---

## 2｜Confirmed（可公开引用，逐字）

以下均为官方页面原文，可直接作为公开文案依据：

**Media Plane（R1）**
> "The highest-resolution LED screen on earth, bringing audiences into new worlds."
> "With over 3 acres of display surface, the 16k x 16k media plane wraps up, over and around the audience to create a fully immersive visual environment."

**Exosphere（R1）**
> "The world's largest LED screen bringing innovative artwork and brand activations to life."
> "The 580,000 square-foot programmable exterior is the world's most powerful digital canvas."

**Atrium（R1）**
> "The immersive story begins from the moment you enter Sphere"
> "A standalone, immersive attraction, customized for each Sphere Experience and Live at Sphere residency."

**Capabilities（R2）** — 官方列出六项：Creative & Design / AI & Generative Effects / Production / VFX & Motion Graphics / Post Production / Experiential Production。
其中 AI 相关原文：
> "Our team of specialists use generative AI and custom models to accelerate innovation and expand our creative possibilities."

**V-U2 案例（R3）**
> "The concert experience, reimagined—blending cinematic storytelling, iconic performances, and immersive visuals and sound to place audiences at the center of the show."

---

## 3｜措辞差异（本 Demo 的修正记录）

| # | 原文档写法 | 官方原文 | 处理 |
|---|---|---|---|
| C1 | `dsh-production-brief.md` / Issue #81：「画面向上、**向后**并围绕观众展开」 | "wraps up, **over** and around the audience" | 采用官方措辞 **up, over and around**。原文没有"向后"的依据，不写入任何对外文案。 |
| C2 | Issue #81：「pipeline 包含 creative / design / **capture** / VFX / post / experiential production」 | 官方六项为 Creative & Design / AI & Generative Effects / Production / VFX & Motion Graphics / Post Production / Experiential Production | 删除未获支持的 "capture" 环节；能力表述以 R2 的六项为准。 |
| C3 | 第三参考链接 `…/spherestudios/v-u2-immersive-concert-film` | 已 404 | 换为 `/case-study/v-u2-an-immersive-concert-film`（见 §6）。 |

---

## 4｜Proxy（本 Demo 自定，**非真实场馆尺寸**）

| 项 | 值 | 性质 |
|---|---|---|
| `dome_radius_m` | 25 | 教学 proxy |
| `audience_floor_diameter_m` | 34 | 教学 proxy |
| `stage_platform` | 14m × 8m | 教学 proxy |
| `eye_height_m` | 1.6 | 教学 proxy（人体尺度，非场馆数据） |
| `proxy_master` | 4096 × 4096 | 浏览器 proxy（真实参考为 16k × 16k） |
| `fast_proxy` | 2048 × 2048 | 浏览器 proxy |
| `program_out` | 1920 × 1080 | 输出规格 |
| `stage_platform_height_m` | 0.9 | **本 Demo 补充 proxy**（brief / demo-packs 只给了 14m × 8m 平面尺寸，未给高度） |
| camera positions（4 个机位坐标与 FOV） | 见 `sphere/build/scene.json` | **本 Demo 自定**；brief 只指定机位名称与"观众视角为主"，未给坐标 |

**公开产物的固定标注用语：**
> 几何尺寸与 4096² / 2048² 分辨率为教学预演 proxy，不代表 Sphere 实际场馆尺寸与 16K × 16K 母版规格。

---

## 5｜参考**没有**提供的（必须由本 Demo 自己决定并留痕）

- dome 半径、观众地面直径、舞台平台尺寸、观众眼高 → **全部是自定 proxy**，参考中没有。
- 状态切换的时间结构（四状态、32s、100 BPM pulse）→ 课程自定编排，不是参考事实。
- 机位高度与镜头语言 → 自定；参考只提供"audiences at the center of the show"这一关系原则（R3）。
- 观众密度 / 人群规模 → 不做（brief §1.3 明确不追求真实人群模拟）。

---

## 6｜断链与二次核验

- **已修复：** `demo-packs.md` §D 与 `dsh-production-brief.md` §2 引用的第三个链接 `https://www.spherestudios.com/spherestudios/v-u2-immersive-concert-film` 返回 **404 (Page Not Found)**。已替换为 R3 的 case-study 地址，并已在 R3 截图核验为真实内容页。
- **已完成（原为待办）：** Festival / Stadium / Installation 三个 Demo 的参考链接**已逐条核验**，各自都有 REFERENCE LOCK：
  - Festival → `public/stage-replica/festival/reference/reference.md`（Vita Motus / Quasar，全部有效）
  - Installation → `public/stage-replica/installation/reference/reference.md`（Ryoji Ikeda data-verse）
  - Stadium → `public/stage-replica/stadium/reference/reference.md`（STUFISH / Anna Vissi OAKA；该页图片极多，改用 DOM 抓取后逐字检索）
  - 汇总见看板 `globalGaps`。

---

## 7｜截图与公开边界

- 参考页截图保存在 `_local/`（`01-canvases.png` / `02-capabilities.png` / `03-v-u2-case-study.png`），已由 `.gitignore` 排除，**不进入公开仓库**。
- 公开仓库只保留：来源链接 + 逐字短句引用（§2）。
- 原因：仓库是公开的（见 portfolio `AGENTS.md`），第三方页面截图不作为再发布素材。
- 若后续希望把截图一并入库，需要你明确同意后再改 `.gitignore`。

---

## 8｜S1 完成判据

- [x] confirmed 与 proxy 已分离，且 confirmed 全部有 200 可用的原始来源
- [x] 断链已发现并替换
- [x] 未获原文支持的表述（"向后"、capability 里的 "capture"）已记录并纠正
- [x] 截图来源与公开边界已写明
- [ ] 交给 BUILD 使用前，`scene.json` 中所有尺寸必须能追溯到 §4 的 proxy 表
