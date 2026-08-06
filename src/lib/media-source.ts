export type MediaSourceKind = "local-file" | "web-url" | "webrtc-bridge";

export interface MediaSourceDescriptor {
  id: string;
  label: string;
  kind: MediaSourceKind;
  url: string;
  lowLatency: boolean;
}

export const ndiBridgeContract = {
  protocol: "webrtc",
  signalingPath: "/api/media/sources/:sourceId/session",
  healthPath: "/api/media/health",
  note: "Browsers cannot enumerate or decode NDI sources directly. A trusted local bridge must convert NDI to a browser transport.",
} as const;
