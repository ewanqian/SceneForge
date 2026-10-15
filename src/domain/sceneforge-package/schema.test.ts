import { describe, expect, it } from "vitest";
import { minimalSceneForgePackageFixture } from "./fixtures";
import {
  parseSceneForgePackageV1,
  sceneForgePackageV1Schema,
  SceneForgePackageValidationError,
} from "./schema";

describe("SceneForgePackage v1", () => {
  it("accepts the portable conformance fixture", () => {
    expect(sceneForgePackageV1Schema.parse(minimalSceneForgePackageFixture)).toEqual(
      minimalSceneForgePackageFixture,
    );
  });

  it("accepts namespaced runtime metadata without defining runtime fields in core", () => {
    const result = parseSceneForgePackageV1(minimalSceneForgePackageFixture);
    expect(result.extensions?.["org.example.runtime"]).toEqual({ fixture: true });
    expect(result.screens[0].extensions?.["org.example.r3f"]).toEqual({ receiveShadow: false });
  });

  it("rejects extension keys that are not namespaced", () => {
    expect(() =>
      parseSceneForgePackageV1({
        ...minimalSceneForgePackageFixture,
        extensions: { r3f: { fixture: true } },
      }),
    ).toThrow(SceneForgePackageValidationError);
  });

  it("reports readable paths for invalid references", () => {
    expect(() =>
      parseSceneForgePackageV1({
        ...minimalSceneForgePackageFixture,
        cueSets: [
          {
            ...minimalSceneForgePackageFixture.cueSets[0],
            cues: [
              {
                ...minimalSceneForgePackageFixture.cueSets[0].cues[0],
                actions: [
                  {
                    type: "set-screen",
                    screenId: "missing-screen",
                    color: "#ffffff",
                    emissiveIntensity: 1,
                  },
                ],
              },
            ],
          },
        ],
      }),
    ).toThrow(/cueSets\.0\.cues\.0\.actions\.0\.screenId: Unknown screen: missing-screen/);
  });

  it("rejects duplicate IDs and package-escaping asset paths", () => {
    const invalidPackage = {
      ...minimalSceneForgePackageFixture,
      assets: [
        ...minimalSceneForgePackageFixture.assets,
        { ...minimalSceneForgePackageFixture.assets[0], uri: "../venue.glb" },
      ],
    };
    const result = sceneForgePackageV1Schema.safeParse(invalidPackage);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        "Use a package-relative path or an HTTPS URL",
        "Duplicate assets ID: venue-model",
      ]),
    );
  });
});
