// Stage Replica — shared scene loader (Issue #42 · P0.5).
//
// One entry point for every demo: fetch the manifest, validate it against the unified schema, and
// hand back the scene plus a few accessors. The demos used to each `fetch("./scene.json")` and then
// read their own bespoke shape; the manifest is now one schema and the shape differences live here,
// in the open, rather than in four private conventions.
//
// Validation is loud but not fatal: a scene that fails still renders, because a demo that refuses
// to load is a worse teaching outcome than one that logs exactly which rule it broke.

import { validateScene } from "./scene-schema.js";

export async function loadScene(url) {
  const response = await fetch(url, { cache: "no-cache" });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const scene = await response.json();
  const validation = validateScene(scene);
  if (!validation.ok) {
    console.error(`[stage-replica] ${url} failed schema validation:`);
    for (const error of validation.errors) console.error(`  - ${error}`);
  }
  for (const warning of validation.warnings) {
    console.warn(`[stage-replica] ${url}: ${warning}`);
  }
  return { scene, validation };
}

export const surfaceOf = (scene, id) =>
  id ? (scene.surfaces ?? []).find((s) => s.id === id) : (scene.surfaces ?? [])[0];

export const objectOf = (scene, id) => (scene.objects ?? []).find((o) => o.id === id);

export const behaviourOf = (scene) => scene.behaviour ?? { module: "generic", params: {} };

export const paramOf = (scene, key, fallback = undefined) =>
  behaviourOf(scene).params?.[key] ?? fallback;

/** The physical width/height of a surface regardless of which per-shape size keys it uses. */
export function surfaceSize(surface) {
  const size = surface?.size ?? {};
  if (surface?.shape === "cylinder") {
    return {
      widthM: size.diameterM,
      heightM: size.heightM,
      aspect: (Math.PI * size.diameterM) / size.heightM,
    };
  }
  if (surface?.shape === "dome") {
    return { widthM: size.radiusM * 2, heightM: size.radiusM, aspect: 2 };
  }
  return {
    widthM: size.widthM,
    heightM: size.heightM,
    aspect: size.widthM && size.heightM ? size.widthM / size.heightM : null,
  };
}

// ---------------------------------------------------------------- legacy projection
//
// The four demos were written against four bespoke manifest shapes. Rather than rewrite ~140 field
// accesses inside four working renderers, the projection back to those shapes lives here, in ONE
// place, derived from the unified scene. The manifests on disk are unified and validated; this is
// the compatibility shim that lets the existing renderers consume them.
//
// It is a shim, not the destination: the honest next step is to read objects[] / surfaces[] at each
// use site and delete this function. It is centralised and documented so that it is visible debt
// rather than four private conventions.

const legacySurfaces = (scene) =>
  (scene.surfaces ?? []).map((surface) => {
    const size = surface.size ?? {};
    let physicalSize;
    if (surface.shape === "cylinder") {
      physicalSize = {
        diameterM: size.diameterM,
        heightM: size.heightM,
        circumferenceM: Math.PI * size.diameterM,
        unwrappedAspect: (Math.PI * size.diameterM) / size.heightM,
      };
    } else if (surface.shape === "dome") {
      physicalSize = { radiusM: size.radiusM, coverage: size.coverage };
    } else {
      physicalSize = { widthM: size.widthM, heightM: size.heightM };
    }
    return {
      id: surface.id,
      shape: surface.shape,
      physicalSize,
      raster: {
        master: surface.raster?.master,
        fast: surface.raster?.runtime,
        program: "1920x1080",
      },
      transform: surface.transform ?? { positionM: [0, 0, 0], rotationDeg: [0, 0, 0] },
      source: { type: surface.source?.kind, id: surface.source?.id },
      fallback: surface.fallback,
    };
  });

