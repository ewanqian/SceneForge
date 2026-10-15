// Legacy manifest -> unified scene schema adapters (Issue #42 · P0.5).
//
// These adapters exist to answer one question with evidence rather than assertion: CAN the four
// demos be expressed in one schema without losing what makes each of them that demo?
//
// So each adapter does two things the naive version would not:
//   1. it carries the demo's bespoke machinery into `behaviour.params` and `fit.modes`, instead of
//      flattening it into brightness / coverage / cycle;
//   2. it reports what it mapped and what it could NOT, so any loss is visible rather than implied.
//
// `variant: "v1"` reproduces the raster values the demos actually shipped BEFORE their independent
// reviews caught them, which is how the schema's stretch rule gets tested against known-bad input.

const DEMOS = ["sphere", "festival", "installation", "stadium"];

export const LEGACY_DEMOS = DEMOS;

const vec = (value, fallback = [0, 0, 0]) =>
  Array.isArray(value) && value.length === 3 ? value : fallback;

/** Legacy manifests say `source.type`; the unified schema says `source.kind`. Normalise, do not
 *  pass through - this mismatch alone made every converted scene fail validation on the first run,
 *  which is the adapter's job to absorb rather than the schema's job to tolerate. */
const normaliseSource = (source) => ({
  kind: source?.kind ?? source?.type ?? "procedural",
  id: source?.id ?? null,
  ...(source?.url ? { url: source.url } : {}),
});

/** Legacy manifests sometimes declare a fallback without saying whether it exists. Where the code
 *  has been read, resolve it truthfully and record that fact; where it has not, leave it null so
 *  the schema reports an unanswered question instead of a guess. */
function normaliseFallback(fallback, demoId) {
  const declared = { type: fallback?.type ?? null, implemented: fallback?.implemented ?? null };
  if (typeof declared.implemented === "boolean") return { ...declared, source: "manifest" };
  if (demoId === "sphere") {
    // verified: sphere/main.js line 701 is `if (streamState !== "offline") { source.draw(...) }`,
    // i.e. going offline SKIPS the draw and leaves the last frame - a freeze, not a local loop.
    return { ...declared, implemented: false, source: "verified-in-code" };
  }
  if (demoId === "stadium") {
    // verified: stadium/main.js draws a distinct fallback pattern when `streamState !== "live"`.
    return { ...declared, implemented: true, source: "verified-in-code" };
  }
  return { ...declared, source: "unanswered" };
}

/**
 * Adapt one legacy manifest.
 * @param raw the demo's scene.json
 * @param demoId "sphere" | "festival" | "installation" | "stadium"
 * @param options.variant "current" (default) uses the shipped values; "v1" uses the pre-review ones
 */
