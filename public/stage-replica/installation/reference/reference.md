# Installation / Black Box｜REFERENCE LOCK

**Demo:** 03 Installation（Issue #80，P2）
**状态:** ✅ REFERENCE 完成（2026-10-15）
**规则:** 参考事实与教学 proxy 分离。

---

## 1｜来源与核验状态

| ID | 来源 | 核验方式 | 结果 |
|---|---|---|---|
| R1 | https://www.ryojiikeda.com/project/x_verse/ | HTTP 200 + 无头截图 + 原文抓取 | ✅ 有效（艺术家官方项目页） |
| R2 | https://www.ryojiikeda.com/archive/works/ | HTTP 200 + 无头截图 + 原文抓取 | ✅ 有效（官方作品档案） |

两条链接**全部有效**。

**命名澄清：** 官方项目页标题是 **X-verse**，`data-verse 1 / 2 / 3` 是该系列之下的三件作品。brief 写的是"data-verse-inspired"，指的正是这个系列。本 Demo 参考的是 **data-verse**（而非同页的 data-cosm、data.flux 等其它作品）。

---

## 2｜Confirmed（可公开引用，逐字）

**data-verse 1（2019）/ 2（2019）/ 3（2020）三件的规格在官方页面上完全一致：**

> materials: **DCI-4K DLP projector, computer, speakers**
> dimensions: **dimensions variable (minimum: W10.24 x H5.4m)**

这一条同时确认了 brief 里两件事：

1. brief 说"最低展示尺寸为 **W10.24 × H5.4m**" —— ✅ **逐字一致**；
2. brief 说器材是 "DCI-4K DLP projector、computer、speakers" —— ✅ **逐字一致**。

**由"DCI-4K"可推得 raster**：DCI 4K 的电影格式为 **4096 × 2160**。因此 SPEC 里的 `projection_raster: 4096 × 2160` **不是凭空自定**，而是对已确认器材规格的换算。这是本 Demo 唯一一个"可追溯到参考"的技术数字。

**可作为上下文引用的相邻作品（用于判断"空间化"不是凭空发明）：**

- `The Universe within the Universe`（2021）：**LED panels, computer, speakers, mirror**；W8 × D8 × H4 m —— 官方存在带镜面/空间包裹的做法。
- `the critical paths`（2024）：**LED panels, mirrors, computer, speakers**；dimensions variable。
- `micro | macro [pavilion]`（2022）：**LED screen, mirrors, computer, speakers**；LED screen & mirror floor size: **W5 × D5 m**。
- `data-cosm [nº1]`（2023–2025）：LED screen, computer, speakers；**LED screen size: W12 × D12 m**。

> 这四条说明：**"地面/镜面参与空间"在 Ikeda 的作品里确有依据**，不是课程虚构。但本 Demo 的可选地面投影是**课程比较实验**，不等于 data-verse 原作配置。

---

## 3｜Proxy（本项目自定）

| 项 | 值 | 性质 |
|---|---|---|
| Main projection | 10.24 m × 5.4 m | **参考确认的最低展示尺寸**（不是固定尺寸，原作是 "dimensions variable"） |
| Raster | 4096 × 2160 | 由已确认的 DCI-4K 器材换算 |
| Black box | 14 m W × 18 m D × 7 m H | **教学 proxy**（参考未给房间尺寸） |
| Viewer zone | 6 – 12 m | **教学 proxy** |
| Optional floor | 10.24 m × 5.4 m | **课程比较实验**，不声称为 data-verse 原作配置 |
| 四状态 `SPARSE/ACCUMULATE/DENSE/AFTERIMAGE` | — | 课程自定编排 |
| 观看位置 `CENTER/FAR/LEFT/FLOOR` | — | 课程自定 |

**公开产物的固定标注用语：**
> 主投影 10.24 × 5.4 m 是官方公布的**最低展示尺寸**（原作尺寸可变）；房间、观看距离与地面投影为教学 proxy。

---

## 4｜措辞核对（与 brief 逐条对齐）

| brief 的写法 | 参考是否支持 | 处理 |
|---|---|---|
| data-verse 参考 | ✅ 支持（X-verse 项目页下的 data-verse 系列） | 采用，并澄清 X-verse / data-verse 的关系 |
| 最低展示尺寸 W10.24 × H5.4m | ✅ **逐字支持** | 采用 |
| DCI-4K DLP projector / computer / speakers | ✅ **逐字支持** | 采用 |
| Raster 4096 × 2160 | ✅ 由 DCI-4K 换算 | 采用，并注明是换算而非原文 |
| 黑盒 14×18×7 m | ❌ 参考无房间尺寸 | 标注为教学 proxy |
| Viewer zone 6–12 m | ❌ 参考无观看距离 | 标注为教学 proxy |
| 可选 floor projection | ⚠️ 参考的 data-verse 无地面投影；但 Ikeda 其它作品（micro\|macro、The Universe within the Universe）确有镜面/地面做法 | 保留为**课程比较实验**，同时说明"空间化的做法有据可依" |

---

## 5｜这个 Demo 在四个 Demo 里的独特价值

brief 给它的角色是"证明 Stage Replica 不只适用于演唱会"。参考事实支持这一点：data-verse 的现场是**一台 DCI-4K 投影 + 计算机 + 音箱**，没有大型舞台结构、没有艺人、没有实时导播。也就是说，**这个 Demo 能不能成立，几乎完全取决于"尺寸、观看距离、声音、持续时间"四个变量**，而不是取决于屏幕数量或舞台规模。

这正是它要验证的东西，也是它必须与另外三个 Demo 用不同判据的原因。

---

## 6｜截图与公开边界

参考页截图保存在 `_local/`（`01-ryojiikeda-x-verse.png` / `02-ryojiikeda-works-archive.png`），由 `.gitignore` 排除，不进入公开仓库；公开仓库只保留链接与逐字短句引用。

---

## 7｜REFERENCE 完成判据

- [x] 两条参考链接逐条核验（全部 200）
- [x] confirmed 与 proxy 分离；明确写出"房间尺寸与观看距离无参考依据"
- [x] 区分了"参考原文"（10.24×5.4、DCI-4K）与"由原文换算"（4096×2160）
- [x] 澄清 X-verse 与 data-verse 的命名关系，避免引用错作品
- [x] 用四条相邻作品说明"镜面/地面参与空间"有据可依，但把本项目的地面投影仍标为课程实验
- [ ] 交给 GRAYBOX 前：`scene.json` 每个尺寸可追溯回 §3
