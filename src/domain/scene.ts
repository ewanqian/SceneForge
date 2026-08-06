import { z } from "zod";

const vec3Schema = z.tuple([z.number(), z.number(), z.number()]);

const cueActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("set-screen"),
    color: z.string(),
    emissiveIntensity: z.number().min(0).max(12),
  }),
  z.object({
    type: z.literal("set-house-lights"),
    intensity: z.number().min(0).max(10),
  }),
  z.object({
    type: z.literal("set-reflection"),
    enabled: z.boolean(),
  }),
]);

export const venueManifestSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  name: z.string().min(1),
  city: z.string().min(1),
  status: z.enum(["illustrative", "surveyed"]),
  description: z.string().min(1),
  layout: z.enum(["box", "arena"]),
  dimensions: z.object({
    width: z.number().positive(),
    depth: z.number().positive(),
    height: z.number().positive(),
  }),
  stage: z.object({
    width: z.number().positive(),
    depth: z.number().positive(),
    height: z.number().positive(),
    position: vec3Schema,
  }),
  screen: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
    position: vec3Schema,
    curvature: z.number().min(0).max(1),
  }),
  cameras: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      position: vec3Schema,
      target: vec3Schema,
    }),
  ),
  cues: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      actions: z.array(cueActionSchema),
    }),
  ),
  assets: z
    .object({
      glb: z.string().url().optional(),
      usdz: z.string().url().optional(),
      poster: z.string().url().optional(),
    })
    .optional(),
});

export type VenueManifest = z.infer<typeof venueManifestSchema>;
export type Cue = VenueManifest["cues"][number];
export type CameraPreset = VenueManifest["cameras"][number];

export interface ViewerState {
  screenColor: string;
  screenIntensity: number;
  houseLightIntensity: number;
  reflections: boolean;
}

export const initialViewerState: ViewerState = {
  screenColor: "#5f78ff",
  screenIntensity: 2.4,
  houseLightIntensity: 1.8,
  reflections: true,
};
