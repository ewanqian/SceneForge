// One-shot migration: legacy demo manifest -> unified scene schema.
//
// Run from the SceneForge root:
//   node systems/stage-replica/review-tools/migrate-scene.mjs [--dry]
//
// It reuses the SAME adapter the conformance page uses, so the migration cannot silently diverge
// from what the conformance run claims. It validates before writing, and refuses to write a scene
// that fails validation - a migration that ships a broken manifest is worse than no migration.

import { readFileSync, writeFileSync } from "node:fs";
import { adaptLegacy } from "../../../public/stage-replica/shared/legacy-adapters.js";
import { validateScene } from "../../../public/stage-replica/shared/scene-schema.js";

const DRY = process.argv.includes("--dry");
const DEMOS = ["sphere", "festival", "installation", "stadium"];
const ROOT = "public/stage-replica";

/**
 * A handful of things the demo headers genuinely read that the generic adapter has no way to
 * invent. Kept here, explicit, rather than hidden inside the adapter: these are the last
 * per-demo traces, and they should be visible.
 */
function enrich(scene, raw, demo) {
  scene.humanScale = {
    performerHeightM: raw.structure?.performerHeightM ?? 1.7,
    eyeHeightM: raw.structure?.eyeHeightM ?? 1.6,
  };

  if (demo === "festival" && raw.structure?.stage) {
    scene.objects.push({
      id: "STAGE_FLOOR",
      kind: "floor",
      widthM: raw.structure.stage.widthM,
      depthM: raw.structure.stage.depthM,
      positionM: [0, 0, raw.structure.stage.centerZ ?? 0],
    });
  }
  if (demo === "stadium" && raw.structure?.performerZoneDiameterM) {
    scene.objects.push({
      id: "PERFORMER_ZONE",
      kind: "ring",
      diameterM: raw.structure.performerZoneDiameterM,
      heightM: 0.94,
      positionM: [0, 0, 0],
    });
  }
  // grid/scale details each demo's HUD or floor uses
  if (!scene.behaviour.params) scene.behaviour.params = {};
  const params = scene.behaviour.params;
  if (raw.structure?.gridSpacingM != null) params.gridSpacingM = raw.structure.gridSpacingM;
  if (raw.structure?.scaleBarZ != null) params.scaleBarZ = raw.structure.scaleBarZ;
  if (raw.structure?.referencePostXM != null) params.referencePostXM = raw.structure.referencePostXM;

  scene.annotations = { ...scene.annotations, migratedFrom: "legacy scene.json (schemaVersion 1)" };
  return scene;
}

let failures = 0;
for (const demo of DEMOS) {
  const path = `${ROOT}/${demo}/scene.json`;
  const raw = JSON.parse(readFileSync(path, "utf8"));
  if (raw.schemaVersion === 1 && raw.behaviour) {
    console.log(`${demo}: already migrated, skipping`);
    continue;
  }
  const { scene } = adaptLegacy(raw, demo, { variant: "current" });
  enrich(scene, raw, demo);

  const result = validateScene(scene);
  if (!result.ok) {
    failures += 1;
    console.error(`${demo}: REFUSING TO WRITE - ${result.errors.length} validation error(s)`);
    for (const error of result.errors) console.error(`   - ${error}`);
    continue;
  }
  const warnings = result.warnings.length ? ` (${result.warnings.length} warning(s))` : "";
  if (DRY) {
    console.log(
      `${demo}: would write ${scene.surfaces.length} surface(s), ${scene.objects.length} object(s), ` +
        `${scene.cameras.length} camera(s), ${scene.cue.states.length} state(s)${warnings}`,
    );
    for (const warning of result.warnings) console.log(`   ~ ${warning}`);
    continue;
  }
  writeFileSync(path, `${JSON.stringify(scene, null, 2)}\n`, "utf8");
  console.log(
    `${demo}: wrote ${scene.surfaces.length} surface(s), ${scene.objects.length} object(s), ` +
      `${scene.cameras.length} camera(s), ${scene.cue.states.length} state(s)${warnings}`,
  );
  for (const warning of result.warnings) console.log(`   ~ ${warning}`);
}

if (failures > 0) process.exitCode = 1;
