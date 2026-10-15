import { describe, expect, it } from "vitest";
import { minimalSceneForgePackageFixture } from "../domain/sceneforge-package/fixtures";
import type { SceneForgeCamera, SceneForgeCue } from "../domain/sceneforge-package/schema";
import type { MediaSourceDescriptor } from "../lib/media-source";
import { R3FRuntimeAdapter, type R3FRuntimePort } from "./r3f-runtime-adapter";
import type { MediaSurfaceBinding } from "./runtime-adapter";

class ConformancePort implements R3FRuntimePort {
  loadedPackageId?: string;
  appliedCue?: SceneForgeCue;
  selectedCamera?: SceneForgeCamera;
  boundSource?: MediaSourceDescriptor;
  disposed = false;

  loadScene(packageDefinition: typeof minimalSceneForgePackageFixture) {
    this.loadedPackageId = packageDefinition.metadata.id;
  }

  applyCue(cue: SceneForgeCue) {
    this.appliedCue = cue;
  }

  selectCamera(camera: SceneForgeCamera) {
    this.selectedCamera = camera;
  }

  bindMediaSurface(
    screen: (typeof minimalSceneForgePackageFixture)["screens"][number],
    source: MediaSourceDescriptor,
  ): MediaSurfaceBinding {
    this.boundSource = source;
    return { screenId: screen.id, sourceId: source.id, release: () => undefined };
  }

  reportXRCapabilities() {
    return { webXR: true, immersiveVr: true, immersiveAr: false };
  }

  disposeScene() {
    this.disposed = true;
  }
}

describe("R3F runtime adapter conformance", () => {
  it("implements the portable scene, cue, camera, media and XR boundary", async () => {
    const port = new ConformancePort();
    const adapter = new R3FRuntimeAdapter(port);
    const scene = await adapter.loadScene(minimalSceneForgePackageFixture);
    const cue = minimalSceneForgePackageFixture.cueSets[0].cues[0];
    const camera = minimalSceneForgePackageFixture.cameras[0];
    const mediaSource: MediaSourceDescriptor = {
      id: "local-preview",
      label: "Local preview",
      kind: "local-file",
      url: "blob:preview",
      lowLatency: true,
    };

    await adapter.applyCue(scene, cue);
    await adapter.selectCamera(scene, camera);
    const binding = await adapter.bindMediaSurface(
      scene,
      minimalSceneForgePackageFixture.screens[0],
      mediaSource,
    );
    const capabilities = await adapter.reportXRCapabilities();
    await adapter.disposeScene(scene);

    expect(port.loadedPackageId).toBe("fixture-stage");
    expect(port.appliedCue?.id).toBe("look-one");
    expect(port.selectedCamera?.id).toBe("front");
    expect(binding).toMatchObject({ screenId: "main-screen", sourceId: "local-preview" });
    expect(capabilities).toEqual({ webXR: true, immersiveVr: true, immersiveAr: false });
    expect(port.disposed).toBe(true);
  });

  it("rejects scene handles created by another runtime", async () => {
    const adapter = new R3FRuntimeAdapter(new ConformancePort());
    await expect(
      adapter.selectCamera({ packageId: "foreign" }, minimalSceneForgePackageFixture.cameras[0]),
    ).rejects.toThrow("not created by the R3F adapter");
  });
});
