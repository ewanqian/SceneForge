import { z } from "zod";

const identifierSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/i, "Use a portable identifier");

const extensionNamespaceSchema = z
  .string()
  .regex(
    /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/,
    "Extension keys must use a dotted namespace such as org.example.runtime",
  );

export const extensionsSchema = z.record(extensionNamespaceSchema, z.unknown());

const extensionFields = {
  extensions: extensionsSchema.optional(),
};

export const vec3Schema = z.tuple([z.number(), z.number(), z.number()]);
const positiveVec2Schema = z.tuple([z.number().positive(), z.number().positive()]);
const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-f]{6}$/i, "Expected a six-digit hexadecimal color");

const portableUriSchema = z.string().min(1).refine(
  (value) => {
    if (/^https?:\/\//i.test(value)) return true;
    return !value.startsWith("/") && !value.split("/").includes("..");
  },
  { message: "Use a package-relative path or an HTTPS URL" },
);

export const transformSchema = z
  .object({
    position: vec3Schema,
    rotation: vec3Schema.default([0, 0, 0]),
    scale: vec3Schema.default([1, 1, 1]),
  })
  .strict();

export const packageMetadataSchema = z
  .object({
    id: identifierSchema,
    name: z.string().min(1),
    revision: z.string().min(1),
    description: z.string().min(1).optional(),
    authors: z.array(z.string().min(1)).optional(),
    ...extensionFields,
  })
  .strict();

export const assetSchema = z
  .object({
    id: identifierSchema,
    kind: z.enum(["glb", "ktx2", "usdz", "poster", "video-proxy", "metadata"]),
    uri: portableUriSchema,
    mediaType: z.string().min(1).optional(),
    byteLength: z.number().int().nonnegative().optional(),
    sha256: z.string().regex(/^[0-9a-f]{64}$/i).optional(),
    ...extensionFields,
  })
  .strict();

export const screenSchema = z
  .object({
    id: identifierSchema,
    name: z.string().min(1),
    transform: transformSchema,
    size: positiveVec2Schema,
    curvature: z.number().min(0).max(1).default(0),
    modelAssetId: identifierSchema.optional(),
    materialSlot: z.string().min(1).optional(),
    ...extensionFields,
  })
  .strict();

export const cameraSchema = z
  .object({
    id: identifierSchema,
    name: z.string().min(1),
    position: vec3Schema,
    target: vec3Schema,
    verticalFovDegrees: z.number().gt(0).lt(180).default(54),
    ...extensionFields,
  })
  .strict();

export const spawnPointSchema = z
  .object({
    id: identifierSchema,
    name: z.string().min(1),
    transform: transformSchema,
    default: z.boolean().default(false),
    ...extensionFields,
  })
  .strict();

export const cueActionSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("set-screen"),
      screenId: identifierSchema,
      color: hexColorSchema,
      emissiveIntensity: z.number().min(0).max(12),
    })
    .strict(),
  z
    .object({
      type: z.literal("set-house-lights"),
      intensity: z.number().min(0).max(10),
    })
    .strict(),
  z
    .object({
      type: z.literal("set-reflection"),
      enabled: z.boolean(),
    })
    .strict(),
  z
    .object({
      type: z.literal("select-camera"),
      cameraId: identifierSchema,
    })
    .strict(),
]);

export const cueSchema = z
  .object({
    id: identifierSchema,
    name: z.string().min(1),
    actions: z.array(cueActionSchema),
    ...extensionFields,
  })
  .strict();

export const cueSetSchema = z
  .object({
    id: identifierSchema,
    name: z.string().min(1),
    cues: z.array(cueSchema),
    ...extensionFields,
  })
  .strict();

export const qualityProfileSchema = z
  .object({
    id: identifierSchema,
    name: z.string().min(1),
    tier: z.enum(["low", "balanced", "high"]),
    maxDevicePixelRatio: z.number().positive().max(4),
    maxTextureSize: z.number().int().positive(),
    shadows: z.enum(["off", "static", "dynamic"]),
    reflections: z.boolean(),
    ...extensionFields,
  })
  .strict();

