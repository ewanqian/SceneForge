import { useEffect, useMemo } from "react";
import * as THREE from "three";

interface ScreenSurfaceProps {
  color: string;
  emissiveIntensity: number;
  videoUrl?: string;
  side?: THREE.Side;
}

export function ScreenSurface({ color, emissiveIntensity, videoUrl, side }: ScreenSurfaceProps) {
  const video = useMemo(() => {
    if (!videoUrl) return undefined;

    const element = document.createElement("video");
    element.src = videoUrl;
    element.loop = true;
    element.muted = true;
    element.playsInline = true;
    element.crossOrigin = "anonymous";
    return element;
  }, [videoUrl]);

  const texture = useMemo(() => {
    if (!video) return undefined;
    const nextTexture = new THREE.VideoTexture(video);
    nextTexture.colorSpace = THREE.SRGBColorSpace;
    nextTexture.minFilter = THREE.LinearFilter;
    nextTexture.magFilter = THREE.LinearFilter;
    return nextTexture;
  }, [video]);

  useEffect(() => {
    if (!video) return;
    void video.play().catch(() => undefined);
    return () => {
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [video]);

  useEffect(() => () => texture?.dispose(), [texture]);

  return (
    <meshStandardMaterial
      color={videoUrl ? "#ffffff" : color}
      emissive={videoUrl ? "#ffffff" : color}
      emissiveIntensity={emissiveIntensity}
      map={texture}
      roughness={0.34}
      toneMapped={!videoUrl}
      side={side}
    />
  );
}
