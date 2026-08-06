export interface RuntimeCapabilities {
  webgl2: boolean;
  webgpu: boolean;
  webxr: boolean;
  immersiveVr: boolean;
  likelyVisionOS: boolean;
}

interface XRSystemLike {
  isSessionSupported(mode: "immersive-vr" | "immersive-ar"): Promise<boolean>;
}

type NavigatorWithSpatialAPIs = Navigator & {
  gpu?: unknown;
  xr?: XRSystemLike;
};

export async function detectCapabilities(): Promise<RuntimeCapabilities> {
  const spatialNavigator = navigator as NavigatorWithSpatialAPIs;
  const canvas = document.createElement("canvas");
  const webgl2 = Boolean(canvas.getContext("webgl2"));
  const webgpu = Boolean(spatialNavigator.gpu);
  const webxr = Boolean(spatialNavigator.xr);
  const immersiveVr = spatialNavigator.xr
    ? await spatialNavigator.xr.isSessionSupported("immersive-vr").catch(() => false)
    : false;

  const ua = navigator.userAgent;
  const likelyVisionOS =
    immersiveVr && /AppleWebKit/i.test(ua) && /Macintosh/i.test(ua) && navigator.maxTouchPoints > 0;

  return { webgl2, webgpu, webxr, immersiveVr, likelyVisionOS };
}
