# SceneForge repository instructions

SceneForge is a browser-first venue catalog and stage previsualization product. The stable runtime is React + TypeScript + React Three Fiber on Three.js. WebXR must remain usable on Apple Vision Pro and Meta Quest through a WebGL2 renderer profile until the R3F WebGPU/XR path is verified in this repository.

## Required workflow

1. Read `AGENTS.md` and `docs/platform-architecture-2026.md` before changing architecture.
2. Keep scene content data-driven through `VenueManifest`; do not hard-code project-specific behavior inside generic renderer components.
3. Run `npm run verify` before completing a task.
4. Add or update tests for cue engine, manifest parsing and other pure logic.
5. Do not claim direct browser NDI or OpenXR support. Browser XR uses WebXR. NDI requires a trusted bridge that converts it to WebRTC, HLS or another browser transport.
6. Mark venue geometry as `illustrative` unless dimensions come from a verified survey/source.
7. Treat Vision Pro as a first-class test target: preserve gaze/pinch-compatible pointer events, readable spatial UI, stable frame pacing and a non-XR fallback.
8. Avoid expensive post-processing by default. New effects require a documented performance profile and a disable path.

## Pull requests

PR descriptions must include intent, validation, device/browser limitations and performance impact. A passing automated review is advisory; required CI checks and human acceptance remain the release authority for show-critical changes.
