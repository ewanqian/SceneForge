# NDI and live media bridge

## Constraint

A normal browser cannot enumerate local NDI senders or load an `ndi://` URL. NDI discovery and decoding require native networking and codec access outside the browser sandbox.

## Recommended first bridge

Run a local sidecar on the same trusted show-network machine:

1. Discover/select an NDI source through the licensed NDI SDK or an approved capture pipeline.
2. Decode frames natively.
3. Encode a low-latency preview stream.
4. Publish it as WebRTC to SceneForge.
5. Expose a small authenticated API for source list, health, frame rate, resolution and latency.

The browser receives only standard WebRTC media. SceneForge should never expose unrestricted NDI discovery to arbitrary remote users.

## API sketch

```http
GET  /api/media/health
GET  /api/media/sources
POST /api/media/sources/{id}/session
DELETE /api/media/sessions/{id}
```

A session response should contain a short-lived signaling token, not permanent show-network credentials.

## Later adapters

- WebRTC/WHEP for local low-latency preview.
- HLS for remote approval and archive playback.
- Syphon/Spout/NDI native adapters in an Electron/Tauri or native companion, not in the public web bundle.
