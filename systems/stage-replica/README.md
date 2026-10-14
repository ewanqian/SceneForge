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

Sphere is the only demo started.

- `REFERENCE` — done. Confirmed/proxy separated; one dead reference URL found and replaced; two
  wordings in the brief were not supported by the official source and were corrected.
- `GRAYBOX` — done. Hemisphere, floor, stage, performer scale, radial scale grid, four camera
  definitions.
- `V1` — in progress. Dome mapping, four cue states, one own procedural source with fallback, four
  viewpoints, quad preview and program out are running. The recording path is not yet verified.
- `REVIEW`, `V2`, `DELIVERY` — not started.
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
?record=1      deterministic 32 s single pass at a fixed step
```

## Acceptance harness

### H0 — structure readable

At `?t=4` a first-time viewer should read "people inside a curved surface" without explanation.

### H1 — scale traceable

Every dimension is traceable to the proxy table. The performer is `1.7 m`; audience eye height is
`1.6 m`; a `5 m` scale bar sits on the floor.

### H2 — four states differ by occupied area

`HORIZON` ≈ 3% (a low front band), `ENCLOSE` ≈ 27%, `FULL_FIELD` = 100% wrap, `APERTURE` = a single
centred opening. The difference must come from composition and density, **not** from swapping in
unrelated media.

### H3 — own content really enters the stage

The screen content is generated in-page (`canvas` source) and mapped through the dome UV path. V1
uses only the local source; `file` / `capture` / `webrtc` are specified in the brief but are not in
the V1 scope.

### H4 — source loss is not a blackout

`d` or `?drop=1` moves the stream `live → fallback → offline`. `fallback` dims and keeps the last
frame; `offline` stops drawing and holds the last frame rather than clearing to black.

### H5 — director layer

Quad preview shows all four presets; the program camera is outlined; `AUDIENCE_CENTER` is the
default program source, and `DEBUG_ORBIT` is the only orbit-controlled view.

## Known gaps

1. `STAGE_LOOKBACK` has no scale anchor: the performer sits at that camera's origin and is therefore
   invisible. The view reads space but not scale.
2. In `front-window` mode the fitted source window covers only part of the azimuth span, so the dome
   behind the audience stays empty. This is mode semantics, not a state defect — and the HUD now
   reports *state occupancy* and *window coverage* separately because reporting only the first made
   the numbers disagree with the picture.
3. `FULL_FIELD`'s procedural lattice reads similarly to the dome's own wireframe geometry, so
   "projected content" can be mistaken for "model wireframe".
4. `APERTURE` is a soft-edged bright patch rather than something that reads as an opening.
5. The recording path (in-page `MediaRecorder` or CDP frame capture) is unverified, so no V1
   recording exists yet.
6. `center-1to1` / `pixel-1to1` LED pixel-grid fit modes are not implemented here; a dome has no
   rectangular pixel grid. They remain relevant to the plane and cylinder demos.

## Failure behaviour

The stream state machine is `idle → armed → connecting → live → fallback → offline`. Since V1 has no
remote source, the transitions after `live` are driven locally by the `d`/`?drop` control. The
intended production path is the same state machine fed by `canvas.captureStream()` or
`getDisplayMedia()`, with WebRTC only for cross-device sources.