function addDuplicateIdIssues(
  values: readonly { id: string }[],
  label: string,
  path: PropertyKey[],
  context: z.core.$RefinementCtx,
) {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value.id)) {
      context.addIssue({
        code: "custom",
        message: `Duplicate ${label} ID: ${value.id}`,
        path: [...path, index, "id"],
      });
    }
    seen.add(value.id);
  });
}

export const sceneForgePackageV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    metadata: packageMetadataSchema,
    units: z.literal("meters"),
    coordinateSystem: z
      .object({
        handedness: z.literal("right"),
        upAxis: z.literal("Y"),
        forwardAxis: z.literal("-Z"),
      })
      .strict(),
    assets: z.array(assetSchema),
    screens: z.array(screenSchema),
    cameras: z.array(cameraSchema).min(1),
    spawnPoints: z.array(spawnPointSchema).min(1),
    cueSets: z.array(cueSetSchema),
    qualityProfiles: z.array(qualityProfileSchema).min(1),
    ...extensionFields,
  })
  .strict()
  .superRefine((packageDefinition, context) => {
    const collections = [
      [packageDefinition.assets, "assets"],
      [packageDefinition.screens, "screens"],
      [packageDefinition.cameras, "cameras"],
      [packageDefinition.spawnPoints, "spawnPoints"],
      [packageDefinition.cueSets, "cueSets"],
      [packageDefinition.qualityProfiles, "qualityProfiles"],
    ] as const;

    for (const [values, name] of collections) addDuplicateIdIssues(values, name, [name], context);

    const assetIds = new Set(packageDefinition.assets.map((asset) => asset.id));
    const screenIds = new Set(packageDefinition.screens.map((screen) => screen.id));
    const cameraIds = new Set(packageDefinition.cameras.map((camera) => camera.id));

    packageDefinition.screens.forEach((screen, index) => {
      if (screen.modelAssetId && !assetIds.has(screen.modelAssetId)) {
        context.addIssue({
          code: "custom",
          message: `Unknown model asset: ${screen.modelAssetId}`,
          path: ["screens", index, "modelAssetId"],
        });
      }
    });

    packageDefinition.cueSets.forEach((cueSet, cueSetIndex) => {
      addDuplicateIdIssues(cueSet.cues, "cues", ["cueSets", cueSetIndex, "cues"], context);
      cueSet.cues.forEach((cue, cueIndex) => {
        cue.actions.forEach((action, actionIndex) => {
          if (action.type === "set-screen" && !screenIds.has(action.screenId)) {
            context.addIssue({
              code: "custom",
              message: `Unknown screen: ${action.screenId}`,
              path: ["cueSets", cueSetIndex, "cues", cueIndex, "actions", actionIndex, "screenId"],
            });
          }
          if (action.type === "select-camera" && !cameraIds.has(action.cameraId)) {
            context.addIssue({
              code: "custom",
              message: `Unknown camera: ${action.cameraId}`,
              path: ["cueSets", cueSetIndex, "cues", cueIndex, "actions", actionIndex, "cameraId"],
            });
          }
        });
      });
    });
  });

export type SceneForgePackageV1 = z.infer<typeof sceneForgePackageV1Schema>;
export type SceneForgeAsset = SceneForgePackageV1["assets"][number];
export type SceneForgeScreen = SceneForgePackageV1["screens"][number];
export type SceneForgeCamera = SceneForgePackageV1["cameras"][number];
export type SceneForgeCue = SceneForgePackageV1["cueSets"][number]["cues"][number];

export class SceneForgePackageValidationError extends Error {
  readonly issues: z.core.$ZodIssue[];

  constructor(error: z.ZodError) {
    const details = error.issues
      .map((issue) => `${issue.path.length ? issue.path.join(".") : "package"}: ${issue.message}`)
      .join("\n");
    super(`Invalid SceneForge Package v1:\n${details}`);
    this.name = "SceneForgePackageValidationError";
    this.issues = error.issues;
  }
}

export function parseSceneForgePackageV1(input: unknown): SceneForgePackageV1 {
  const result = sceneForgePackageV1Schema.safeParse(input);
  if (!result.success) throw new SceneForgePackageValidationError(result.error);
  return result.data;
}
