# SceneForge Classroom v1

Schema: schema.json. Example: example.json.

Run `npm run classroom:validate -- public/classroom/example.json` in the source repository. Generic JSON Schema validation does not implement runtime convex-corner, area, or camera/venue checks. Use the CLI or `window.sceneForgeClassroom.setState(config)` for complete validation.

Coordinates: meters, right-handed, Y up, forward -Z. Projection corners: normalized TL, TR, BR, BL. Media filename is metadata only. Do not serialize blob URLs.

The classroom configuration is separate from SceneForgePackageV1. Projection output is one local same-origin window, one planar surface, approximate 16×9 triangulated homography, with no hardware calibration guarantee.
