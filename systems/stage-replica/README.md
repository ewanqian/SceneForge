# Stage Replica Demo Sprint

## Purpose

A SceneForge experiment for the 2026-10-31 workshop 《舞台复刻 / Stage Replica》, whose premise is
**"在真正进场之前，先把演出跑一遍"** — build a low-fidelity version of a stage, actually run it,
watch it, find what does not hold, then change it.

Four demos, in production order:

| Demo | Shape | Priority |
|---|---|---|
| Sphere / Immersive Dome | hemisphere wrap | P0 |
| Festival / Two-Wall Stage | two inward-angled LED walls | P1 |
| Installation / Black Box | one frontal projection (optional floor) | P2 |
| Stadium / 360° Concert | circular stage + cylindrical LED | P3 |

Each demo must carry one pipeline: `reference → graybox → V1 → watch/review → V2`. A finished
render is not the deliverable; a preserved V1, a list of what V1 revealed, and a V2 that answers it
are.

Production requirements live in the portfolio repo:
`workshops/audiovisual-engineer-simulator/stage-replica/dsh-production-brief.md`.

## Scope boundary

This sits inside the `AGENTS.md` product boundary (scene viewer and stage previsualization service:
choose a venue, load a scene, switch cameras and cues, put video on a screen).

**Known schema gap:** `venueManifestSchema` currently models `layout: "box" | "arena"` with exactly
one rectangular/curved `screen`. A dome, a two-wall stage and a cylindrical LED ring do not fit it.
Those three demos therefore live as bespoke static pages under `public/stage-replica/<demo>/`, the
same pattern already used by `public/entropy-stage/` and `public/needle-room/`. Extending the venue
schema to `screens[]` with `shape` is the cleaner long-term fix and is **not yet decided**.

## Runtime entry

- Review board: `/stage-replica/`
- Sphere demo: `/stage-replica/sphere/`
- Shared fit math: `/stage-replica/shared/fit-math.js`

## Confirmed data vs teaching proxy

Nothing here claims real venue construction dimensions.

**Confirmed (quotable from official sources):** Sphere Studios Media Plane is `16k × 16k`, over
`3 acres` of display surface, and *"wraps up, over and around the audience"*. STUFISH's Anna Vissi
OAKA stage is in the round with a `⌀30 m` circular stage and a `⌀20 m` cylindrical LED. Ryoji Ikeda's
`data-verse` specifies a DCI-4K DLP projector, computer and speakers, with a minimum display size of
`W10.24 × H5.4 m`.

**Teaching proxy (invented for previs, must stay labelled):** Sphere dome radius `25 m`, audience
floor `⌀34 m`, stage platform `14 × 8 m` (height `0.9 m` is ours; the brief gives no height), eye
height `1.6 m`, media proxy `4096² / 2048²`.

## Current state

Three demos are in flight; Sphere is complete.

### Sphere (P0) — complete

- `REFERENCE` — done. Confirmed/proxy separated; one dead reference URL found and replaced; two
  wordings in the brief were not supported by the official source and were corrected.
- `GRAYBOX` — done. Hemisphere, floor, stage, performer scale, radial scale grid, four camera
  definitions.
- `V1` — done and frozen (`v1-freeze.json`). Dome mapping, four cue states, one own procedural source
  with fallback, four viewpoints, quad preview and program out all run; a 32 s pass is recorded
  (`sphere/delivery/v1-sphere-32s.mp4`) via the CDP recorder in `tools/record-cdp.mjs`.
- `REVIEW` — done. An independent review agent watched V1; its findings and the builder's
  adjudication (including two findings refuted with arithmetic) are in `review-v1.md`.
- `V1.1` — review fixes applied without overwriting V1: true dome-coverage metric, the 5 m scale bar
  actually renders, accurate raster badge, reference link, and a scripted director pass
  (`?cuts=1`) recorded as `sphere/delivery/v1.1-director-32s.mp4`.
- `V2` — done. Exactly two axes changed, timing left untouched so the improvement stays
  attributable: the media window now follows the viewer's azimuth (`uAzCenter`) instead of a fixed
  world front, the program framing was raised so the image actually fills the frame, three 1.7 m
  scale posts were added, `HORIZON` was widened and brightened, and `APERTURE` got a defined edge
  plus a rim. Measured lit area: FULL_FIELD 69.7% → 84.8%; STAGE_LOOKBACK at FULL_FIELD 21.0% →
  87.9%. See `review-diff-v1-v2.md`.
- `DELIVERY` — done. 28.2 s delivery cut (`sphere/delivery/v2-promo-28s.mp4`), the
  `reference → graybox → V1 → V2` comparison sheet
  (`sphere/delivery/reference-graybox-v1-v2.png`), and the answers to the brief's seven
  questions in `review-v1.md` §5 and `review-diff-v1-v2.md` §6.

### Festival / Two-Wall Stage (P1) — V2 done, delivery in progress

