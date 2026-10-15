# Authoring（Issue #42 · P0）

**在线:** https://ewanqian.github.io/SceneForge/stage-replica/authoring/
**性质:** 参与者建档流程（participant authoring flow）。**它不是第五种舞台**，而是用来检验目标里真正的那条验收：

> **一个参与者在三小时内能不能做出第五个场景。**

这个页面自己拥有一套小的规范场景结构和一个通用媒体面渲染器。每个场景都只是数据——在侧栏编辑、编码进 URL 分享、导出成 JSON。它**故意不 import 四个 Demo 页面**：那些要保持各自的 bespoke shader 与行为（Issue #42 §4 要求），而这里要证明的是"共用那一层"可以被写出来。

---

## 1｜Issue #42 §3 的最低验收，逐条状态

页面右侧有一个**实时**清单，它测的是参与者**做了多少**，不是页面有多完整。所以打开时不满分是正常的。

| 验收项 | 页面机制 | 实现状态 |
|---|---|---|
| 增删 / 移动至少 2 个 media surface | 侧栏每个面可改形状（plane / cylinder / dome）、宽高、xyz、旋转；可增删 | ✅ 已实现，起始场景即含 2 个面 |
| 替换自己的素材 | 每个面可选 procedural / video / image，可填 URL 或**选择本地文件** | ✅ 已实现 |
| 保存 3–4 个状态 | 每个状态可改起止时间、亮度、覆盖、循环；可增删 | ✅ 已实现，起始 4 个 |
| 建立至少 3 个机位 | 每个机位可改名称、眼高、距离、横向、fov；可增删、可设为 Program | ✅ 已实现，起始 3 个 |
| 完整播放 V1 | 底部时间轴 + 播放/暂停 + 拖动 | ✅ 已实现 |
| 保存 review notes | 右栏 V1 批注框 | ✅ 已实现（localStorage） |
| 保存 V2 且 V1 不被覆盖 | V2 写自己的键；若尚无 V1，保存 V2 时会**先落一份 V1** | ✅ 已实现，且可「恢复 V1 场景」对比 |
| 生成可分享 URL | 整个场景 base64url 编进 `#s=`，无需服务器 | ✅ 已实现 |
| 导出 scene package | 下载 `scene.json`；另可导出两版批注 JSON | ✅ 已实现 |
| **一个新参与者无需改核心源码即可建一个不同于四个官方 Demo 的场景** | 这就是整个页面 | ⚠️ **机制已具备，但没有真人测过**（见 §4） |
| P0.5 统一 scene manifest | 本页面自带一套规范结构，并能**适配**四个 Demo | ⚠️ **未完成**（见 §3） |

**明确不声称的：** 「三小时做出第五个」这条总验收需要**真的找一个人来测**，我没有做过这件事。

---

## 2｜实测（无头）

| 测试 | 结果 |
|---|---|
| 起始场景 | 1 个平台、2 个媒体面、3 个机位、4 个状态、24s |
| `?t=2` vs `?t=14` | cueTime 正确；状态分别为 ST_1（coverage 0.35）与 ST_3（coverage 1, cycle 0.5）；画面亮度 max 111 → **220**，说明 cue 真的在驱动渲染 |
| `?demo=stadium` | 适配器产出 `stadium-adapted`：1 个 cylinder 面、4 个机位、4 个状态、32s、program BOWL_WIDE |
| 分享链接往返 | 自造场景 → base64url → `#s=…` 加载后逐字段一致（2 面 / 3 机位 / 3 状态 / 18s / program C2） |
| 实时清单 | 分享场景 5/9、stadium 适配场景 2/9；未通过的都是需要参与者动作的项 |

---

## 3｜适配器本身就是 P0.5 的证据

`adaptDemo()` 把官方 Demo 的 `scene.json` 翻成这套结构。它必须按 shape 分别猜尺寸键，因为四份 manifest 根本不一样：

- Sphere：`physicalSize = { radiusM, coverage }`，而且**没有 transform**（dome 居中）
- Festival：`{ widthM, heightM }` + transform
- Installation：`{ widthM, heightM }` + transform（其中一面是旋转 −90° 的地面）
- Stadium：`{ diameterM, heightM, circumferenceM, unwrappedAspect }`

