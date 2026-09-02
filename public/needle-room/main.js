import {
  AssetReference,
  MeshRenderer,
  Networking,
  ScreenCapture,
  SyncedRoom,
  VideoPlayer,
  WebXR,
  XRRig,
  onStart,
} from "https://cdn.jsdelivr.net/npm/@needle-tools/engine@5.1.5/dist/needle-engine.min.js";
import * as THREE from "https://cdn.jsdelivr.net/npm/@needle-tools/engine@5.1.5/dist/three.min.js";

const params = new URLSearchParams(window.location.search);
const roomId = params.get("room")?.trim() || `sceneforge-${crypto.randomUUID().slice(0, 8)}`;
const networkUrl = params.get("networking")?.trim();

if (!params.get("room")) {
  params.set("room", roomId);
  history.replaceState(null, "", `${location.pathname}?${params}${location.hash}`);
}

const ui = {
  room: document.querySelector("#room-id"),
  secure: document.querySelector("#secure-state"),
  status: document.querySelector("#status"),
  shareScreen: document.querySelector("#share-screen"),
  shareCamera: document.querySelector("#share-camera"),
  stopShare: document.querySelector("#stop-share"),
  resetStage: document.querySelector("#reset-stage"),
  placeScreen: document.querySelector("#place-screen"),
  copyLink: document.querySelector("#copy-link"),
  modelUrl: document.querySelector("#model-url"),
  loadUrl: document.querySelector("#load-url"),
  modelFile: document.querySelector("#model-file"),
  clearModel: document.querySelector("#clear-model"),
};

ui.room.textContent = roomId;
ui.secure.textContent = window.isSecureContext ? "yes" : "no — screen capture may be blocked";

function setStatus(message, level = "info") {
  ui.status.textContent = message;
  ui.status.dataset.level = level;
}

