// Stage Replica — unified scene schema (Issue #42 · P0.5).
//
// Scope note, because it decides the design: this is NOT "a container that can hold four JSON
// files". Reading four files proves nothing. The audit in
// systems/stage-replica/vnext-manifest-audit.md found that two real, review-caught defects were
// declared-raster-versus-rendered mismatches, and both were catchable by one rule. So the schema
// is a VALIDATOR: it carries rules that would have failed those scenes at build time.
//
// It is also deliberately permissive about behaviour. Issue #42 §4 requires that the four demos do
// not lose their bespoke shaders and state logic, so every scene must declare a `behaviour.module`
// and may carry arbitrary `params`. Flattening the dome's solid angle, the two-wall `join`, the
// black box's accumulation or the cylinder's rotating arc into "brightness / coverage / cycle"
// would satisfy a schema and destroy the work.

import { aspectOf } from "./fit-math.js";

export const SCHEMA_VERSION = 1;

export const SHAPES = ["plane", "curvedPlane", "cylinder", "dome"];

/** The bespoke behaviour each demo actually needs. `generic` is the authoring tool's own set. */
export const BEHAVIOUR_MODULES = [
  "generic",
  "sphere-dome",
  "two-wall",
  "black-box",
  "cylinder-stage",
];

const isNumber = (value) => typeof value === "number" && Number.isFinite(value);
const isVec3 = (value) => Array.isArray(value) && value.length === 3 && value.every(isNumber);
const close = (a, b, tolerance = 0.04) => Math.abs(a - b) <= tolerance * Math.max(Math.abs(a), 1);

export function aspect(width, height) {
  return aspectOf(width, height);
}

/**
 * Validate a scene against the schema.
 * Returns errors (things that make the scene wrong) and warnings (things that are legal but
 * suspicious). `info` carries the derived numbers the rules were checked against, so a reader can
 * see WHY a rule passed rather than trusting it.
 */
