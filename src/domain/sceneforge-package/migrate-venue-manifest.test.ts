import { describe, expect, it } from "vitest";
import { venues } from "../../data/venues";
import { migrateVenueManifestToPackageV1 } from "./migrate-venue-manifest";
import { sceneForgePackageV1Schema } from "./schema";

describe("VenueManifest migration", () => {
  it.each(venues)("migrates $id into a valid SceneForge Package v1", (venue) => {
    const migrated = migrateVenueManifestToPackageV1(venue);

    expect(sceneForgePackageV1Schema.safeParse(migrated).success).toBe(true);
    expect(migrated.metadata.id).toBe(venue.id);
    expect(migrated.cameras).toHaveLength(venue.cameras.length);
    expect(migrated.cueSets[0].cues).toHaveLength(venue.cues.length);
  });

  it("targets the migrated screen from legacy screen cue actions", () => {
    const migrated = migrateVenueManifestToPackageV1(venues[0]);
    const screenAction = migrated.cueSets[0].cues
      .flatMap((cue) => cue.actions)
      .find((action) => action.type === "set-screen");

    expect(screenAction).toMatchObject({
      type: "set-screen",
      screenId: `${venues[0].id}-screen`,
    });
  });
});
