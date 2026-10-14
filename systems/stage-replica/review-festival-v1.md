# Independent review — Stage Replica · Festival / Two-Wall Stage

Reviewer: independent agent. No files outside `_review_scratch/` were modified.

Evidence base:
- live renders captured with headless Chrome at `?t=4|12|20|28` × `view=FOH_WIDE|DJ_FRONT|STAGE_LEFT|HIGH_WIDE`
- `delivery/v1-director-32s.mp4` (1578×802, 59.98 fps, 31.75 s) sampled at t=4,8,12,16,20,24,28,31
- a validated pinhole-camera model of `scene.json` (checked against an independent three.js calibration
  render of the same geometry, `_review_scratch/calib.html` vs `_review_scratch/calib.png`, corners
  agree within ~2 px), applied as an overlay to the live stills

## A. VERDICT

**holds up with caveats** — the two-wall/performer-in-the-middle relationship is clear and the
`join` variable is real and animates, but the joined image is only ever legible from the two
non-human cameras and the pair is separated by ~5.6 m of black at PEAK, so "one continuous
picture" is mostly asserted by the HUD rather than seen.

## B. FINDINGS

### B1. At PEAK the joined picture is split by an 8.9 m gap that projects to 168 px, ≈1.9× the width of each visible half-landmark
- Observed: FOH_WIDE t=20 (`stills/v1-peak.png`): the landmark ellipse is cut into two halves.
  Measured from the image, the left wall's arc spans x≈626→716; the right wall's arc spans
  x≈884→974. The dark gap between the wall inner edges spans x≈716→884.
- Evidence: validated model predicts left-wall inner edge x=716.2, right-wall inner edge x=884.2
  → 168.0 px, and one visible half-ellipse = 90.2 px wide. Observed column scan at y 380–520
  finds the last bright column at x=708–710 (left wall) and first at x=889–891 (right wall).
- Why spatial, not taste: the join is only perceivable if the two halves can be read as one object;
  here the separating void is ~1.9× the half-object's own width, so the eye gets two symmetric
  open arcs. The cause is `innerGapM = 2*(13 - 9*cos18°) = 8.9 m` (scene.json + main.js:339).

### B2. `join` is only readable from FOH_WIDE and HIGH_WIDE; both human-height cameras cannot contain the joined pair
- Observed: at `?t=20&view=DJ_FRONT` the left wall's inner edge is off the left of frame and the
  right wall is cropped at the right edge (`_review_scratch/live/DJ_FRONT_t20.png`, and the
  delivered `stills/v1-dj-peak.png`); only the two inner halves appear, ~700 px apart.
- Evidence: DJ_FRONT is at (0,2.2,13) with fov 52° → horizontal half-angle 43.8°. Wall inner corners
  are at (±4.44, 0, −7.22); angular offset from the view axis = atan(4.44/20.2) ± 18° → ±30.5°
  and ±89°. The screens' content is spread to ±89°, i.e. past the 43.8° frame edge. Only the
  two aerial cameras (FOH_WIDE at z=30, HIGH_WIDE at y=26) subtend the pair within their frames.
- Why spatial: "when do the two screens become one whole?" cannot be judged from the two camera
  positions that stand for a person. The pair is legible only from viewpoints no operator/
  designer/audience member occupies.

### B3. The performer is 10 m in front of the wall plane, so from the DJ_FRONT "in the middle" position the walls are at his sides
- Observed: in `?t=20&view=DJ_FRONT` the walls are cropped, nearly edge-on slivers; the deck
  between the performer and the seam dominates the frame. Same in the v1 recording at t=16
  (`_review_scratch/vid/t16.png`, PROGRAM DJ_FRONT).
- Evidence: platform/performer sit at world (0,0,0) (scene.json `stage.centerZ=-6` applies only to
  the deck; screens are at z=−10, platform has no z offset in main.js:193-208). At FOH_WIDE the
  performer is 40 m from the wall plane; at DJ_FRONT 10 m. The performer and platform do render
  correctly between the screens in plan view (HIGH_WIDE t=20), so this is not a modelling error —
  it is an arrangement choice that empties the two frontal cameras of the relationship being taught.
- Why spatial: the demo's stated core relationship is screens–performer–screens; at the two
  human viewpoints the performer is 3–5 screen-heights of floor away from the picture plane.

### B4. Scale is declared, not visible: the 5 m bar is a bare 182 px white line, the 4 m grid is unlabelled, the DJ triangle reads as a black slab
- Observed: FOH_WIDE t=20 `_review_scratch/crop_foh_actor.png`: the deck line is an unmarked white
  rule; the platform is a near-black trapezoid with no readable triangular plan; the performer is
  45 px tall (1.7 m / 40 m distance with fov 58°). In HIGH_WIDE the performer is ~12 px.
