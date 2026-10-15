import type { SceneForgePackageV1 } from "./schema";

export const minimalSceneForgePackageFixture = {
  schemaVersion: 1,
  metadata: {
    id: "fixture-stage",
    name: "Fixture stage",
    revision: "1",
  },
  units: "meters",
  coordinateSystem: {
    handedness: "right",
    upAxis: "Y",
    forwardAxis: "-Z",
  },
  assets: [
    {
      id: "venue-model",
      kind: "glb",
      uri: "assets/models/venue.glb",
      mediaType: "model/gltf-binary",
    },
  ],
  screens: [
    {
      id: "main-screen",
      name: "Main screen",
      transform: { position: [0, 3, -5], rotation: [0, 0, 0], scale: [1, 1, 1] },
      size: [4, 2],
      curvature: 0,
      extensions: { "org.example.r3f": { receiveShadow: false } },
    },
  ],
  cameras: [
    {
      id: "front",
      name: "Front",
      position: [0, 3, 5],
      target: [0, 2, -3],
      verticalFovDegrees: 54,
    },
  ],
  spawnPoints: [
    {
      id: "audience-entry",
      name: "Audience entry",
      transform: { position: [0, 0, 5], rotation: [0, 0, 0], scale: [1, 1, 1] },
      default: true,
    },
  ],
  cueSets: [
    {
      id: "show",
      name: "Show cues",
      cues: [
        {
          id: "look-one",
          name: "Look one",
          actions: [
            {
              type: "set-screen",
              screenId: "main-screen",
              color: "#5f78ff",
              emissiveIntensity: 3.2,
            },
            { type: "select-camera", cameraId: "front" },
          ],
        },
      ],
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
  extensions: { "org.example.runtime": { fixture: true } },
} satisfies SceneForgePackageV1;