export function validateScene(scene) {
  const errors = [];
  const warnings = [];
  const info = { surfaces: [], cameras: 0, states: 0 };

  if (!scene || typeof scene !== "object") {
    return { ok: false, errors: ["scene is not an object"], warnings, info };
  }
  if (scene.schemaVersion !== SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${SCHEMA_VERSION}, got ${String(scene.schemaVersion)}`);
  }
  if (!scene.sceneId) errors.push("sceneId is required");
  if (scene.units !== "meters")
    warnings.push(`units is "${String(scene.units)}", expected "meters"`);

  // behaviour: required precisely so a scene cannot be silently reduced to generic knobs
  const module = scene.behaviour?.module;
  if (!module) {
    errors.push(
      "behaviour.module is required (a scene must declare which bespoke logic drives it)",
    );
  } else if (!BEHAVIOUR_MODULES.includes(module)) {
    errors.push(`behaviour.module "${module}" is not one of ${BEHAVIOUR_MODULES.join(", ")}`);
  }

  const surfaces = Array.isArray(scene.surfaces) ? scene.surfaces : [];
  if (surfaces.length === 0) errors.push("surfaces[] is empty");

  for (const [index, surface] of surfaces.entries()) {
    const at = `surfaces[${index}] (${surface?.id ?? "no id"})`;
    if (!surface?.id) errors.push(`${at}: id is required`);
    if (!SHAPES.includes(surface?.shape)) {
      errors.push(`${at}: shape "${String(surface?.shape)}" is not one of ${SHAPES.join(", ")}`);
      continue;
    }
    const entry = { id: surface.id, shape: surface.shape };

    // per-shape size union: the four legacy manifests use three different key sets, which is the
    // single biggest reason they cannot share a schema today.
    const size = surface.size ?? {};
    if (surface.shape === "plane" || surface.shape === "curvedPlane") {
      if (!isNumber(size.widthM) || !isNumber(size.heightM)) {
        errors.push(`${at}: ${surface.shape} needs numeric size.widthM and size.heightM`);
      }
      if (surface.shape === "curvedPlane" && !isNumber(size.curvatureRadiusM)) {
        errors.push(`${at}: curvedPlane needs size.curvatureRadiusM`);
      }
      if (isNumber(size.widthM) && isNumber(size.heightM)) {
        entry.physicalAspect = size.widthM / size.heightM;
      }
    } else if (surface.shape === "cylinder") {
      if (!isNumber(size.diameterM) || !isNumber(size.heightM)) {
        errors.push(`${at}: cylinder needs numeric size.diameterM and size.heightM`);
      }
      if (isNumber(size.diameterM) && isNumber(size.heightM)) {
        entry.circumferenceM = Math.PI * size.diameterM;
        entry.unwrappedAspect = entry.circumferenceM / size.heightM;
      }
    } else if (surface.shape === "dome") {
      if (!isNumber(size.radiusM)) errors.push(`${at}: dome needs numeric size.radiusM`);
      if (!["hemisphere", "partial"].includes(size.coverage)) {
        errors.push(`${at}: dome needs size.coverage of "hemisphere" or "partial"`);
      }
    }

    // transform is optional ONLY for a dome, which is centred by definition. Making it required
    // everywhere would have forced a fake transform into Sphere's manifest.
    if (surface.shape !== "dome") {
      if (!isVec3(surface.transform?.positionM))
        errors.push(`${at}: transform.positionM must be [x,y,z]`);
    }

    // RULE 1 - the one that would have caught two review-found defects:
    //   Festival declared a 2048x1024 master but rendered a 1280x720 canvas (12.5% stretch).
    //   Installation declared 4096x2160 and main.js never read it at all (6.7% stretch).
    const raster = surface.raster ?? {};
    if (!raster.master) {
      warnings.push(`${at}: raster.master is not declared`);
    }
    if (raster.runtime && entry.physicalAspect) {
      const runtimeAspect = parseAspect(raster.runtime);
      if (runtimeAspect && !close(runtimeAspect, entry.physicalAspect)) {
        errors.push(
          `${at}: runtime raster ${raster.runtime} is ${runtimeAspect.toFixed(3)}:1 but the surface is ` +
            `${entry.physicalAspect.toFixed(3)}:1 - the picture would be stretched`,
        );
      } else if (runtimeAspect) {
        entry.runtimeMatchesSurface = true;
      }
    } else if (!raster.runtime && entry.physicalAspect) {
      warnings.push(`${at}: no runtime raster declared, so the stretch rule cannot be checked`);
    }

    // RULE 2 - a cylinder's master must match its unwrapped ratio, which is what ties the raster to
    // the height. Stadium is the case where this passes, and that is exactly why its 8m height
    // cannot be changed on its own.
    if (entry.unwrappedAspect && raster.master) {
      const masterAspect = parseAspect(raster.master);
      if (masterAspect && !close(masterAspect, entry.unwrappedAspect, 0.06)) {
        errors.push(
          `${at}: master raster ${raster.master} is ${masterAspect.toFixed(3)}:1 but the unwrapped ` +
            `cylinder is ${entry.unwrappedAspect.toFixed(3)}:1`,
        );
      } else if (masterAspect) {
        entry.masterMatchesUnwrap = true;
      }
    }

    // RULE 3 - fallback must state whether it exists. The review found a declared local-loop that
    // was implemented as freeze-and-dim.
    if (!surface.fallback?.type) {
      warnings.push(`${at}: no fallback declared`);
    } else if (typeof surface.fallback.implemented !== "boolean") {
      errors.push(
        `${at}: fallback.implemented must be true or false (declared is not implemented)`,
      );
    } else if (surface.fallback.implemented === false) {
      warnings.push(`${at}: fallback "${surface.fallback.type}" is declared but NOT implemented`);
    }

    if (!surface.source?.kind) errors.push(`${at}: source.kind is required`);
    info.surfaces.push(entry);
  }

  const cameras = Array.isArray(scene.cameras) ? scene.cameras : [];
  info.cameras = cameras.length;
  if (cameras.length === 0) errors.push("cameras[] is empty");
  for (const [index, camera] of cameras.entries()) {
    const at = `cameras[${index}]`;
    if (!camera?.id) errors.push(`${at}: id is required`);
    if (!isVec3(camera?.positionM)) errors.push(`${at}: positionM must be [x,y,z]`);
    if (!isVec3(camera?.targetM)) errors.push(`${at}: targetM must be [x,y,z]`);
    if (!isNumber(camera?.fovDeg)) errors.push(`${at}: fovDeg must be a number`);
  }
  if (scene.programCamera && !cameras.some((c) => c?.id === scene.programCamera)) {
    errors.push(`programCamera "${scene.programCamera}" does not match any camera id`);
  }

  const states = Array.isArray(scene.cue?.states) ? scene.cue.states : [];
  info.states = states.length;
  if (states.length < 2) warnings.push("fewer than 2 cue states");
  if (!isNumber(scene.cue?.durationSec)) errors.push("cue.durationSec must be a number");
  for (const [index, state] of states.entries()) {
    const at = `cue.states[${index}]`;
    if (!state?.id) errors.push(`${at}: id is required`);
    if (!isNumber(state?.start) || !isNumber(state?.end))
      errors.push(`${at}: start and end must be numbers`);
    else if (state.end <= state.start) errors.push(`${at}: end must be after start`);
  }
  // contiguity: states must tile the cue, or a scene has an undefined gap the renderer will guess at
  for (let i = 1; i < states.length; i += 1) {
    if (
      isNumber(states[i].start) &&
      isNumber(states[i - 1].end) &&
      states[i].start !== states[i - 1].end
    ) {
      errors.push(
        `cue.states[${i}] starts at ${states[i].start} but the previous state ends at ${states[i - 1].end}`,
      );
    }
  }
  if (states.length > 0 && isNumber(scene.cue?.durationSec)) {
    const last = states[states.length - 1];
    if (isNumber(last.end) && last.end !== scene.cue.durationSec) {
      errors.push(
        `cue: last state ends at ${last.end} but durationSec is ${scene.cue.durationSec}`,
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings, info };
}

/** "2048x1024" -> 2.0. Returns null if it is not a WxH string. */
export function parseAspect(text) {
  const match = /^(\d+)\s*[x×]\s*(\d+)$/.exec(String(text ?? "").trim());
  if (!match) return null;
  const width = Number.parseInt(match[1], 10);
  const height = Number.parseInt(match[2], 10);
  if (!height) return null;
  return width / height;
}

/** Human-readable summary used by the conformance page. */
export function describeScene(scene) {
  const result = validateScene(scene);
  return {
    sceneId: scene.sceneId,
    behaviour: scene.behaviour?.module ?? null,
    surfaces: (scene.surfaces ?? []).map((s) => ({ id: s.id, shape: s.shape })),
    cameras: (scene.cameras ?? []).map((c) => c.id),
    states: (scene.cue?.states ?? []).map((s) => s.id),
    durationSec: scene.cue?.durationSec ?? null,
    programCamera: scene.programCamera ?? null,
    ok: result.ok,
    errors: result.errors,
    warnings: result.warnings,
    info: result.info,
  };
}