export function adaptLegacy(raw, demoId, options = {}) {
  const variant = options.variant === "v1" ? "v1" : "current";
  const mapped = [];
  const carried = [];
  const dropped = [];

  const base = {
    schemaVersion: 1,
    sceneId: raw.sceneId ?? `${demoId}-legacy`,
    units: raw.units ?? "meters",
    note: raw.note ?? "",
    objects: [],
    performers: [],
    surfaces: [],
    cameras: [],
    cue: { durationSec: 0, rampSec: 1.6, states: [] },
    programCamera: raw.programCamera ?? null,
    annotations: {},
  };

  // ---- cameras: already the most unified part of the four manifests
  base.cameras = (raw.cameras ?? []).map((camera, index) => {
    mapped.push(`cameras[${index}].${camera.id}`);
    return {
      id: camera.id,
      label: camera.label ?? camera.id,
      positionM: vec(camera.position),
      targetM: vec(camera.target),
      fovDeg: camera.fovDeg,
      eyeHeightM: camera.eyeHeightM ?? null,
      role: camera.eyeHeightM == null ? "technical" : "human",
    };
  });

  // ---- cue: also already unified; only the state ids differ per demo
  base.cue = {
    durationSec: raw.cue?.durationSec ?? 32,
    rampSec: raw.cue?.rampSec ?? 1.6,
    states: (raw.cue?.states ?? []).map((state, index) => {
      mapped.push(`cue.states[${index}].${state.id}`);
      return {
        id: state.id,
        label: state.label,
        start: state.start,
        end: state.end,
      };
    }),
  };

  // ---- per-demo surface + bespoke behaviour
  if (demoId === "sphere") {
    const screen = (raw.screens ?? [])[0] ?? {};
    const size = screen.physicalSize ?? {};
    base.surfaces.push({
      id: screen.id ?? "DOME_MAIN",
      shape: "dome",
      size: { radiusM: size.radiusM, coverage: size.coverage ?? "hemisphere" },
      raster: { master: screen.raster?.master, runtime: screen.raster?.fast },
      source: normaliseSource(screen.source),
      fallback: normaliseFallback(screen.fallback, demoId),
      fit: {
        // adaptationModes is Sphere's name for what Stadium calls panoramaModes: same concept
        modes: (raw.adaptationModes ?? []).map((mode) => ({
          id: mode.id,
          label: mode.label,
          note: mode.note,
        })),
      },
      opacity: 1,
    });
    mapped.push("screens[0] -> surfaces[0] (dome)");
    mapped.push("adaptationModes[] -> surfaces[0].fit.modes");
    carried.push("adaptationModes 作为 fit.modes 保留（Sphere 称它为 adaptationModes）");

    const stage = raw.structure?.stagePlatform;
    if (stage) {
      base.objects.push({
        id: "STAGE_PLATFORM",
        kind: "platform",
        shape: "box",
        widthM: stage.widthM,
        depthM: stage.depthM,
        heightM: stage.heightM,
        positionM: [0, 0, 0],
      });
      mapped.push("structure.stagePlatform -> objects[0]");
    }
    if (raw.structure?.audienceFloorDiameterM) {
      base.objects.push({
        id: "AUDIENCE_FLOOR",
        kind: "disc",
        diameterM: raw.structure.audienceFloorDiameterM,
        positionM: [0, 0, 0],
      });
    }
    base.scaleReference = { lengthM: raw.structure?.scaleBarM ?? 5, positionM: [0, 0.03, 6] };
    base.behaviour = {
      module: "sphere-dome",
      params: {
        solidAngleCoverage: true,
        audienceWindowFollowsViewer: true,
        gridRingM: raw.structure?.gridRingM,
        gridRadials: raw.structure?.gridRadials,
      },
    };
    carried.push("dome 的立体角覆盖与「媒体窗口跟随观看者」进入 behaviour.params");
    base.annotations = { note: raw.note };
  }

  if (demoId === "festival") {
    for (const [index, screen] of (raw.screens ?? []).entries()) {
      const size = screen.physicalSize ?? {};
      base.surfaces.push({
        id: screen.id,
        shape: "plane",
        size: { widthM: size.widthM, heightM: size.heightM },
        transform: screen.transform ?? { positionM: [0, 4.5, -4], rotationDeg: [0, 0, 0] },
        raster: {
          master: screen.raster?.master,
          // 2048x1024 is what V2 actually renders; V1 rendered a 1280x720 canvas into a 2:1 wall
          runtime: variant === "v1" ? "1280x720" : "2048x1024",
        },
        source: normaliseSource(screen.source),
        fallback: normaliseFallback(screen.fallback, demoId),
        fit: { modes: [] },
        opacity: 1,
      });
      mapped.push(`screens[${index}] -> surfaces[${index}] (plane)`);
    }
    const platform = raw.structure?.djPlatform;
    if (platform) {
      base.objects.push({
        id: "DJ_PLATFORM",
        kind: "platform",
        shape: platform.shape ?? "triangle",
        widthM: platform.widthM,
        depthM: platform.depthM,
        heightM: platform.heightM,
        positionM: vec(platform.positionM),
      });
      mapped.push("structure.djPlatform -> objects[0]");
    }
    base.scaleReference = { lengthM: raw.structure?.scaleBarM ?? 5, positionM: [0, 0.03, 6] };
    base.behaviour = {
      module: "two-wall",
      params: {
        // the whole point of this demo: one continuous image or two independent pictures
        relationship: raw.screenRelationship ?? null,
        derivedGeometry: raw.derivedGeometry ?? null,
        independentStateFlipsRightScreen: true,
      },
    };
    carried.push("两屏 join 关系与 derivedGeometry 进入 behaviour.params（不压平成亮度/覆盖）");
    base.annotations = { v2Changes: raw.v2Changes, note: raw.note };
  }

  if (demoId === "installation") {
    for (const [index, screen] of (raw.screens ?? []).entries()) {
      const size = screen.physicalSize ?? {};
      base.surfaces.push({
        id: screen.id,
        shape: "plane",
        size: { widthM: size.widthM, heightM: size.heightM },
        transform: screen.transform ?? { positionM: [0, 3.2, -9], rotationDeg: [0, 0, 0] },
        raster: {
          master: screen.raster?.master,
          // V2 renders 2048x1080 (exactly the screen ratio); V1 rendered 1280x720
          runtime: variant === "v1" ? "1280x720" : (screen.raster?.runtime ?? "2048x1080"),
        },
        source: normaliseSource(screen.source),
        fallback: normaliseFallback(screen.fallback, demoId),
        fit: { modes: [] },
        opacity: 1,
      });
      mapped.push(`screens[${index}] -> surfaces[${index}] (plane)`);
    }
    if (raw.structure?.room) {
      base.objects.push({ id: "ROOM", kind: "room", ...raw.structure.room, positionM: [0, 0, 0] });
      mapped.push("structure.room -> objects[0]");
    }
    base.scaleReference = {
      lengthM: raw.structure?.scaleBarM ?? 5,
      positionM: [0, 0.04, raw.structure?.scaleBarZ ?? -8.6],
    };
    base.behaviour = {
      module: "black-box",
      params: {
        // V2's real machinery: a persistent mark pool and a genuine residual, not a density dial
        accumulatingMarkPool: true,
        residualAfterimage: true,
        noFieldReseed: true,
        viewerNearM: raw.structure?.viewerNearM,
        viewerFarM: raw.structure?.viewerFarM,
        referencePostHeightM: raw.structure?.referencePostHeightM,
      },
    };
    carried.push("累积标记池 / 真实余像 / 取消整场重排 进入 behaviour.params");
    base.annotations = { v2Changes: raw.v2Changes, note: raw.note };
  }

  if (demoId === "stadium") {
    const screen = (raw.screens ?? [])[0] ?? {};
    const size = screen.physicalSize ?? {};
    base.surfaces.push({
      id: screen.id ?? "LED_CYLINDER",
      shape: "cylinder",
      size: { diameterM: size.diameterM, heightM: size.heightM },
      transform: screen.transform ?? { positionM: [0, 4, 0], rotationDeg: [0, 0, 0] },
      raster: { master: screen.raster?.master, runtime: screen.raster?.fast },
      source: normaliseSource(screen.source),
      fallback: normaliseFallback(screen.fallback, demoId),
      fit: {
        modes: (raw.panoramaModes ?? []).map((mode) => ({
          id: mode.id,
          label: mode.label,
          ratio: mode.ratio,
          note: mode.note,
        })),
      },
      opacity: raw.lightThroughScreen?.screenOpacity ?? 1,
    });
    mapped.push("screens[0] -> surfaces[0] (cylinder)");
    mapped.push("panoramaModes[] -> surfaces[0].fit.modes");
    carried.push("panoramaModes 作为 fit.modes 保留（Stadium 称它为 panoramaModes）");

    if (raw.structure?.mainStageDiameterM) {
      base.objects.push({
        id: "MAIN_STAGE",
        kind: "disc",
        diameterM: raw.structure.mainStageDiameterM,
        positionM: [0, 0, 0],
      });
    }
    if (raw.structure?.haloRingDiameterM) {
      base.objects.push({
        id: "HALO_RING",
        kind: "ring",
        diameterM: raw.structure.haloRingDiameterM,
        heightM: raw.structure.ledCylinderHeightM + 0.6,
        positionM: [0, 0, 0],
      });
    }
    if (raw.structure?.arenaBowlDiameterM) {
      base.objects.push({
        id: "ARENA_BOWL",
        kind: "bowl",
        diameterM: raw.structure.arenaBowlDiameterM,
        positionM: [0, 0, 0],
      });
    }
    base.scaleReference = {
      lengthM: raw.structure?.scaleBarM ?? 5,
      positionM: [0, 0.06, raw.structure?.scaleBarZ ?? 16],
    };
    base.behaviour = {
      module: "cylinder-stage",
      params: {
        // the V2 fix: rotation drives the COVERED ARC, not just the sampling inside a fixed arc
        rotationDrivesCoverageArc: true,
        lightThroughScreen: raw.lightThroughScreen ?? null,
        barLiftOnPeak: true,
        crowdRingOnRelease: true,
      },
    };
    carried.push("旋转驱动覆盖弧 / 屏后灯柱 / 观众环 进入 behaviour.params");
    base.annotations = { v2Changes: raw.v2Changes, heightTension: raw.heightTension };
  }

  for (const key of Object.keys(raw)) {
    const known = [
      "sceneId",
      "units",
      "note",
      "structure",
      "screens",
      "cameras",
      "cue",
      "programCamera",
      "adaptationModes",
      "panoramaModes",
      "lightThroughScreen",
      "screenRelationship",
      "derivedGeometry",
      "v2Changes",
      "heightTension",
    ];
    if (!known.includes(key)) dropped.push(key);
  }

  return { scene: base, report: { demoId, variant, mapped, carried, dropped } };
}
