# ENTROPY Stage WebRTC Preview Harness

## Purpose

A focused SceneForge experiment for the 2026-09-05 ENTROPY performance venue. The goal is to let a source computer pick a desktop window/screen and map that live source into a simplified 3D model of the venue, then inspect the same room from desktop or Apple Vision Pro WebXR.

This follows the repository boundary in `AGENTS.md`: Three.js / Needle / WebXR, versioned scene assumptions, and browser-safe WebRTC capture. It does not claim browser-native NDI.

## Confirmed screen data

### Main curved LED

- native raster: `9600 × 3456`
- ratio: `25:9`
- area: `84 m²`
- straight-line/chord width: `12.4 m`
- arc width: `15.2 m`
- height: `5.5 m`
- venue ceiling clearance: `5.7 m`

The prototype derives an approximate circular arc from the supplied arc/chord pair:

- central angle ≈ `2.15 rad` / `123.2°`
- radius ≈ `7.07 m`

This is a previsualization approximation, not construction geometry.

### Ceiling LED

Confirmed:

- area: `35 m²`
- supplied content mapping: `1920×1080 input → 960×1080 output`

Measured physical width/depth were not supplied. The prototype therefore estimates a `5.58 × 6.27 m` rectangle by combining the 35 m² area with the 960:1080 aspect ratio. Replace these numbers when measured dimensions arrive.

## Media mapping

```text
Mac / Windows selected window or display
            ↓
Needle ScreenCapture / WebRTC room
            ↓
full source texture
            ↓
Main curved LED (full frame)
            ↓
Ceiling LED (centre-half crop: U 0.25–0.75)
            ↓
Desktop viewer / Vision Pro WebXR
```

The ceiling screen intentionally receives the centre half of the shared source, matching the supplied `1920→960` horizontal crop concept. It does not run an independent live-media pipeline.

## Runtime entry

`/entropy-stage/`

The room URL is stable through the `?room=` parameter. Open the same room URL on the source computer and Vision Pro.

## Controls

- **Pick Window / Screen** — invokes the browser/system screen picker; choose the Processing/Arena/browser window to test.
- **Stop Share** — stops the live capture.
- **Front View** — front-of-house composition check.
- **Wide View** — venue/surface relationship check.
- **Stage View** — stage-side/parallax check.
- **Toggle Ceiling** — isolate the curved main screen when needed.
- **Copy Room Link** — sends the exact room URL to another device.

## Acceptance harness

### H0 — secure capture

- HTTPS or localhost.
- Clicking **Pick Window / Screen** must open the browser/system picker.
- A selected moving source must remain live on the main LED.

### H1 — stage geometry

- Main LED is visibly curved and uses the supplied 15.2 m arc / 12.4 m chord / 5.5 m height proportions.
- Ceiling surface is separate and overhead.
- Floor and stage geometry remain explicitly illustrative.

### H2 — mapping

- Main LED shows the complete source.
- Ceiling shows the centre 50% of the source horizontally.
- The same source is used for both; no second capture permission is requested.

### H3 — WebRTC / WebXR

- A second client joining the same room can see the live stream.
- Vision Pro Safari can enter immersive VR.
- Primary real-device test: video texture continues updating after entering WebXR.

### H4 — source formats

Useful test sources:

- browser visual prototype
- Processing output window
- Resolume Arena output preview
- NDI virtual camera via Camera route in the existing `/needle-room/` experiment

This stage preview deliberately prioritizes screen/window capture, because the current request is to inspect an arbitrary application window in the modeled venue.

### H5 — failure / fallback

If WebRTC room sync fails, the source computer should still show its local capture. If Vision Pro WebXR video refresh fails, record browser/visionOS version and test the same room in non-immersive Safari to separate XR texture-refresh problems from networking problems.

## Cloudflare Pages target

Recommended test hostname: `stage.ewanqian.site` (or another subdomain under the user's existing domain).

Build settings:

```text
Framework preset: Vite
Build command: npm run build
Output directory: dist
Node: 20+
```

After deployment, the direct test route is:

```text
https://<host>/entropy-stage/
```

Cloudflare must serve the page over HTTPS for `getDisplayMedia` / screen capture.
