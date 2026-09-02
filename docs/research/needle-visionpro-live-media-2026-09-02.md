# Needle Engine + Vision Pro + live media research

Date: 2026-09-02  
SceneForge track: live media / WebXR / NDI / shared rooms  
Decision state: **prototype approved; production integration not yet approved**

## Research question

Can SceneForge provide a browser-first spatial review room where a Mac/Windows machine sends a screen, camera or NDI-backed video source and an Apple Vision Pro opens the same scene in WebXR, while preserving a path to model loading, multiplayer and self-hosting?

## Short answer

Yes, with one important boundary: **the browser should not speak NDI directly**.

The lowest-risk architecture is:

```text
Mac / Windows source
  |-- browser screen capture -----------------------|
  |-- browser camera -------------------------------|--> Needle ScreenCapture
  |-- NDI -> NDI Webcam/Virtual Input -> camera ----|        |
                                                            WebRTC
                                                              |
                                                     shared Needle room
                                                              |
                                             VideoPlayer -> 3D screen
                                                              |
                                               Vision Pro Safari/WebXR
```

A later production bridge can replace the virtual-camera hop:

```text
NDI source -> trusted native sidecar -> WebRTC/WHEP -> SceneForge MediaStream -> 3D screen
```

This preserves SceneForge's existing media-source contract: the web app consumes browser-standard media; NDI discovery/decoding stays in a trusted native process.

## Needle Engine fit

Needle already has the exact primitives needed for the first proof:

- `ScreenCapture`: screen/window/tab, camera, microphone and experimental canvas capture; networked via WebRTC.
- `VideoPlayer`: accepts URLs, `MediaStream` and HLS; can apply the stream to a 3D material.
- `SyncedRoom`: joins a named room and provides multiplayer room state.
- `Networking`: overrides the default Needle websocket backend for local/self-hosted infrastructure.
- `WebXR`: adds immersive VR and handles XR controls/hand tracking.
- `XRRig`: defines the user's starting transform in XR.
- `AssetReference` / `loadAsset`: runtime GLB/glTF loading from local or remote sources.

Needle's official Screensharing sample explicitly demonstrates a browser meeting pattern: screen/window/webcam shared through WebRTC and displayed on a 3D surface for everyone in the room.

### Version choice

Use **Needle Engine 5.1.5** for the first prototype.

Reasoning:

- 5.1.5 is the latest stable release in the current 5.x line found during this research.
- It includes improved XR networked hand/controller synchronization.
- 5.1.0 added deterministic GUID generation for runtime-added components, which is useful for a code-only networked screen.
- 6.0.0-alpha.3 is newer and updates its bundled Three.js to r185, but it is still an alpha. SceneForge should not make a live-media foundation depend on the alpha line until the stable prototype is validated.

The experiment is therefore isolated under `public/needle-room/` instead of adding Needle to the main R3F dependency graph.

## Apple Vision Pro reality in 2026

Safari on visionOS has supported WebXR `immersive-vr` since Safari 18 / visionOS 2. WebKit documents:

- hardware-accelerated WebXR via WebGL;
- `transient-pointer` for look + pinch;
- WebXR hand tracking;
- immersive VR delivered directly through the web.

WebGPU in WebXR also exists on newer visionOS/Safari releases, but SceneForge should continue treating **WebGL2 + WebXR as the stable compatibility profile**. This matches the existing repository rule and avoids making the prototype dependent on a newer graphics backend.

Interactive WebXR `immersive-ar` is not a dependable Vision Pro target. For passthrough/model-placement workflows, keep a separate USDZ / HTML `<model>` / Quick Look path. For the meeting/viewer use case in this track, `immersive-vr` is sufficient.

## Video-in-XR risk

There is an upstream Needle support issue from 2024 reporting that video textures played in normal Vision Pro Safari but froze to a static frame after entering VR. The issue remains open. A July 2025 comment reports that a newer visionOS beta appeared to fix the problem.

Conclusion: **do not design around the bug, but do not assume it is gone either**.

The v0.2 acceptance test therefore requires a live remote video texture to keep updating in Vision Pro immersive VR for at least 10 minutes. This is the most important device-level test in the first iteration.

## NDI: fastest useful route

SceneForge already correctly states that a normal browser cannot enumerate NDI senders or open an `ndi://` stream.

For immediate prototyping, official NDI Tools provides a better shortcut than writing a sidecar:

- Windows **NDI Webcam Input** converts a selected NDI video/audio source into a standard Windows webcam source.
- macOS **NDI Virtual Input** does the equivalent on macOS.