**四个 Demo 现在不能由同一份 schema 初始化，这个适配器就是那件事的现场证据。** 详细的字段级审计在 [`systems/stage-replica/vnext-manifest-audit.md`](../../../systems/stage-replica/vnext-manifest-audit.md)。

---

## 4｜构建中抓到的两个真 bug（都属于"看起来只是黑"的那一类）

1. **片元着色器从来没编译成功。** 我在 GLSL 里把一个变量命名为 **`half`**，而它是 GLSL ES 的**保留字**。保留字不能作标识符，失败方式完全不可见：着色器拒绝编译，媒体面在**所有时间**都是黑的。如果只看画面，很容易把它当成"故意压暗的起始状态"。是**捕获浏览器 console** 才发现的（`THREE.WebGLProgram: Shader Error 0 … 'half' : Illegal use of reserved word`）。
2. **我把反引号写进了 JS 模板字符串里面的注释**，导致着色器字符串被提前截断、整个模块被弄坏——表现是编辑器所有列表变空。这条是**我自己修第一条时引入的**。

同一次排查还修掉一条真正但被掩盖的问题：平面分支用了**反向的 `smoothstep` 边缘**（`smoothstep(a, b, x)` 且 `a > b`），这在 GLSL 里是未定义行为且返回 0，即使着色器能编译也会把面画成黑纱。

**这三条都不能靠"看渲染图"判断对错**，只能靠读 console 和读代码。

---

## 5｜仍未做到 / 已知限制（不掩饰）

1. **没有真人测过三小时。** 这是本页面的**核心承诺**，也是唯一一条没有证据的。机制在那儿，但没有参与者用过。
2. **P0.5 没有做。** 本页面自带结构，四个 Demo 仍各写各的；能"适配"不等于"统一"。
3. **没有 undo / redo。** 改错了只能「重置为起始场景」或从 V1 快照恢复。
4. **没有多人协作、没有服务端。** 分享靠 URL 编码，场景一长 URL 就会很长（实测一个中等场景约 1.4 KB 编码后）。
5. **没有真实素材的编解码路径**：video 用 `<video>` 纹理、image 用 TextureLoader，都是直接贴上去，没有色彩管理、没有码率/格式校验。
6. **没有 XR、没有移动端布局**（三栏固定宽度，窄屏不可用）。
7. **本页面不写回官方 Demo 的 manifest。** 这是刻意的：在 P0.5 定案之前动那四个文件，会把"统一 schema"这件事变成四个特例的叠加。
8. **`?demo=` 的适配是有损的**：Demo 的 bespoke 状态行为（dome 的立体角、双墙的 join、黑盒的累积池、圆柱的旋转弧）在适配后统一退化成"亮度 / 覆盖 / 循环"三个通用参数。**这正是 P0.5 要解决的矛盾**，不是可以糊过去的细节。

---

## 6｜复现

```bash
npm run build
python -m http.server 8123 --bind 127.0.0.1 -d dist
```

```
?probe=1          把机器可读状态写进 DOM
?t=<秒>           cue 位置（静帧可复现）
?demo=<id>        载入官方 Demo 的适配版本（sphere|festival|installation|stadium）
#s=<base64url>    载入分享的场景
```

页面内也可直接调用：

```js
__AUTHORING__.exportScene()      // 场景 JSON 字符串
__AUTHORING__.shareUrl()         // 可分享链接
__AUTHORING__.checklist()        // [{id, ok}]
__AUTHORING__.saveV1() / saveV2()
```

---

## 7｜它和另外两个模块的关系

| 模块 | 回答的问题 |
|---|---|
| **Authoring**（本页） | 参与者能不能建自己的场景？ |
| **Crowd**（`stadium/crowd/`） | "很多人"到底是什么几何关系？ |
| **Replay**（`replay/`） | 已经发生过的演出能不能放回空间里再看一次？ |

三者都不改四个 Demo 的代码。三个都在看板上。
