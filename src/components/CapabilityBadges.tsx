import type { RuntimeCapabilities } from "../lib/capabilities";

interface CapabilityBadgesProps {
  capabilities?: RuntimeCapabilities;
}

export function CapabilityBadges({ capabilities }: CapabilityBadgesProps) {
  const entries = [
    ["WebGL2", capabilities?.webgl2],
    ["WebGPU", capabilities?.webgpu],
    ["WebXR", capabilities?.webxr],
    ["Immersive VR", capabilities?.immersiveVr],
  ] as const;

  return (
    <div className="capability-row" aria-label="Runtime capabilities">
      {entries.map(([label, enabled]) => (
        <span
          className={`capability ${enabled ? "capability--on" : "capability--off"}`}
          key={label}
        >
          {label}
        </span>
      ))}
      {capabilities?.likelyVisionOS && <span className="capability capability--vision">visionOS</span>}
    </div>
  );
}
