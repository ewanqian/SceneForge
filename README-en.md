# SceneForge

SceneForge is a browser-first venue catalog and stage previsualization tool for live performance, installations and immersive media.

The first runnable foundation includes venue switching, camera presets, cue/state changes, local video mapped onto a stage screen, optional planar floor reflection, runtime capability detection and a WebXR entry point for Apple Vision Pro and Meta Quest.

The current BO Live House and UFO Terminal scenes are illustrative geometry, not construction surveys.

## Stack

- Three.js rendering foundation
- React + React Three Fiber application layer
- WebGL2 as the stable WebXR profile
- WebGPU as progressive enhancement behind a future renderer adapter
- WebXR for browser XR; OpenXR belongs to a future native adapter
- WebRTC/HLS/local files for browser media; NDI requires a trusted local bridge

## Run

```bash
npm install
npm run dev
npm run verify
```

See [the August 2026 architecture decision](docs/platform-architecture-2026.md) and [the media bridge design](docs/media-bridge.md).
