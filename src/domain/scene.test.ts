import { describe, expect, it } from "vitest";
import { venueManifestSchema } from "./scene";

const validManifest = {
  schemaVersion: 1,
  id: "test-venue",
  name: "Test venue",
  city: "Test city",
  status: "illustrative",
  description: "Schema validation fixture.",
  layout: "box",
  dimensions: { width: 10, depth: 12, height: 6 },
  stage: { width: 5, depth: 3, height: 1, position: [0, 0.5, -3] },
  screen: { width: 4, height: 2, position: [0, 3, -5], curvature: 0 },
  cameras: [{ id: "front", name: "Front", position: [0, 3, 5], target: [0, 2, -3] }],
  cues: [],
} as const;

describe("venueManifestSchema", () => {
  it("accepts a venue with at least one camera", () => {
    expect(venueManifestSchema.safeParse(validManifest).success).toBe(true);
  });

  it("rejects a venue without a camera", () => {
    expect(venueManifestSchema.safeParse({ ...validManifest, cameras: [] }).success).toBe(false);
  });

  it("rejects duplicate camera preset IDs", () => {
    const duplicateCamera = { ...validManifest.cameras[0], name: "Duplicate" };
    expect(
      venueManifestSchema.safeParse({
        ...validManifest,
        cameras: [...validManifest.cameras, duplicateCamera],
      }).success,
    ).toBe(false);
  });

  it("rejects invalid cue colors", () => {
    expect(
      venueManifestSchema.safeParse({
        ...validManifest,
        cues: [
          {
            id: "invalid-color",
            name: "Invalid color",
            actions: [{ type: "set-screen", color: "#ff00zz", emissiveIntensity: 1 }],
          },
        ],
      }).success,
    ).toBe(false);
  });
});