Because browsers already capture standard cameras, this turns the first NDI test into:

```text
NDI -> official virtual camera -> getUserMedia/ScreenCapture -> WebRTC -> Vision Pro
```

This is not the final production architecture, but it tests latency, image readability, Vision Pro playback and the human workflow immediately.

## Production NDI bridge after v0.2

Only build the native bridge after the virtual-camera route proves the viewing experience.

Recommended contract remains:

```http
GET    /api/media/health
GET    /api/media/sources
POST   /api/media/sources/{id}/session
DELETE /api/media/sessions/{id}
```

A session should return a short-lived browser transport/signaling token. The web UI should receive a standard `MediaStream` or WHEP-compatible stream and pass it to the video surface. Native NDI credentials/discovery must never be exposed to arbitrary browser clients.

## Networking and LAN behavior

Needle uses a managed websocket backend by default, suitable for prototyping and small rooms. It also supports a `Networking` component to point at a custom websocket server.

A completely local show-network deployment needs more than replacing the websocket URL:

- screen capture requires HTTPS or another secure context;
- WebXR deployment should also use trusted HTTPS;
- Vision Pro must trust the certificate used by the local host;
- WebRTC still needs a viable ICE topology; same-LAN peers are the easy case, but production should still define TURN behavior for routed/VLAN/WAN cases.

Therefore the first online test should use GitHub Pages HTTPS plus Needle's managed room service. Self-hosted room infrastructure is a separate acceptance step.

## 3D asset strategy

Primary interactive format: **GLB/glTF**.

Why:

- it is Needle's native web asset path;
- `AssetReference` can load GLB/glTF at runtime from any HTTPS location;
- one-file GLB is easiest for drag/drop and issue reproduction;
- no rebuild is required when the asset is remote.

Secondary Vision Pro delivery:

- HTML `<model>` / USDZ / Quick Look for spatial model presentation outside immersive WebXR;
- not a replacement for the shared meeting room because it does not provide the same live WebRTC surface/multiplayer scene semantics.

Future research can separately test Gaussian splats. Needle 6.x alpha has explicit splat support, but that is outside v0.2.

## Recommended development phases

### v0.2.0 — Needle XR Room scaffold

Goal: prove browser meeting primitives without touching the R3F core.

- named room;
- screen capture;
- camera capture;
- shared 3D video plane;
- Vision Pro WebXR entry;
- reset/reposition screen;
- runtime GLB loading;
- HTTPS deployment path;
- versioned test record.

### v0.2.1 — Physical Vision Pro + NDI virtual input test

Goal: validate the real show-network workflow.

- NDI Screen Capture / Scan Converter source;
- Windows Webcam Input or macOS Virtual Input;
- camera path into Needle;
- measure glass-to-glass latency approximately;
- 10-minute immersive video update test;
- 1080p30 and 1080p60 comparison;
- thermal/frame pacing notes on Vision Pro.

### v0.3.0 — Scene/model synchronization

Goal: move from a shared video wall to a shared review room.

- sync selected asset URL;
- sync screen transform;
- sync scene reset/version state;
- optional synced camera/avatar representation;
- room owner/guest role distinction.

### v0.4.0 — Native NDI media bridge

Goal: remove dependency on a virtual camera and expose multiple NDI sources cleanly.

- native NDI discovery/decoding;
- authenticated source list;
- WebRTC/WHEP browser output;
- health/latency/format metadata;
- reconnect behavior;
- no NDI SDK in public browser bundle.

### v0.5.0 — Self-hosted room / offline show network

Goal: run without Needle managed infrastructure.

- local websocket server;
- trusted local HTTPS;
- WebRTC ICE/TURN plan;
- QR/join workflow on Vision Pro;
- network failure recovery.

## Source record

Primary sources checked on 2026-09-02:

- Needle Engine ScreenCapture API and official Screensharing sample.
- Needle Engine VideoPlayer, SyncedRoom, Networking, WebXR and AssetReference docs.
- Needle Engine changelog (5.1.5 stable; 6.0.0 alpha line noted but not selected).
- WebKit Safari 18 / visionOS WebXR documentation and later WebXR updates.
- Needle support issue #194 and its 2025 follow-up comment.
- NDI Tools 6.3.2 pages for Windows Webcam Input and macOS Virtual Input.
- Existing SceneForge `AGENTS.md`, `docs/media-bridge.md`, and `src/lib/media-source.ts` architecture contracts.