function makeRoomGeometry(context) {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 14),
    new THREE.MeshStandardMaterial({ color: 0x11151b, roughness: 0.94, metalness: 0.04 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.001;
  context.scene.add(floor);

  const grid = new THREE.GridHelper(14, 28, 0x3b4653, 0x1d242c);
  grid.position.y = 0.003;
  context.scene.add(grid);

  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(3, 6, 4);
  context.scene.add(key);
  context.scene.add(new THREE.HemisphereLight(0x9eb7d2, 0x11141a, 1.25));
}

onStart((context) => {
  makeRoomGeometry(context);

  if (networkUrl) {
    context.scene.addComponent(Networking, {
      url: networkUrl,
      localhost: networkUrl,
      urlParameterName: "networking",
    });
  }

  context.scene.addComponent(SyncedRoom, {
    roomName: roomId,
    urlParameterName: "room",
    requireRoomParameter: false,
    autoRejoin: true,
    createJoinButton: false,
    createViewOnlyButton: false,
  });

  context.scene.addComponent(WebXR, {
    createVRButton: true,
    createARButton: false,
    createQRCode: true,
    showHandModels: true,
    useDefaultControls: true,
  });

  const rig = new THREE.Object3D();
  rig.name = "SceneForgeXRRig";
  rig.position.set(0, 0, 3.2);
  context.scene.add(rig);
  rig.addComponent(XRRig);

  const screenMaterial = new THREE.MeshBasicMaterial({
    color: 0x151b24,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.8), screenMaterial);
  screen.name = "SceneForgeSharedScreen";
  screen.position.set(0, 1.65, 0);
  context.scene.add(screen);

  const screenRenderer = screen.addComponent(MeshRenderer);
  const videoPlayer = screen.addComponent(VideoPlayer, { playOnAwake: true });
  videoPlayer.targetMaterialRenderer = screenRenderer;
  const capture = screen.addComponent(ScreenCapture, {
    allowStartOnClick: false,
    autoConnect: false,
    device: "Screen",
  });

  let loadedModel = null;
  let loadedAsset = null;
  let localModelUrl = null;

  const resetStage = () => {
    screen.position.set(0, 1.65, 0);
    screen.quaternion.identity();
    screen.scale.setScalar(1);
    if (loadedModel) {
      loadedModel.position.set(0, 0, -1.8);
      loadedModel.quaternion.identity();
      loadedModel.scale.setScalar(1);
    }
    setStatus("Stage reset to the shared world origin.");
  };

  const placeScreenAhead = () => {
    const camera = context.mainCamera;
    if (!camera) return;
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const forward = new THREE.Vector3(0, 0, -1);
    camera.getWorldPosition(position);
    camera.getWorldQuaternion(quaternion);
    forward.applyQuaternion(quaternion);
    screen.position.copy(position).addScaledVector(forward, 2.2);
    screen.quaternion.copy(quaternion);
    setStatus("Screen placed 2.2 m in front of the current viewer pose.");
  };

  const clearModel = () => {
    if (loadedModel) loadedModel.removeFromParent();
    loadedModel = null;
    if (loadedAsset) loadedAsset.unload();
    loadedAsset = null;
    if (localModelUrl) URL.revokeObjectURL(localModelUrl);
    localModelUrl = null;
  };

  const loadModel = async (url, isLocal = false) => {
    clearModel();
    setStatus("Loading model…");
    try {
      if (isLocal) localModelUrl = url;
      loadedAsset = AssetReference.getOrCreateFromUrl(url);
      loadedModel = await loadedAsset.loadAssetAsync();
      if (!loadedModel) throw new Error("Needle returned no model instance");
      loadedModel.position.set(0, 0, -1.8);
      context.scene.add(loadedModel);
      setStatus("Model loaded. v0.2 keeps model selection local; room-sync follows in v0.3+.");
    } catch (error) {
      console.error(error);
      clearModel();
      setStatus(`Model load failed: ${error instanceof Error ? error.message : String(error)}`, "error");
    }
  };

  ui.shareScreen.addEventListener("click", async () => {
    if (!window.isSecureContext) {
      setStatus("Screen capture requires HTTPS (or localhost). Open the deployed GitHub Pages URL.", "warn");
      return;
    }
    setStatus("Waiting for browser screen/window picker…");
    try {
      await capture.share({ device: "Screen" });
      setStatus("Screen sharing started. Open this same room URL on Vision Pro and enter WebXR.");
    } catch (error) {
      console.error(error);
      setStatus(`Screen sharing did not start: ${error instanceof Error ? error.message : String(error)}`, "error");
    }
  });

  ui.shareCamera.addEventListener("click", async () => {
    setStatus("Requesting camera. For NDI, select/use NDI Webcam Input (Windows) or Virtual Input (macOS).");
    try {
      await capture.share({ device: "Camera", constraints: { width: 1920, height: 1080 } });
      setStatus("Camera stream started. NDI virtual-camera sources use this exact path.");
    } catch (error) {
      console.error(error);
      setStatus(`Camera sharing did not start: ${error instanceof Error ? error.message : String(error)}`, "error");
    }
  });

  ui.stopShare.addEventListener("click", () => {
    capture.close();
    setStatus("Live share stopped.");
  });

  ui.resetStage.addEventListener("click", resetStage);
  ui.placeScreen.addEventListener("click", placeScreenAhead);

  ui.copyLink.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      setStatus("Room URL copied. Open it on Vision Pro Safari.");
    } catch {
      setStatus("Could not access clipboard. Copy the current address manually.", "warn");
    }
  });

  ui.loadUrl.addEventListener("click", () => {
    const url = ui.modelUrl.value.trim();
    if (!url) return;
    void loadModel(url);
  });

  ui.modelFile.addEventListener("change", () => {
    const file = ui.modelFile.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    void loadModel(objectUrl, true);
  });

  ui.clearModel.addEventListener("click", () => {
    clearModel();
    setStatus("Loaded model cleared.");
  });

  resetStage();
  setStatus(
    networkUrl
      ? `Ready in room ${roomId}; custom networking backend: ${networkUrl}`
      : `Ready in room ${roomId}; using Needle managed networking for the v0.2 prototype.`,
  );
});