- `REFERENCE` — done. All three Vita Motus / Quasar links verified live. The brief's
  description checks out, and two details are corrected or added: the centre element is
  confirmed as a **triangular** DJ stage, and playback runs on **X-Live + Unreal Engine**.
  The reference publishes **no dimensions**, so every number is a teaching proxy,
  including the 18° inward angle.
- `GRAYBOX` + `V1` — done and frozen. Two 18x9m walls, a triangular platform and a
  performer between them; `join` (0 = two independent pictures, 1 = one continuous
  picture) is the demo's single variable.
- `REVIEW` — done, and it was the most productive step in the project. The independent
  agent found that the join **did not hold on screen**: the two half-landmarks were
  separated by 168 px of black while each half was only ~90 px. It also found the
  performer standing 10 m *in front of* the wall plane rather than between the walls
  (a misreading of the reference), that `join` was legible only from two non-human
  cameras, that RELEASE did not implement the brief's "one side retreats first", that the
  2:1 screens were fed a 16:9 source with no aspect correction, and that the declared
  `local-loop` fallback was really a frozen frame. Full report and the builder's
  adjudication: `review-festival-v1.md`.
- `V2` — done. The performer moved into the throat of the V, the inner edges closed from
  8.9 m to 3.28 m, the landmark became an **asymmetric diagonal** so the join is provable
  rather than inferred, the source became 2048x1024 (2:1) matching both the screens and
  the advertised raster, the independent state flips the right wall so the two walls read
  as different pictures, RELEASE retreats one side first, and the fallback is a real
  moving loop. See `review-diff-festival-v1-v2.md`.
- `DELIVERY` — in progress. Clean 32 s director output
  (`festival/delivery/v2-director-clean-32s.mp4`), a 28 s delivery cut, and the
  `reference → V1 → V2` comparison sheet exist.

### Installation / Black Box (P2) — V1 done, review next

- `REFERENCE` — done. Both official links verified; the brief's two technical claims are
  verbatim primary source (`DCI-4K DLP projector, computer, speakers` and
  `dimensions variable (minimum: W10.24 x H5.4m)`). 4096x2160 is recorded as a derivation
  from the confirmed DCI-4K projector, not a quotation.
- `GRAYBOX` + `V1` — done. A 48 s cue (duration is the variable this demo tests), a
  rule-based source sampled at four densities, and AFTERIMAGE implemented as a real
  residual rather than a lower density. Audio is **not** implemented and is recorded as a
  known gap.
- `REVIEW`, `V2`, `DELIVERY` — not started.

### Stadium / 360° Concert (P3)

Not started. It is the last demo and the only one that carries Quad Preview / Program Out
and multi-camera directing as its main subject.

## Shared engineering conventions

Established by Sphere and reused by the later demos:

- the runtime lives in this repository under `public/stage-replica/<demo>/`;
- `scene.json` follows one manifest shape (`screens[] / cameras[] / states[] / programCamera`),
  with geometry in data and cue behaviour in code, per `AGENTS.md`;
- `../shared/fit-math.js` is the single place media fits a surface;
- every demo accepts the same deterministic review parameters (`?t=`, `?view=`, `?quad=`,
  `?hud=`, `?drop`, `?dropAt=`, `?record=`, and `?cuts=` where directing applies), so a
  reviewer can address an exact frame without operating the UI;
- recordings are produced by `tools/record-cdp.mjs` (CDP screencast + ffmpeg), gated on
  `__REPLICA_READY__` / `__REPLICA_DONE__` so load time is excluded and the clip matches the cue;
- V1 is never overwritten: each revision keeps its own recording and stills;
- review scratch is gitignored **and** excluded from biome, because biome lints HTML and a
  reviewer's throwaway `.html` can otherwise fail CI.
- Festival / Installation / Stadium — not started.

## Controls

| Input | Effect |
|---|---|
| `1`–`4` | cut program to a camera preset |
| `Space` / `0` | back to `programCamera` |
| `m` | cycle the 16:9 adaptation mode |
| `d` | simulate the media source dropping (live → fallback → offline) |
| `p` | pause / resume the cue |

Adaptation modes: `front-window` (source occupies a front window — "the screen has not opened yet"),
`mirror-extend` (low-fi horizontal mirroring), `shader-fill` (source luma drives a procedural field),
`square-master` (source treated as a 1:1 master across the dome).

## Deterministic review links

The page accepts query parameters so a reviewer can jump to an exact frame without operating
anything:

```text
?t=<seconds>   seek the cue and hold
?view=<id>     AUDIENCE_CENTER | AUDIENCE_LEFT | STAGE_LOOKBACK | DEBUG_ORBIT
?mode=<id>     front-window | mirror-extend | shader-fill | square-master
?quad=0|1      quad preview
?hud=0|1       chrome (for clean capture)
?drop=1        hold the source in fallback
?dropAt=<sec>  drop the source at a cue time (used by the recorded pass)
?cuts=1        run the scripted director pass across the cue
?record=1      play the cue once in real time and stop (for recording)
```

