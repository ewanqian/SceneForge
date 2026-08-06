# SceneForge platform architecture — August 2026

## Decision

Use **Three.js as the rendering substrate** and **React Three Fiber as the product shell**.

- Three.js keeps the renderer portable and prevents the product from becoming dependent on a proprietary editor.
- R3F makes catalog UI, cue/state orchestration, collaboration panels and application routing easier to maintain.
- The repository uses ESM, not CommonJS. Current Three.js addons, Vite and WebGPU-oriented modules are designed around native ES modules.

## Runtime profiles

| Profile | Renderer | Targets | Status |
|---|---|---|---|
| `webgl2-xr` | Three.js `WebGLRenderer` through R3F | Vision Pro Safari, Quest Browser, desktop/mobile fallback | Stable baseline |
| `webgpu-flat` | Three.js `WebGPURenderer` + TSL | Desktop Safari/Chrome/Edge | Planned experiment |
| `webgpu-xr` | WebGPU + WebXR binding | visionOS Safari and engines with verified support | Evaluation gate |
| `apple-immersive-model` | HTML `<model>` + USDZ + `requestImmersive()` | visionOS 27 Safari | Apple-specific asset path |
| `native-openxr` | Native engine adapter | PC VR / installation runtime | Future, outside browser bundle |

Three.js WebGPU can fall back to WebGL2, but its TSL/post-processing path is not a drop-in replacement for existing `ShaderMaterial` and EffectComposer code. The current R3F stable branch is therefore kept on WebGL2 for WebXR. WebGPU work should be isolated behind a renderer adapter and tested separately.

## Apple Vision Pro strategy

SceneForge has four layers rather than one claimed “Vision Pro mode”:

1. **Standard web window** — catalog, metadata, video, controls and 3D canvas.
2. **WebXR immersive VR** — a venue-scale interactive application entered from Safari, using WebXR input that works with gaze + pinch/transient pointer behavior.
3. **Immersive website environment** — on visionOS 27, an optimized USDZ environment can be previewed with HTML `<model>` and opened around the Safari window with `requestImmersive()`; this is useful for venue tours and seat/stage viewpoints, but is not a replacement for the interactive R3F runtime.
4. **Apple object fallback** — USDZ/HTML `<model>`/Quick Look links for object-centric scenes, products and marketing views across Apple platforms.

Do not promise browser passthrough AR until Apple exposes a production `immersive-ar` path. Keep the non-XR, model-element and Quick Look fallbacks usable.

## Scene catalog

The current `VenueManifest` is the first version of a headless scene catalog. A production service should store:

- manifest JSON and revisions;
- GLB/glTF geometry with Meshopt/Draco where appropriate;
- KTX2/Basis textures;
- optional USDZ exports for Apple surfaces and immersive website environments;
- HLS/WebRTC media descriptors rather than raw NDI addresses;
- camera presets, cue/state data and access policy;
- measured/surveyed provenance for venue dimensions.

The first deployment can remain static. The next backend should expose a small API and object storage instead of introducing a large CMS before the viewer workflow is proven.

## Media path

```text
Local file ───────────────────────────────► HTMLVideoElement ► VideoTexture
NDI source ► trusted local bridge ► WebRTC ────────────────► VideoTexture
VOD asset  ► object storage/CDN ► HLS/MP4 ────────────────► VideoTexture
```

The browser cannot directly discover NDI sources. A show-network bridge must run on a trusted machine, select the NDI source, convert it to a browser transport, and expose health/latency status. WebRTC is preferred for interactive preview; HLS is a fallback for remote review.

## Rendering budgets

- Use geometry LOD and asset streaming before adding more post-processing.
- Keep a low-power profile without planar reflection, dynamic shadows or high DPR.
- Use one primary screen-video texture per venue in the first milestone.
- Treat planar reflection as a preview effect, not physically accurate SSR.
- Reserve true SSR/SSGI/compute effects for a WebGPU desktop profile with explicit benchmarks.
- XR UI must be rendered in 3D or use platform-supported interaction; do not rely on dense DOM overlays in immersive mode.
- USDZ immersive environments need separate vertex/entity, texture and decode budgets; they should be exported from the same source scene but optimized independently from GLB.

## Automation and approval

The repository contains machine-readable instructions (`AGENTS.md`, Copilot instructions), structured issue forms and a deterministic quality gate. Recommended GitHub settings:

1. Require the `quality-gate / verify` check on `main`.
2. Require one human approval for renderer, media bridge, security and deployment changes.
3. Enable automatic Copilot/Codex review as an additional reviewer, not the only approval.
4. Enable squash merge and auto-merge after required checks/approval.
5. Group dependency updates; auto-merge only patch updates after CI is proven reliable.
6. Keep show-critical release tags manually promoted even when development PRs are automated.

This allows agents to implement bounded issues and iterate on PR comments, while deterministic checks and explicit ownership prevent an AI reviewer from silently approving a broken show build.

## Competitive position

SceneForge should not compete with Spline as a general 3D authoring tool. Its defensible advantage is domain-specific infrastructure:

- a reusable venue/installation library;
- accurate screen, projector, camera and audience metadata;
- cue/state comparison and version review;
- local show-network media bridging;
- WebXR review on Vision Pro/Quest from the same URL;
- Apple immersive website environment exports from the same venue source;
- future OSC/MIDI/DMX/NDI adapters;
- project archive and communication workflow around each venue.

Spline, PlayCanvas, Needle and Wonderland are useful authoring/runtime references. SceneForge wins only if it understands performance rehearsal and venue operations better than a generic web-3D editor.