function legacyStructure(scene, demo) {
  const params = behaviourOf(scene).params ?? {};
  const object = (id) => objectOf(scene, id);
  const surfaces = scene.surfaces ?? [];
  const human = scene.humanScale ?? {};

  if (demo === "sphere") {
    const platform = object("STAGE_PLATFORM");
    return {
      domeRadiusM: surfaces[0]?.size?.radiusM,
      audienceFloorDiameterM: object("AUDIENCE_FLOOR")?.diameterM,
      stagePlatform: platform
        ? { widthM: platform.widthM, depthM: platform.depthM, heightM: platform.heightM }
        : undefined,
      performerHeightM: human.performerHeightM,
      eyeHeightM: human.eyeHeightM,
      gridRingM: params.gridRingM,
      gridRadials: params.gridRadials,
      scaleBarM: scene.scaleReference?.lengthM,
    };
  }
  if (demo === "festival") {
    const floor = object("STAGE_FLOOR");
    return {
      stage: floor
        ? { widthM: floor.widthM, depthM: floor.depthM, centerZ: floor.positionM?.[2] }
        : undefined,
      djPlatform: object("DJ_PLATFORM"),
      performerHeightM: human.performerHeightM,
      eyeHeightM: human.eyeHeightM,
      gridSpacingM: params.gridSpacingM,
      scaleBarM: scene.scaleReference?.lengthM,
    };
  }
  if (demo === "installation") {
    const room = object("ROOM");
    const wall = surfaces[0];
    const floor = surfaces[1];
    return {
      room: room ? { widthM: room.widthM, depthM: room.depthM, heightM: room.heightM } : undefined,
      projectionMain: wall
        ? {
            widthM: wall.size?.widthM,
            heightM: wall.size?.heightM,
            planeZ: wall.transform?.positionM?.[2],
            centerYM: wall.transform?.positionM?.[1],
          }
        : undefined,
      projectionFloor: floor
        ? { widthM: floor.size?.widthM, depthM: floor.size?.heightM }
        : undefined,
      viewerNearM: params.viewerNearM,
      viewerFarM: params.viewerFarM,
      scaleBarM: scene.scaleReference?.lengthM,
      scaleBarZ: scene.scaleReference?.positionM?.[2],
      referencePostHeightM: params.referencePostHeightM,
      referencePostXM: params.referencePostXM,
      performerHeightM: human.performerHeightM,
      eyeHeightM: human.eyeHeightM,
    };
  }
  return {
    arenaBowlDiameterM: object("ARENA_BOWL")?.diameterM,
    mainStageDiameterM: object("MAIN_STAGE")?.diameterM,
    performerZoneDiameterM: object("PERFORMER_ZONE")?.diameterM,
    ledCylinderDiameterM: surfaces[0]?.size?.diameterM,
    ledCylinderHeightM: surfaces[0]?.size?.heightM,
    haloRingDiameterM: object("HALO_RING")?.diameterM,
    performerHeightM: human.performerHeightM,
    eyeHeightM: human.eyeHeightM,
    scaleBarM: scene.scaleReference?.lengthM,
    scaleBarZ: scene.scaleReference?.positionM?.[2],
  };
}

const legacyCameras = (scene) =>
  (scene.cameras ?? []).map((camera) => ({
    id: camera.id,
    label: camera.label,
    // the unified schema is explicit about units (positionM/targetM); the renderers predate that
    position: camera.positionM,
    target: camera.targetM,
    fovDeg: camera.fovDeg,
    eyeHeightM: camera.eyeHeightM,
  }));

/** The scene as a demo's renderer expects it, derived from the unified manifest. */
export function legacyView(scene, demo) {
  const fitModes = (scene.surfaces ?? []).flatMap((s) => s.fit?.modes ?? []);
  const view = {
    sceneId: scene.sceneId,
    units: scene.units,
    note: scene.note,
    structure: legacyStructure(scene, demo),
    screens: legacySurfaces(scene),
    cameras: legacyCameras(scene),
    cue: scene.cue,
    programCamera: scene.programCamera,
  };
  if (demo === "sphere") view.adaptationModes = fitModes;
  if (demo === "stadium") {
    view.panoramaModes = fitModes;
    view.lightThroughScreen = paramOf(scene, "lightThroughScreen");
    view.heightTension = scene.annotations?.heightTension;
  }
  if (demo === "festival") {
    view.derivedGeometry = paramOf(scene, "derivedGeometry");
    view.screenRelationship = paramOf(scene, "relationship");
  }
  return view;
}

/** Load a unified manifest and return BOTH the scene and the demo-shaped view of it. */
export async function loadLegacyScene(url, demo) {
  const { scene, validation } = await loadScene(url);
  return { scene, validation, legacy: legacyView(scene, demo) };
}

/** One-liner: `const sceneJson = await legacyScene("./scene.json", "sphere");` */
export async function legacyScene(url, demo) {
  const { legacy } = await loadLegacyScene(url, demo);
  return legacy;
}
