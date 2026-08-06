import { AdaptiveDpr, OrbitControls, Preload } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { XR, createXRStore } from "@react-three/xr";
import { Suspense } from "react";
import type { CameraPreset, VenueManifest, ViewerState } from "../domain/scene";
import { CameraRig } from "./CameraRig";
import { VenueScene } from "./VenueScene";

export const xrStore = createXRStore();

interface StageCanvasProps {
  venue: VenueManifest;
  cameraPreset: CameraPreset;
  viewerState: ViewerState;
  videoUrl?: string;
}

export function StageCanvas({ venue, cameraPreset, viewerState, videoUrl }: StageCanvasProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: cameraPreset.position, fov: 54, near: 0.08, far: 180 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <XR store={xrStore}>
        <Suspense fallback={null}>
          <CameraRig preset={cameraPreset} />
          <VenueScene venue={venue} viewerState={viewerState} videoUrl={videoUrl} />
          <OrbitControls
            makeDefault
            target={cameraPreset.target}
            minDistance={2}
            maxDistance={70}
            maxPolarAngle={Math.PI * 0.49}
          />
          <AdaptiveDpr pixelated />
          <Preload all />
        </Suspense>
      </XR>
    </Canvas>
  );
}