## Acceptance harness

### H0 — structure readable

At `?t=4` a first-time viewer should read "people inside a curved surface" without explanation.

### H1 — scale traceable

Every dimension is traceable to the proxy table. The performer is `1.7 m` with an in-frame height
rule; audience eye height is `1.6 m`; a `5 m` scale bar is drawn on the floor. Note that the
performer is still only ~30 px wide in the program view — traceable, but not yet readable, which is
a V2 item.

### H2 — four states differ by dome coverage

Measured as a fraction of the hemisphere surface (solid angle), not as an angular product:
`HORIZON` ≈ 0.8%, `ENCLOSE` ≈ 17%, `FULL_FIELD` = 100%, `APERTURE` ≈ 4.6%. The difference must come
from composition and density, **not** from swapping in unrelated media.

### H3 — own content really enters the stage

The screen content is generated in-page (`canvas` source, 1280×720 in V1) and mapped through the dome
UV path. The `4096² / 2048²` figures are the proxy **master specification**, not a raster that V1
renders. V1 uses only the local source; `file` / `capture` / `webrtc` are specified in the brief but
are not in the V1 scope.

### H4 — source loss is not a blackout

`d`, `?drop=1` or `?dropAt=<sec>` moves the stream `live → fallback → offline`. `fallback` dims and
keeps the last frame; `offline` stops drawing and holds the last frame rather than clearing to black.
This is visible inside the recorded V1.1 pass at 30 s.

### H5 — director layer

Quad preview shows all four presets; the program camera is outlined; `AUDIENCE_CENTER` is the
default program source, and `DEBUG_ORBIT` is the only orbit-controlled view.

## Deliverables

Sphere (P0) is complete end to end. Everything below is served from
`/stage-replica/sphere/` and listed on the review board at `/stage-replica/`.

| Artifact | What it is |
|---|---|
| `sphere/delivery/v2-promo-28s.mp4` | 28 s delivery cut (all four states, four camera cuts) |
| `sphere/delivery/v2-director-32s.mp4` | full V2 pass: four camera cuts plus a source drop at 28 s |
| `sphere/delivery/reference-graybox-v1-v2.png` | comparison sheet: reference → graybox → V1 → V2 |
| `sphere/delivery/v1.1-director-32s.mp4`, `v1-sphere-32s.mp4` | retained V1 revisions, never overwritten |
| `sphere/stills/v2-*.png`, `v1-*.png` | state frames for both revisions |
| `review-v1.md` | V1 review: builder findings, the independent review, and the adjudication |
| `review-diff-v1-v2.md` | what V2 changed, what it measured, what it cost, what it deliberately left alone |
| `v1-freeze.json` | V1 file hashes and the recorded run's metadata |
| `review-tools/` | probe scripts used to measure coverage, elevation and lit area |

The brief's seven acceptance questions are answered in `review-v1.md` §5 and
`review-diff-v1-v2.md` §6 (questions 5–7 are answered after V2, since they ask what
V2 changed).

## Known gaps

Open after V1.1, all listed as V2 scope in `review-v1.md` §6:

1. **The program view never gives the media the field of view.** At FULL_FIELD the floor and stage
   still own the bottom ~40%, so the demo's own thesis ("the image occupies the whole view") is not
   exercised from the audience camera. This is the largest gap.
2. `STAGE_LOOKBACK` has no scale anchor: the performer sits at that camera's origin and is therefore
   invisible. The view reads space but not scale. Visible inside the V1.1 recording at 21 s.
3. The performer is ~30 × 97 px in the program view — traceable via the height rule, but not readable.
4. `FULL_FIELD`'s procedural lattice is generated in angle space, so it reads like the dome's own
   wireframe and would not transfer to a real spherical projection.
5. `APERTURE` is a soft-edged bright patch rather than something that reads as an opening.
6. `HORIZON` covers 0.8% of the dome surface, which is arguably below the threshold where a viewer
   can tell there is any content at all.
7. In `front-window` mode the fitted source window covers only part of the azimuth span, so the dome
   behind the audience stays empty. This is mode semantics, not a state defect — the HUD reports
   *dome coverage* and *window coverage* separately for that reason.
8. `center-1to1` / `pixel-1to1` LED pixel-grid fit modes are not implemented here; a dome has no
   rectangular pixel grid. They remain relevant to the plane and cylinder demos.

Fixed during V1.1 (kept for the record): the 5 m scale bar was declared in `scene.json` and cited here
but had no geometry; the `占用` readout was an angular product that misdescribed coverage; the badge
claimed a 4096² runtime raster that does not exist.

## Failure behaviour

The stream state machine is `idle → armed → connecting → live → fallback → offline`. Since V1 has no
remote source, the transitions after `live` are driven locally by the `d`/`?drop` control. The
intended production path is the same state machine fed by `canvas.captureStream()` or
`getDisplayMedia()`, with WebRTC only for cross-device sources.
