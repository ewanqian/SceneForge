// Stage Replica — shared fit math.
//
// Encodes the media-fit behaviour established twice in this project:
//   - the ENTROPY stage UV mapping work in `public/entropy-stage` (per-surface offset/scale/rotation/flip)
//   - the SceneForge RTC 0.5.0 viewer's fit modes (fill / fit / stretch / center-1to1 / pixel-1to1)
//
// Invariants carried over from both:
//   1. fitting only changes UVs (repeat / offset) or a window rect, never scene geometry;
//   2. "fill" covers (crops the source), "fit" contains (leaves clean edges);
//   3. leaving edges clean is expressed as an explicit rect, not by stretching the source.
//
// `center-1to1` and `pixel-1to1` are intentionally not implemented here: they describe a
// rectangular LED pixel grid, which a dome does not have. They stay relevant for the plane
// and cylinder surfaces used by the other Stage Replica demos.

export const FIT_MODES = ["fill", "fit", "stretch"];

/**
 * Place a source inside a normalised rectangular window.
 * @param {{ windowAspect: number, sourceAspect: number, mode?: string }} options
 * @returns {{ mode: string, lo: [number, number], hi: [number, number], crop: [number, number] }}
 *   `lo`/`hi` bound the part of the window that carries picture; outside it must read black.
 */
export function fitWindowRect({ windowAspect, sourceAspect, mode = "fit" }) {
  const target = Number(windowAspect) > 0 ? Number(windowAspect) : 1;
  const source = Number(sourceAspect) > 0 ? Number(sourceAspect) : 1;

  if (mode === "stretch") {
    return { mode, lo: [0, 0], hi: [1, 1], crop: [0, 0] };
  }

  const cover = mode === "fill";
  const wider = source >= target;
  const width = cover ? (wider ? source / target : 1) : wider ? 1 : source / target;
  const height = cover ? (wider ? 1 : target / source) : wider ? target / source : 1;

  const lo = [(1 - width) / 2, (1 - height) / 2];
  const hi = [lo[0] + width, lo[1] + height];
  const crop = cover
    ? [Math.max(0, (width - 1) / width), Math.max(0, (height - 1) / height)]
    : [0, 0];

  return { mode, lo, hi, crop };
}

/** UV repeat/offset form, for flat quad surfaces outside the dome path. */
export function fitUV({ sourceAspect, screenAspect, mode = "fill" }) {
  const source = Number(sourceAspect) > 0 ? Number(sourceAspect) : 1;
  const screen = Number(screenAspect) > 0 ? Number(screenAspect) : 1;

  if (mode === "stretch") return { repeat: [1, 1], offset: [0, 0] };

  if (mode === "fill") {
    const fx = source >= screen ? screen / source : 1;
    const fy = source >= screen ? 1 : source / screen;
    return { repeat: [fx, fy], offset: [(1 - fx) / 2, (1 - fy) / 2] };
  }

  const fx = source >= screen ? 1 : source / screen;
  const fy = source >= screen ? screen / source : 1;
  return { repeat: [fx, fy], offset: [(1 - fx) / 2, (1 - fy) / 2] };
}

/** Aspect helpers keep every caller from re-deriving 16:9 by hand. */
export const aspectOf = (width, height) => (height > 0 ? width / height : 1);
