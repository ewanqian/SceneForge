# AGENTS.md

## Product boundary

Build a self-hostable scene viewer and stage previsualization service. The first workflow is: choose a venue, load a scene, switch cameras and cues, put video on a screen, share the result, then optionally enter WebXR.

## Architecture rules

- Use ESM, TypeScript and explicit schemas. Do not convert the project to CommonJS.
- Keep Three.js as the rendering foundation and R3F as the product integration layer.
- Maintain a renderer capability boundary: WebGL2 + WebXR is the stable profile; WebGPU is progressive enhancement and must not remove WebGL2 fallback.
- A web page cannot directly enumerate NDI devices. Use the media bridge contract in `src/lib/media-source.ts`.
- OpenXR belongs to a future native adapter; browser code targets WebXR.
- Scene manifests are versioned and validated at runtime.
- Venue-specific geometry belongs in data/assets, not in the cue engine.

## Commands

- Install: `npm install`
- Develop: `npm run dev`
- Validate: `npm run verify`
- Build: `npm run build`

## Definition of done

A change is done only when it builds, tests pass, fallbacks are described, scene data remains valid, and the PR states how it was tested on desktop/mobile/XR.