- Evidence: model predicts 5 m bar = 182.6 px at FOH (measured 182 px in the image, x 709→891);
  performer 1.7 m = 45.5 px; each screen 18 m = 385 px wide. The HUD's `人物 1.7m` and `中央间距
  8.9m` are the only place the units exist; nothing in the image is dimensioned.
- Why spatial: a scale reference only works if it can be read off the picture. A 5 m unlabelled line
  in a 40 m-deep black void and a 45 px capsule give no way to judge the 44×20 m deck, the 18×9 m
  screens or the 8.9 m gap without trusting the HUD numbers. The height rule beside the performer
  (main.js:210) is a 1.75 m orange line drawn at the same world x and is too dim to see in the
  delivered stills.

### B5. `join` reaches join=1 by making the two walls display *identical, mirrored* scaled crops of the same texture
- Observed: at PEAK the two landmarks are mirror-identical; the horizontal grid rules line up across
  the seam (left rows 367,381,396,411,425,440,455,469,484,498 vs right rows 370,384,398,411,425,
  439,452,466,479,493 — same pitch, ±3 px), and the vertical columns terminate at each wall's inner
  edge (last column x=710 left, first x=890 right). Meanwhile the source canvas is 1280×720
  (main.js:15-16) mapped onto an 18×9 m plane with no aspect correction (main.js:257-258).
- Evidence: `JOINED = {L:{scale:[0.5,1],offset:[0,0]}, R:{scale:[0.5,1],offset:[0.5,0]}}`
  (main.js:310-313). Model projection: at PEAK the texture ellipse lands wholly inside each wall
  (wall_u ∈ [0,1] for both walls), so each wall shows half of the ellipse at its inner edge and
  the two halves are congruent mirror images.
- Why spatial: a continuous picture is a picture whose parts can only be completed by each other.
  Here each half is independently a recognizable arc and the completed ellipse's parts are
  congruent, so "one whole" is inferred from symmetry, not from anything the geometry forces.
  Combined with B1 this is the demo's central weakness.

## C. JOIN MECHANIC (is the difference visible without the HUD?)

**Partly. It is visible as "a shape got cut in half", not as "one continuous picture".**

- **LOW** (`?t=4`, join 5%) — from `FOH_WIDE_t4.png` and `stills/v1-low.png`: the LEFT wall shows a
  complete small ellipse (~100×110 px, centred near x=536); the RIGHT wall shows a much larger
  (>2× linear) partial ellipse whose top and bottom run off the wall. Everything else on both walls
  is the identical blue-grey grid + white dot field. So at LOW the walls differ in exactly one
  respect: the landmark's scale and position. Mean screen luminance measured over the content band
  is left 28.1 / right 29.5 — i.e. visually the same picture with one shape moved.
- **PEAK** (`?t=20`, join 100%) — the ellipse is two facing half-arcs, 168 px (≈5.6 m) of black
  between their open ends; both halves are the same size and mirror images.
- Would a first-time viewer notice? They would notice *a change*: a full ellipse becomes two arcs.
  Whether they conclude "the two screens became one picture" depends on them inferring that the two
  arcs are the two halves of one ellipse across a 1.9-half-width void. The HUD line
  `SCREENS 两块独立(join 5%) / 合成一个整体(join 100%)` states the answer; the pixels only hint at it.
  The ambiguity is real and specific: the source's landmark is symmetric about the seam, so the
  joined state is indistinguishable from "both walls independently show a mirrored half-shape".

## D. STATE-DIFFERENTIATION

Per-state, judged from renders (`?t=4/12/20/28`, `stills/v1-*.png`, video frames):

- **LOW (t=4, join 5%, density 0.16, bright 0.46)** — small full ellipse on the left wall, oversized
  partial ellipse on the right; sparse faint particles; grid dim. Only state where the two walls
  show the landmark at *different scales*.
- **BUILD (t=12, join 45%, density 0.5, bright 0.72)** — landmark enlarged on both walls and moving
  toward each wall's inner edge; particles multiply; grid brightens. Same composition as LOW, but
  both walls now show the same scale.
- **PEAK (t=20, join 100%, density 0.9, bright 1.0)** — two congruent half-ellipses facing across
  the 8.9 m gap; densest particle field; brightest. The only state that reads as "the pair".
- **RELEASE (t=28, join 15%, density 0.24, bright 0.52; held during the recorded run as STREAM
  FALLBACK, feed 0.45)** — in the delivered recording the screens are visibly darker and washed
  out (measured left 18.9 / right 22.1 mean vs 47.1/28.9 at PEAK) than RELEASE-by-parameter would
  be; landmark back to near-LOW geometry; particles thinned. If the documented run included the
  simulated source drop (the recording's HUD shows STREAM FALLBACK at 28.68 s and LIVE at 20.68 s),
  then RELEASE as *shipped* is a dimming, not a distinct stage picture.

**Plainly: the four states are not four compositions.** The camera framing, the screen
occupancy, the wall geometry, the deck, the platform and the performer are fixed in all four;
the media is one procedural source running continuously. What changes is three scalars on a ramp
(`join`, `density`, `bright`) plus, in the recording, a stream-state dimming. `LOW` and `RELEASE`
are near-duplicates (join 5% vs 15%, density 0.16 vs 0.24, bright 0.46 vs 0.52). This is density
and brightness ramping, not composition.

## E. ANSWERS

1. **Core spatial relationship in 10 s?** Yes. FOH_WIDE t=4 shows two facing walls, a deck and a
   performer between them; the four-view quad tile strip makes it immediate. Qualified only by B3:
   at the two human cameras the performer/wall relationship is not what you see.
2. **Clear scale for performer, screens, viewing positions?** No. The performer is 45 px at FOH and
   ~12 px at HIGH_WIDE; the 5 m bar is a bare line; the 4 m grid is unlabelled and its spacing is
   not verifiable from the picture; three of the four cameras have `eyeHeightM: null` and float at
   6.5 m / 26 m. The only scale statement is HUD text.
3. **Four states genuinely different, or media/brightness swapped?** Not genuinely different —
   brightness + density + one landmark scale (see D). Media is never swapped; it is one continuous
   procedural source.
4. **What the full V1 run revealed?** From the recording only (no written post-mortem): a complete
   continuous 31.75 s pass at 1578×802/59.98 fps with the director cut schedule running
   (t=0 FOH_WIDE → 12 DJ_FRONT → 20 STAGE_LEFT → 24 HIGH_WIDE → 28 FOH_WIDE). Visible in it: the
   simulated source drop at ~26 s (HUD flips LIVE→FALLBACK, screens dim to ~40%, content freezes
   because `source.draw` is skipped while `texture2D` keeps sampling the last frame). Also visible:
   the RELEASE state is indistinguishable from a dimmed PEAK. A "V1 problems" list is not in the
   repository, so the three-to-five recorded problems the brief asks for are not verifiable.
5. **What V2 deleted/changed/kept?** Not answerable yet — no V2 exists in the working tree and no
   change log accompanies V1.
6. **Does the maker's own content convey more than a static render?** Yes, but modestly. The source
   is procedural and genuinely moving (horizontal wash sweep, 60→798 drifting particles, drifting
   grid, landmark scale that animates with `join`), and the `join` relation is *animated* rather
   than switched. But the source ignores its own colour (the shader samples only `src.g`, so the
   orange/blue gradient never reaches the walls) and the moving parts (particles) are the parts
   that carry no meaning for the join question.
7. **Usable in a workshop to explain why previsualization matters?** Partly. It demonstrates the
   right thing — you can decide split-vs-continuous in advance and see it change over a cue — and
   it honestly labels its geometry as proxy. It is weaker as a teaching object because the joined
   image is only legible from two non-human cameras (B2) and at PEAK the "one picture" is two arcs
   separated by more black than object (B1/C), so a participant would be asked to take the HUD's
   word for the very thing the demo exists to show.

## F. UNSUPPORTED CLAIMS / NUMBERS CHECKED

- `中央间距 8.9m` (`hud-scale`, and the badge's geometry block) — **arithmetically fine, semantically
  loose.** It is `2*(13 − 9·cos 18°) = 8.881 m`: the perpendicular distance between the two wall
  *planes*. The clear floor-to-floor gap between the inner *edges* is 2·4.44 = 8.881 m at the
  corner and the nearest-point distance between the two planes' far edges is 2·(13−9·cos18) still —
  but the number reads as "the gap between the screens" while the screens are 18° off-axis, and at
  the delivery camera it is 168 px of a 1600 px frame (10 %). Nothing on screen shows 8.9 m.
- `屏 18×9m · 内旋 18° · 人物 1.7m` — matches scene.json, and the 18° is correctly labelled proxy
  in the badge (`内旋 18°` + `参考未公布任何尺寸；以上均为自定 proxy`). Reference handling is honest.
- **`2048×1024 proxy` (badge) — not implemented.** `scene.json` declares `raster.master =
  2048×1024`, but the only texture created is a 1280×720 canvas (`SOURCE_WIDTH/HEIGHT`,
  main.js:15-16), and the walls are 2:1 while the source is 16:9, sampled with no aspect correction
  (`uv = vUv*uScale + uOffset`). So the advertised raster is never produced, and the join does put
  a 2:1 image on a 16:9 source with non-uniform stretch. `reference.md` §3 additionally lists a
  `Preview master 2560×1440` output spec; the delivered file is 1578×802.
- **"一块屏 2048 px across 18 m" is ~88 px/m; the delivered stills show the source's 1 px dots
  blown up** — the grid/dot detail is a *shader* overlay (26×13 cells per wall, main.js:262), not
  the raster, so the perceived pixel pitch belongs to the shader, not to the stated raster.
- `v1-director-32s.mp4` **includes the full HUD and the four-view quad** (verified at t=4/16/20/28).
  It is a screen capture of the interactive page, not a clean director output. Nothing in the
  delivery folder claims otherwise, but the filename implies a director pass.
- **`STREAM FALLBACK` is not a fallback render.** `scene.json` promises
  `fallback: {type:"local-loop", id:"screen-fallback-loop"}`; main.js implements the drop by
  *skipping* `source.draw` (main.js:588-590) and setting `uFeed = 0.45`, so the walls show a frozen
  last frame, dimmed. The declared local-loop fallback source does not exist in the code.
- **Two independent pictures are the same picture.** At LOW the right wall is not a different
  picture; it is the same source at 0.58 scale with offset (0.21,0.30) (main.js:306-309). There is
  no second source anywhere in the demo.
- Camera labels: `3·左前 35°` checks out — position (−17,4.5,7) → target (0,4.5,−6) is 37.6° off
  the stage axis (the position vector from the target is 52.6° off that axis), either of which is
  close enough to the label. `eyeHeightM` is present for DJ_FRONT (2.2) and STAGE_LEFT (4.5) but null for FOH_WIDE and
  HIGH_WIDE, so "viewing positions given a clear scale" is only half-provided.
- `DJ 平台 6×4m` — the mesh is a 3-sided cylinder r=3.46 scaled 0.85 in z (main.js:193-199): a
  triangle with 6.0 m circumscribed width but only 4.0·(something) depth, hard to reconcile with a
  6×4 rectangle footprint, and unreadable as a triangle in the renders (it reads as a black slab).
  The triangle *fact* is referenced (The Desert Sun); the 6×4 m is proxy, correctly labelled.

## G. LIMITS

- The three reference screenshots in `reference/_local/` (Vita Motus, Jake Halbakken, press page)
  cannot be authenticated; I verified only that `reference.md` quotes them consistently and that
  the live URLs are cited. I did not fetch the reference URLs to re-verify the quotations or the
  HTTP status claims.
- I could not play the video; findings about the recording come from 8 extracted frames
  (t=4,8,12,16,20,24,28,31) plus its ffmpeg metadata.
- The recording's own drop event time is inferred from HUD text at frame granularity, so the exact
  moment `?drop=1` was pressed is not known — I did not reproduce `?drop=1&dropAt=` live.
- I did not test interaction (buttons, keyboard 1–4/space/d/p, OrbitControls), mobile layout,
  or WebXR; no performance/frame-rate measurement was made.
- Measured brightness figures are region means over the content band of a specific frame and are
  affected by the HUD/quad overlays where they overlap; they are used only as magnitudes.
- The projection model was validated against an independent three.js render of the same geometry
  (agreement ≈2 px), but all screen-space numbers are for a 1600×900 viewport with the presets in
  `scene.json`; other viewports change them proportionally.

---

# 构建者的裁定（LEAD / BUILD）

以下由**构建者**（不是评审者）写下，用于区分"外部观看者的判断"与"构建者的回应"。本文件 §A–§G 由独立 agent 原样保留，未经修改。

## 1｜我接受的主要发现（都是我判断错的地方）

| # | 发现 | 我的核实 | 裁定 |
|---|---|---|---|
| B1 | PEAK 的"合成"被 168 px（≈5.6 m）黑场劈开，而每侧可见的半地标只有 90 px | 几何自检：两屏内缘在 x=±(13−9·cos18°)=±4.44 m，中央缺口 8.9 m，**缺口比地标本身还宽** | **接受。** 这是本轮最严重的问题：join 是我这个 Demo 的全部意义，而它在画面上不成立 |
| B2 | join 只在 FOH_WIDE / HIGH_WIDE 这两个**非人类机位**上可读；DJ_FRONT 把两屏都裁出画外 | 与 `stills/v1-dj-peak.png` 一致 | **接受。** 两个"人站的位置"里反而读不到核心关系 |
| B3 | performer 站在墙面前方 10 m（平台在原点、屏在 z=−10），不在两屏"之间" | 参考原文是 "artists performing **in the middle**"；我把墙放在人身后，读起来是"常规舞台+身后两块屏" | **接受，且这是对参考的误读。** 参考确认的是"人夹在两块墙中间" |
| B4 | 尺度只有 HUD 文字；三个机位 `eyeHeightM: null` 浮在 6.5 m / 26 m | scene.json 属实 | **接受。** 预演的意义是从观看位置判断，浮空机位削弱了这个主张 |
| C | LOW 的"两块独立"其实是**同一张画在不同比例**——代码里确实只有一条源 | 代码属实；但 brief 的 checklist 明确允许"同一 source 可通过 crop / UV / offset 形成两种构图" | **接受问题的实质，纠正定性：** 不违反 brief，但**没有通过"看起来是两块不同内容"的可读性测试** |
| D | 四状态不是四种构图；LOW 与 RELEASE 近似重复（5%/15%、0.16/0.24、0.46/0.52） | 参数属实；且 brief 对 RELEASE 的定义是"**一侧先退**、中心保留"，我只做了整体变暗 | **接受，且这是漏实现了 brief 的一条明确要求** |
| F | 角标 `2048×1024 proxy` 未实现（实际源 1280×720）；18×9 m 是 2:1 而源是 16:9，**没有做宽高比校正** | 着色器 `uv = vUv * uScale + uOffset` 直接采样，uScale 初始 (1,1) → 源被横向拉伸约 12.5% | **接受。** 屏幕 2:1、源 16:9，映射是错的 |
| F | `fallback` 声明了 `local-loop`，实现却是"冻结 + 变暗"（跳过 `source.draw`） | 代码属实 | **接受。** 声明与实现不符 |
| F | 名为 director 的录屏含完整 HUD 与四分屏，是交互页面录屏而非干净导播输出 | 属实（我当时的意图是留评审证据，但命名与用途不符） | **接受。** 交付版必须用 `?hud=0&quad=0` 单独出 |

## 2｜我对评审的一处细化（不是否证）

评审说 PEAK 时两屏是"identical mirrored crops"。机制上更准确的说法是：左屏取同一张图的 u∈[0,0.5]、右屏取 u∈[0.5,1]，是**互补的两半**而不是镜像。但由于我选的地标是一个**对称的椭圆**，互补的两半看起来就像镜像——所以评审的观察在效果上是对的，而根因是**地标选了对称形状**。这直接指向 V2 的做法：换一个**非对称**地标，"合成"才可能被证明而不是被推断。

（对照 Sphere 的评审：那次它有一条基于弧度/角度混淆的错误结论，我否证了。这次我复核了它每条可查的断言，**没有发现错误**。）

## 3｜V2 范围（至少改两项，此处确定三项）

| 轴 | 改动 | 对应发现 |
|---|---|---|
| **观看关系** | ①把 performer 与三角形平台移到两屏**之间**（而不是屏前 10 m）；②收窄中央缺口，让合成后的两半在视觉上接近相接；③重排四个机位：DJ_FRONT 必须同时看到两屏内缘，高位机位给出真实眼高而不是浮空 | B1 / B2 / B3 / B4 |
| **构图面积** | ④把源改成 **2:1** 与 18×9 m 屏幕一致，修掉横向拉伸；⑤换**非对称**地标，使"合成一个整体"可被证明；⑥LOW 让两屏读起来确实是两块不同内容（不同相位/取向，而不只是不同比例） | F / C / F(地标对称) |
| **状态节奏** | ⑦按 brief 实现 RELEASE 的"**一侧先退**、中心保留"，让它与 LOW 真正不同 | D |

**明确不改：** cue 总长（32 s）、四状态命名与顺序、proxy 尺寸体系（除宽高比修正外）。

**另外要修的实现问题（不算 V2 设计改动，属于声明与实现对齐）：**
- `fallback` 要么真的实现本地 loop，要么把 manifest 改成如实描述"冻结 + 变暗"；我选择**实现真正的 fallback loop**，因为 brief 要求"fallback loop if source disconnects"。
- 交付录屏改用 `?hud=0&quad=0` 单独出干净 Program 输出。
