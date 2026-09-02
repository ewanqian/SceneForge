# Needle XR Room experiment

Status: **v0.2.0 experimental**  
Runtime: **Needle Engine 5.1.5 stable**  
Public prototype: `public/needle-room/`

This experiment validates one narrow SceneForge loop before the main R3F viewer adopts any new networking dependency:

`desktop screen / camera / NDI virtual input -> WebRTC room -> 3D screen -> Vision Pro WebXR`

## Why it is isolated

SceneForge's production viewer currently uses React Three Fiber + Three.js r185. Needle Engine 5.1.5 is tested here as a standalone web runtime so its own Three.js runtime, XR lifecycle and networking code cannot destabilize the main viewer. If the experiment passes device tests, SceneForge can extract a transport contract instead of rewriting the application around Needle.

The prototype is served as static files from Vite's `public/` directory. Root `npm run verify` therefore stays unchanged.

## Fast test

After this branch reaches the deployed `main` branch:

1. Open `/needle-room/` on the desktop sender.
2. Copy the generated room URL.
3. Open the same URL in Safari on Apple Vision Pro.
4. On desktop, click **Share Screen** and choose a display/window/tab.
5. On Vision Pro, use Needle's **Enter VR** control.
6. Confirm that the shared video keeps updating while immersive.
7. Use **Screen Ahead** if the video plane is behind or far from the current viewer pose.

Screen capture requires a secure context. Use the HTTPS GitHub Pages deployment (or trusted local HTTPS), not a plain `http://192.168.x.x` URL.

## Fast NDI test without writing a bridge

The browser cannot enumerate or decode NDI directly. For the first LAN test, use the official NDI virtual camera tools:

- Windows: NDI Webcam Input.
- macOS: NDI Virtual Input.

Select the desired NDI source in the NDI tool. It becomes a standard system camera/audio source. In SceneForge Needle Room, click **Camera / NDI**. The remaining route is ordinary browser capture + Needle WebRTC, so the Vision Pro receiver does not need NDI support.

This validates the user-facing workflow before SceneForge spends time on a custom NDI sidecar.

## Custom networking backend

Needle's managed room backend is used by default for v0.2. For a self-hosted server, open the page with:

```text
?room=my-room&networking=wss://your-trusted-host/socket
```

Use a certificate trusted by both desktop and Vision Pro. A LAN websocket endpoint alone does not remove the HTTPS/security requirements of screen capture and WebXR.

## Model loading

The prototype accepts:

- remote HTTPS GLB/glTF URLs;
- local `.glb` files.

Local `.gltf` folders are intentionally not supported in this first UI because their external textures/buffers cannot be reconstructed reliably from a single file input. Prefer GLB when handing a model to the prototype.

v0.2 model selection is local. Synchronizing a model URL/transform to all room participants is planned after the live-video/XR path is proven.

## v0.2 acceptance

- Desktop 3D scene boots from the deployed HTTPS URL.
- Two browsers with the same `room` parameter join the same Needle room.
- Share Screen displays on the 3D video plane for the second browser.
- Camera capture also displays remotely.
- NDI Webcam Input / Virtual Input can be used through the camera path.
- Vision Pro can enter `immersive-vr`.
- The remote video texture continues updating in immersive mode for at least 10 minutes.
- Reset Stage and Screen Ahead remain usable before/after entering XR.
- A remote GLB and a local GLB can be loaded without rebuilding SceneForge.

The immersive video-refresh check is intentionally explicit because an older Needle/Vision Pro report showed frozen video textures in VR; a later visionOS beta report said the platform update resolved it, but the upstream issue is still open.
