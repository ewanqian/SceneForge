# SceneForge Package v1

Status: first reviewable slice for issue #9.

## Boundary

SceneForge Package v1 is renderer-neutral product data. The core schema owns metadata, assets,
screens, cameras, spawn points, cue sets and quality profiles. Runtime-only data belongs in an
`extensions` object whose keys use a dotted namespace such as `org.example.runtime`. A runtime may
read its own namespace, but it may not require that namespace for a package to remain valid.

This slice intentionally does not define projectors, navmeshes, audio zones, interactions,
networking, participants or media tracks. Those remain deferred acceptance criteria for later
reviewable slices of #9 and its dependent issues.

## Units and coordinates

- Linear values are metres.
- Coordinates are right-handed with `Y` up and `-Z` forward.
- Transform rotation values are Euler angles in radians, ordered X, Y, Z.
- Scale is unitless and defaults to `[1, 1, 1]`.
- Camera vertical field of view is in degrees.
- Screen size is `[width, height]` in metres. Curvature is normalized from `0` (flat) to `1`
  (runtime-defined maximum curvature); runtimes must fall back to a flat surface if curved geometry
  is unsupported.

Blender exports should use metres, apply object scale before export, preserve the Y-up conversion
performed by glTF export, keep stable lowercase asset and material-slot names, and orient authored
content so the intended audience view faces toward `-Z`.

## Directory convention

```text
package-root/
├── sceneforge.package.json
├── assets/
│   ├── models/        # .glb primary geometry
│   ├── textures/      # .ktx2 textures
│   ├── usdz/          # .usdz delivery assets
│   ├── posters/       # image fallbacks
│   ├── video-proxies/ # review-safe proxy media
│   └── metadata/      # generated reports and sidecar data
└── README.md          # optional package notes
```

Asset URIs are relative to `package-root` and must not start with `/` or contain a `..` segment.
HTTPS URLs are accepted for migration and externally hosted assets, but a self-contained package
should use relative paths. Identifiers are stable across revisions; filenames may change when their
content hash changes.

## Runtime adapter

`RuntimeAdapter` is the minimal shared boundary for loading a package, applying a cue, selecting a
camera, binding a browser-safe media source to a screen, reporting WebXR capabilities and disposing
the scene. `R3FRuntimeAdapter` is a reference skeleton that delegates renderer work to an injected
R3F port. This keeps React and Three.js implementation details out of the portable contract.

The adapter does not define networking or enter XR sessions in this slice. Capability reporting is
descriptive; the existing viewer remains responsible for user-initiated WebXR entry and keeps its
WebGL2 fallback.

## VenueManifest migration

`migrateVenueManifestToPackageV1` preserves current cameras and cues, creates one portable screen,
uses the first camera as the deterministic default spawn point, converts legacy asset URLs, and
places legacy venue-only fields under `org.sceneforge.legacy-venue`. The result is validated before
it is returned. Existing `VenueManifest` consumers are unchanged, so this migration is an additive
upgrade path rather than a forced runtime cutover.
