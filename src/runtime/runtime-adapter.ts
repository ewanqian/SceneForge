import type { MediaSourceDescriptor } from "../lib/media-source";
import type {
  SceneForgeCamera,
  SceneForgeCue,
  SceneForgePackageV1,
  SceneForgeScreen,
} from "../domain/sceneforge-package/schema";

export interface RuntimeSceneHandle {
  readonly packageId: string;
}

export interface MediaSurfaceBinding {
  readonly screenId: string;
  readonly sourceId: string;
  release(): void | Promise<void>;
}

export interface XRCapabilityReport {
  webXR: boolean;
  immersiveVr: boolean;
  immersiveAr: boolean;
  reason?: string;
}

export interface RuntimeAdapter {
  readonly id: string;
  loadScene(packageDefinition: SceneForgePackageV1): Promise<RuntimeSceneHandle>;
  applyCue(scene: RuntimeSceneHandle, cue: SceneForgeCue): Promise<void>;
  selectCamera(scene: RuntimeSceneHandle, camera: SceneForgeCamera): Promise<void>;
  bindMediaSurface(
    scene: RuntimeSceneHandle,
    screen: SceneForgeScreen,
    source: MediaSourceDescriptor,
  ): Promise<MediaSurfaceBinding>;
  reportXRCapabilities(): Promise<XRCapabilityReport>;
  disposeScene(scene: RuntimeSceneHandle): Promise<void>;
}
