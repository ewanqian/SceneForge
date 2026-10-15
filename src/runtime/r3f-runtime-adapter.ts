import { parseSceneForgePackageV1 } from "../domain/sceneforge-package/schema";
import type { MediaSourceDescriptor } from "../lib/media-source";
import type {
  MediaSurfaceBinding,
  RuntimeAdapter,
  RuntimeSceneHandle,
  XRCapabilityReport,
} from "./runtime-adapter";
import type {
  SceneForgeCamera,
  SceneForgeCue,
  SceneForgePackageV1,
  SceneForgeScreen,
} from "../domain/sceneforge-package/schema";

export interface R3FRuntimePort {
  loadScene(packageDefinition: SceneForgePackageV1): void | Promise<void>;
  applyCue(cue: SceneForgeCue): void | Promise<void>;
  selectCamera(camera: SceneForgeCamera): void | Promise<void>;
  bindMediaSurface(
    screen: SceneForgeScreen,
    source: MediaSourceDescriptor,
  ): MediaSurfaceBinding | Promise<MediaSurfaceBinding>;
  reportXRCapabilities(): XRCapabilityReport | Promise<XRCapabilityReport>;
  disposeScene(): void | Promise<void>;
}

interface LoadedR3FScene extends RuntimeSceneHandle {
  readonly packageDefinition: SceneForgePackageV1;
}

export class R3FRuntimeAdapter implements RuntimeAdapter {
  readonly id = "org.sceneforge.r3f";
  private readonly loadedScenes = new WeakSet<RuntimeSceneHandle>();

  constructor(private readonly port: R3FRuntimePort) {}

  async loadScene(packageDefinition: SceneForgePackageV1): Promise<LoadedR3FScene> {
    const validatedPackage = parseSceneForgePackageV1(packageDefinition);
    await this.port.loadScene(validatedPackage);
    const scene = { packageId: validatedPackage.metadata.id, packageDefinition: validatedPackage };
    this.loadedScenes.add(scene);
    return scene;
  }

  async applyCue(scene: RuntimeSceneHandle, cue: SceneForgeCue): Promise<void> {
    this.assertScene(scene);
    await this.port.applyCue(cue);
  }

  async selectCamera(scene: RuntimeSceneHandle, camera: SceneForgeCamera): Promise<void> {
    this.assertScene(scene);
    await this.port.selectCamera(camera);
  }

  async bindMediaSurface(
    scene: RuntimeSceneHandle,
    screen: SceneForgeScreen,
    source: MediaSourceDescriptor,
  ): Promise<MediaSurfaceBinding> {
    this.assertScene(scene);
    return this.port.bindMediaSurface(screen, source);
  }

  async reportXRCapabilities(): Promise<XRCapabilityReport> {
    return this.port.reportXRCapabilities();
  }

  async disposeScene(scene: RuntimeSceneHandle): Promise<void> {
    this.assertScene(scene);
    await this.port.disposeScene();
    this.loadedScenes.delete(scene);
  }

  private assertScene(scene: RuntimeSceneHandle): asserts scene is LoadedR3FScene {
    if (!this.loadedScenes.has(scene)) {
      throw new Error("The scene handle was not created by the R3F adapter");
    }
  }
}
