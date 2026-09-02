# ENTROPY Mapping Test v1

## Working logical surfaces

### Main
- logical design space: 2500 × 900
- aspect: 25:9
- venue native main LED: 9600 × 3456

### Ceiling
- working mapping-test space: 960 × 1080
- aspect: 8:9
- IMPORTANT: this is provisional.
- It comes from the previously supplied routing reference `1920×1080 input → 960×1080 output`.
- Confirm exact ceiling processor canvas / crop / rotation onsite before final mapping.

## Test modes
1. Grid / geometry: border, center, 5%/10% safe areas, circles for distortion checking.
2. Spatial zones: main FAR L / LEFT / CORE / RIGHT / FAR R; ceiling remains vertical grid.
3. Grayscale / black level.

## Controls
- 1 / 2 / 3 modes
- L labels
- F fullscreen
- S export both canvases as PNG

## Rule
Do not stretch either canvas to fill a different aspect ratio. Scale uniformly and crop/map in Resolume or the LED processor.
