import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import type { CameraPreset } from "../domain/scene";

interface CameraRigProps {
  preset: CameraPreset;
}

export function CameraRig({ preset }: CameraRigProps) {
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    camera.position.fromArray(preset.position);
    camera.lookAt(new THREE.Vector3().fromArray(preset.target));
    if (camera instanceof THREE.PerspectiveCamera || camera instanceof THREE.OrthographicCamera) {
      camera.updateProjectionMatrix();
    }
  }, [camera, preset]);

  return null;
}
