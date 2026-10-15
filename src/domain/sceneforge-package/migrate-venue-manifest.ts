import type { VenueManifest } from "../scene";
import { parseSceneForgePackageV1, type SceneForgeAsset, type SceneForgePackageV1 } from "./schema";

const legacyAssetKinds = {
  glb: { kind: "glb", mediaType: "model/gltf-binary" },
  usdz: { kind: "usdz", mediaType: "model/vnd.usdz+zip" },
  poster: { kind: "poster", mediaType: "image/*" },
} as const;

function migrateAssets(assets: VenueManifest["assets"]): SceneForgeAsset[] {
  if (!assets) return [];

  return (Object.keys(legacyAssetKinds) as (keyof typeof legacyAssetKinds)[]).flatMap((key) => {
    const uri = assets[key];
    if (!uri) return [];
    const descriptor = legacyAssetKinds[key];
    return [{ id: `venue-${key}`, uri, ...descriptor }];
  });
}

export function migrateVenueManifestToPackageV1(manifest: VenueManifest): SceneForgePackageV1 {
  const screenId = `${manifest.id}-screen`;
  const firstCamera = manifest.cameras[0];

  return parseSceneForgePackageV1({
    schemaVersion: 1,
    metadata: {
      id: manifest.id,
      name: manifest.name,
      revision: "migrated-venue-manifest-v1",
      description: manifest.description,
      extensions: {
        "org.sceneforge.legacy-venue": {
          city: manifest.city,
          status: manifest.status,
          layout: manifest.layout,
          dimensions: manifest.dimensions,
          stage: manifest.stage,
        },
      },
    },
    units: "meters",
    coordinateSystem: { handedness: "right", upAxis: "Y", forwardAxis: "-Z" },
    assets: migrateAssets(manifest.assets),
    screens: [
      {
        id: screenId,
        name: "Main screen",
        transform: { position: manifest.screen.position },
        size: [manifest.screen.width, manifest.screen.height],
        curvature: manifest.screen.curvature,
      },
    ],
    cameras: manifest.cameras.map((camera) => ({
      id: camera.id,
      name: camera.name,
      position: camera.position,
      target: camera.target,
    })),
    spawnPoints: [
      {
        id: "default-entry",
        name: "Default entry",
        transform: { position: firstCamera.position },
        default: true,
      },
    ],
    cueSets: [
      {
        id: "legacy-cues",
        name: "Migrated venue cues",
        cues: manifest.cues.map((cue) => ({
          id: cue.id,
          name: cue.name,
          actions: cue.actions.map((action) =>
            action.type === "set-screen" ? { ...action, screenId } : action,
          ),
        })),
      },
    ],
    qualityProfiles: [
      {
        id: "balanced",
        name: "Balanced",
        tier: "balanced",
        maxDevicePixelRatio: 1.75,
        maxTextureSize: 2048,
        shadows: "static",
        reflections: true,
      },
    ],
  });
}
