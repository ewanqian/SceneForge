import {
  MeshRenderer,
  onStart,
  ScreenCapture,
  SyncedRoom,
  VideoPlayer,
  WebXR,
  XRRig,
} from "https://cdn.jsdelivr.net/npm/@needle-tools/engine@5.1.5/dist/needle-engine.min.js";
import * as THREE from "https://cdn.jsdelivr.net/npm/@needle-tools/engine@5.1.5/dist/three.min.js";

const params = new URLSearchParams(window.location.search);
const roomId = params.get("room")?.trim() || `entropy-${crypto.randomUUID().slice(0, 8)}`;
if (!params.get("room")) {
  params.set("room", roomId);
  history.replaceState(null, "", `${location.pathname}?${params}${location.hash}`);
}

const ui = {
  room: document.querySelector("#room-id"),
  secure: document.querySelector("#secure-state"),
  status: document.querySelector("#status"),
  shareScreen: document.querySelector("#share-screen"),
  stopShare: document.querySelector("#stop-share"),
  copyLink: document.querySelector("#copy-link"),
  viewFront: document.querySelector("#view-front"),
  viewWide: document.querySelector("#view-wide"),
  viewStage: document.querySelector("#view-stage"),
  resetStage: document.querySelector("#reset-stage"),
  toggleCeiling: document.querySelector("#toggle-ceiling"),
  brightness: document.querySelector("#screen-brightness"),
  brightnessValue: document.querySelector("#brightness-value"),
  hud: document.querySelector(".hud"),
  hideHud: document.querySelector("#hide-hud"),
  showHud: document.querySelector("#show-hud"),
  toggleMappingTest: document.querySelector("#toggle-mapping-test"),
  mappingSurface: document.querySelector("#mapping-surface"),
  mappingUOffset: document.querySelector("#mapping-u-offset"),
  mappingUOffsetValue: document.querySelector("#mapping-u-offset-value"),
  mappingVOffset: document.querySelector("#mapping-v-offset"),
  mappingVOffsetValue: document.querySelector("#mapping-v-offset-value"),
  mappingUScale: document.querySelector("#mapping-u-scale"),
  mappingUScaleValue: document.querySelector("#mapping-u-scale-value"),
  mappingVScale: document.querySelector("#mapping-v-scale"),
  mappingVScaleValue: document.querySelector("#mapping-v-scale-value"),
  mappingRotation: document.querySelector("#mapping-rotation"),
  mappingFlipU: document.querySelector("#mapping-flip-u"),
  mappingFlipV: document.querySelector("#mapping-flip-v"),
  resetMapping: document.querySelector("#reset-mapping"),
  uvCanvas: document.querySelector("#uv-canvas"),
  uvSelection: document.querySelector("#uv-selection"),
  uvHandles: document.querySelector("#uv-handles"),
  uvTopLabel: document.querySelector("#uv-top-label"),
  uvSurfaceLabel: document.querySelector("#uv-surface-label"),
};

ui.room.textContent = roomId;
ui.secure.textContent = window.isSecureContext ? "yes" : "no — screen capture will be blocked";

function setStatus(message, level = "info") {
  ui.status.textContent = message;
  ui.status.dataset.level = level;
}

function createCurvedScreenGeometry({
  chord = 12.4,
  arc = 15.2,
  height = 5.5,
  segments = 96,
} = {}) {
  // Solve the supplied arc/chord proportions approximately: 123.2° / R ≈ 7.06 m.
  const theta = 2.15;
  const radius = arc / theta;
  const half = theta / 2;
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let y = 0; y <= 1; y += 1) {
    for (let i = 0; i <= segments; i += 1) {
      const u = i / segments;
      const a = THREE.MathUtils.lerp(-half, half, u);
      const x = radius * Math.sin(a);
      // Edges are forward, centre is recessed: concave toward audience (+Z).
      const z = radius * Math.cos(half) - radius * Math.cos(a);
      positions.push(x, (y - 0.5) * height, z);
      uvs.push(u, y);
    }
  }

  for (let i = 0; i < segments; i += 1) {
    const a = i;
    const b = i + 1;
    const c = segments + 1 + i;
    const d = segments + 2 + i;
    indices.push(a, c, b, b, c, d);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.userData.chord = chord;
  geometry.userData.arc = arc;
  geometry.userData.radius = radius;
  return geometry;
}

function makeVenueGeometry(context) {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 16),
    new THREE.MeshStandardMaterial({ color: 0x0a0c0f, roughness: 0.86, metalness: 0.24 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 0);
  context.scene.add(floor);

  const grid = new THREE.GridHelper(20, 40, 0x313740, 0x171b21);
  grid.position.y = 0.006;
  context.scene.add(grid);

  const mainMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const mainScreen = new THREE.Mesh(createCurvedScreenGeometry(), mainMaterial);
  mainScreen.name = "EntropyMainCurvedLED";
  mainScreen.position.set(0, 3.25, -4.7);
  context.scene.add(mainScreen);

  // Photo-matched preview footprint: long axis runs left-to-right and the rear edge
  // sits close to the curved screen. Dimensions remain estimated until measured.
  const ceilingWidth = 6.6;
  const ceilingDepth = 4.4;
  const ceilingMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const ceilingGeometry = new THREE.PlaneGeometry(ceilingWidth, ceilingDepth);
  const ceilingScreen = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
  ceilingScreen.name = "EntropyCeilingLED";
  ceilingScreen.rotation.x = Math.PI / 2;
  ceilingScreen.position.set(0, 5.55, -2.45);
  context.scene.add(ceilingScreen);

  // Stage reference slab, not claimed as measured geometry.
  const stage = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 0.16, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x171a1f, roughness: 0.78 }),
  );
  stage.position.set(0, 0.08, -1.3);
  context.scene.add(stage);

  context.scene.add(new THREE.HemisphereLight(0xa9b6c6, 0x07090b, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 1.25);
  key.position.set(2, 7, 5);
  context.scene.add(key);

  return { mainScreen, ceilingScreen };
}

function setCameraPose(context, position, target) {
  const camera = context.mainCamera;
  if (!camera) return;
  camera.position.set(...position);
  camera.lookAt(new THREE.Vector3(...target));
  camera.updateMatrixWorld(true);
}

function applyUvMapping(geometry, baseUvs, route, adjustment) {
  const uvs = geometry.getAttribute("uv");
  const rotation = THREE.MathUtils.degToRad(adjustment.rotation);
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);

  for (let index = 0; index < uvs.count; index += 1) {
    let u = (baseUvs[index * 2] - 0.5) * route.uScale;
    let v = (baseUvs[index * 2 + 1] - 0.5) * route.vScale;
    if (route.flipU) u *= -1;
    if (route.flipV) v *= -1;

    u *= adjustment.uScale;
    v *= adjustment.vScale;
    const rotatedU = u * cosine - v * sine;
    const rotatedV = u * sine + v * cosine;
    uvs.setXY(
      index,
      0.5 + rotatedU * (adjustment.flipU ? -1 : 1) + adjustment.uOffset,
      0.5 + rotatedV * (adjustment.flipV ? -1 : 1) + adjustment.vOffset,
    );
  }

  uvs.needsUpdate = true;
}

onStart((context) => {
  const { mainScreen, ceilingScreen } = makeVenueGeometry(context);

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
  rig.name = "EntropyXRRig";
  rig.position.set(0, 0, 4.8);
  context.scene.add(rig);
  rig.addComponent(XRRig);

  const mainRenderer = mainScreen.addComponent(MeshRenderer);
  const player = mainScreen.addComponent(VideoPlayer, { playOnAwake: true });
  player.targetMaterialRenderer = mainRenderer;

  const capture = mainScreen.addComponent(ScreenCapture, {
    allowStartOnClick: false,
    autoConnect: false,
    device: "Screen",
  });

  let ceilingVisible = true;
  let raf = 0;
  let mappingTestActive = false;
  let mainMappingTexture = null;
  let texturesBeforeMappingTest = null;
  let localFallbackStream = null;

  const mappingDefaults = {
    main: {
      uOffset: 0,
      vOffset: 0,
      uScale: 1,
      vScale: 1,
      rotation: 0,
      flipU: false,
      flipV: false,
    },
    ceiling: {
      uOffset: 0,
      vOffset: 0,
      uScale: 1,
      vScale: 1,
      rotation: 0,
      flipU: false,
      flipV: false,
    },
  };
  const mappingSettings = structuredClone(mappingDefaults);
  const mappingSurfaces = {
    main: {
      geometry: mainScreen.geometry,
      baseUvs: Float32Array.from(mainScreen.geometry.getAttribute("uv").array),
    },
    ceiling: {
      geometry: ceilingScreen.geometry,
      baseUvs: Float32Array.from(ceilingScreen.geometry.getAttribute("uv").array),
    },
  };

  const getSourceRoute = (surfaceName) => {
    if (surfaceName === "main") {
      return { uScale: 1, vScale: 1, flipU: false, flipV: false };
    }
    return { uScale: 0.5, vScale: 1, flipU: false, flipV: true };
  };

  const updateSurfaceMapping = (surfaceName) => {
    const surface = mappingSurfaces[surfaceName];
    applyUvMapping(
      surface.geometry,
      surface.baseUvs,
      getSourceRoute(surfaceName),
      mappingSettings[surfaceName],
    );
  };

  const updateAllMappings = () => {
    updateSurfaceMapping("main");
    updateSurfaceMapping("ceiling");
  };

  const getMainDisplayMaterial = () => mainScreen.material;
  const getCeilingDisplayMaterial = () => ceilingScreen.material;

  const setScreenBrightness = (percent) => {
    const multiplier = Number(percent) / 100;
    const activeMainMaterial = getMainDisplayMaterial();
    const activeCeilingMaterial = getCeilingDisplayMaterial();
    activeMainMaterial.color.setRGB(multiplier, multiplier, multiplier);
    activeCeilingMaterial.color.setRGB(multiplier, multiplier, multiplier);
    activeMainMaterial.needsUpdate = true;
    activeCeilingMaterial.needsUpdate = true;
    ui.brightnessValue.value = `${percent}%`;
  };

  const renderUvEditor = () => {
    const surfaceName = ui.mappingSurface.value;
    const mapping = mappingSettings[surfaceName];
    const centerX = 20 + 360 * (0.5 + mapping.uOffset);
    const centerY = 25 + 200 * (0.5 - mapping.vOffset);
    const halfWidth = 180 * mapping.uScale;
    const halfHeight = 100 * mapping.vScale;
    const angle = THREE.MathUtils.degToRad(-mapping.rotation);
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const transformPoint = (x, y) => [
      centerX + x * cosine - y * sine,
      centerY + x * sine + y * cosine,
    ];
    const corners = [
      transformPoint(-halfWidth, -halfHeight),
      transformPoint(halfWidth, -halfHeight),
      transformPoint(halfWidth, halfHeight),
      transformPoint(-halfWidth, halfHeight),
    ];
    ui.uvSelection.setAttribute(
      "points",
      corners.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" "),
    );
    const handles = ui.uvHandles.querySelectorAll("[data-corner]");
    for (let index = 0; index < handles.length; index += 1) {
      handles[index].setAttribute("cx", corners[index][0]);
      handles[index].setAttribute("cy", corners[index][1]);
    }
    const rotatePoint = transformPoint(0, -halfHeight - 22);
    const rotateHandle = ui.uvHandles.querySelector("[data-action='rotate']");
    rotateHandle.setAttribute("cx", rotatePoint[0]);
    rotateHandle.setAttribute("cy", rotatePoint[1]);
    const topPoint = transformPoint(0, -halfHeight + 20);
    ui.uvTopLabel.setAttribute("x", topPoint[0]);
    ui.uvTopLabel.setAttribute("y", topPoint[1]);
    const effectiveFlipV = getSourceRoute(surfaceName).flipV !== mapping.flipV;
    ui.uvTopLabel.textContent = effectiveFlipV ? "BOTTOM ↕" : "TOP ↑";
    ui.uvSurfaceLabel.setAttribute("x", centerX);
    ui.uvSurfaceLabel.setAttribute("y", centerY + 5);
    ui.uvSurfaceLabel.textContent = surfaceName === "main" ? "MAIN 25:9" : "CEILING 8:9";
  };

  const syncMappingEditor = () => {
    const mapping = mappingSettings[ui.mappingSurface.value];
    ui.mappingUOffset.value = mapping.uOffset;
    ui.mappingVOffset.value = mapping.vOffset;
    ui.mappingUScale.value = mapping.uScale;
    ui.mappingVScale.value = mapping.vScale;
    ui.mappingRotation.value = mapping.rotation;
    ui.mappingFlipU.checked = mapping.flipU;
    ui.mappingFlipV.checked = mapping.flipV;
    ui.mappingUOffsetValue.value = mapping.uOffset.toFixed(2);
    ui.mappingVOffsetValue.value = mapping.vOffset.toFixed(2);
    ui.mappingUScaleValue.value = mapping.uScale.toFixed(2);
    ui.mappingVScaleValue.value = mapping.vScale.toFixed(2);
    renderUvEditor();
  };

  const updateSelectedMapping = () => {
    const surfaceName = ui.mappingSurface.value;
    const mapping = mappingSettings[surfaceName];
    mapping.uOffset = Number(ui.mappingUOffset.value);
    mapping.vOffset = Number(ui.mappingVOffset.value);
    mapping.uScale = Number(ui.mappingUScale.value);
    mapping.vScale = Number(ui.mappingVScale.value);
    mapping.rotation = Number(ui.mappingRotation.value);
    mapping.flipU = ui.mappingFlipU.checked;
    mapping.flipV = ui.mappingFlipV.checked;
    updateSurfaceMapping(surfaceName);
    syncMappingEditor();
    setStatus(`${surfaceName === "main" ? "Main" : "Ceiling"} UV mapping updated.`);
  };

  const commitGraphicalMapping = (surfaceName) => {
    updateSurfaceMapping(surfaceName);
    syncMappingEditor();
    setStatus(`${surfaceName === "main" ? "Main" : "Ceiling"} UV mapping updated.`);
  };

  const hideMappingTest = () => {
    if (!mappingTestActive) return;
    const activeMainMaterial = getMainDisplayMaterial();
    const activeCeilingMaterial = getCeilingDisplayMaterial();
    activeMainMaterial.map = texturesBeforeMappingTest.main;
    activeCeilingMaterial.map = texturesBeforeMappingTest.ceiling;
    activeMainMaterial.needsUpdate = true;
    activeCeilingMaterial.needsUpdate = true;
    mappingTestActive = false;
    updateAllMappings();
    ui.toggleMappingTest.textContent = "Show Mapping Test";
  };

  // Mirror the shared WebRTC/video texture. Ceiling geometry UVs apply the centre-half crop
  // without changing texture transforms used by the full-frame main screen.
  const syncCeilingTexture = () => {
    const source = getMainDisplayMaterial().map;
    const activeCeilingMaterial = getCeilingDisplayMaterial();
    if (!mappingTestActive && source && activeCeilingMaterial.map !== source) {
      activeCeilingMaterial.map = source;
      activeCeilingMaterial.needsUpdate = true;
    }
    raf = requestAnimationFrame(syncCeilingTexture);
  };
  syncCeilingTexture();

  const resetStage = () => {
    mainScreen.position.set(0, 3.25, -4.7);
    mainScreen.quaternion.identity();
    ceilingScreen.rotation.set(Math.PI / 2, 0, 0);
    ceilingScreen.position.set(0, 5.55, -2.45);
    setCameraPose(context, [0, 3.1, 7.8], [0, 2.7, -3.0]);
    setStatus("Stage reset to the ENTROPY preview origin.");
  };

  ui.shareScreen.addEventListener("click", async () => {
    if (!window.isSecureContext) {
      setStatus("Window/screen capture requires HTTPS or localhost.", "warn");
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setStatus("This browser does not support window/screen capture.", "error");
      return;
    }
    ui.shareScreen.disabled = true;
    setStatus("Opening the system window/screen picker…");
    try {
      hideMappingTest();
      const selectedStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 24 }, width: { max: 2560 }, height: { max: 1440 } },
        audio: false,
      });
      if (context.connection.isInRoom && typeof capture.setStream === "function") {
        // ScreenCapture blocks its own picker until networking is ready. Starting native
        // capture first keeps window selection responsive, then hands the stream to Needle.
        capture.setStream(selectedStream, 1);
        setStatus("Live share started. Both screens read the same source.");
      } else {
        localFallbackStream = selectedStream;
        player.setVideo(localFallbackStream);
        player.muted = true;
        for (const track of localFallbackStream.getTracks()) {
          track.addEventListener("ended", () => {
            localFallbackStream = null;
            setStatus("Window share stopped.");
          });
        }
        setStatus("Local window share started. Networking room is still connecting.", "warn");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setStatus("Window selection cancelled or permission denied.", "warn");
      } else {
        console.error(error);
        setStatus(
          `Capture did not start: ${error instanceof Error ? error.message : String(error)}`,
          "error",
        );
      }
    } finally {
      ui.shareScreen.disabled = false;
    }
  });

  ui.stopShare.addEventListener("click", () => {
    capture.close();
    if (localFallbackStream) {
      for (const track of localFallbackStream.getTracks()) track.stop();
      localFallbackStream = null;
    }
    setStatus("Live share stopped.");
  });

  ui.copyLink.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      setStatus("Room URL copied. Open the same URL on Vision Pro Safari.");
    } catch {
      setStatus("Clipboard permission failed. Copy the browser address manually.", "warn");
    }
  });

  ui.viewFront.addEventListener("click", () => {
    setCameraPose(context, [0, 3.1, 7.8], [0, 2.7, -3.0]);
    setStatus("Front-of-house camera.");
  });

  ui.viewWide.addEventListener("click", () => {
    setCameraPose(context, [8.5, 6.6, 9.5], [0, 2.7, -2.3]);
    setStatus("Wide venue overview.");
  });

  ui.viewStage.addEventListener("click", () => {
    setCameraPose(context, [-2.8, 1.8, -0.1], [2.0, 3.0, -4.4]);
    setStatus("Stage-side camera.");
  });

  ui.resetStage.addEventListener("click", resetStage);
  ui.toggleCeiling.addEventListener("click", () => {
    ceilingVisible = !ceilingVisible;
    ceilingScreen.visible = ceilingVisible;
    ui.toggleCeiling.textContent = ceilingVisible ? "Hide Ceiling" : "Show Ceiling";
    setStatus(ceilingVisible ? "Ceiling LED visible." : "Ceiling LED hidden.");
  });

  ui.brightness.addEventListener("input", () => {
    setScreenBrightness(ui.brightness.value);
  });

  ui.hideHud.addEventListener("click", () => {
    ui.hud.hidden = true;
    ui.showHud.hidden = false;
  });

  ui.showHud.addEventListener("click", () => {
    ui.hud.hidden = false;
    ui.showHud.hidden = true;
  });

  ui.toggleMappingTest.addEventListener("click", async () => {
    if (mappingTestActive) {
      hideMappingTest();
      setStatus("Mapping test hidden.");
      return;
    }

    try {
      const loader = new THREE.TextureLoader();
      mainMappingTexture ??= await loader.loadAsync(
        new URL("./mapping-main-2500x900.svg", import.meta.url).href,
      );
      mainMappingTexture.colorSpace = THREE.SRGBColorSpace;
      const activeMainMaterial = getMainDisplayMaterial();
      const activeCeilingMaterial = getCeilingDisplayMaterial();
      texturesBeforeMappingTest = {
        main: activeMainMaterial.map,
        ceiling: activeCeilingMaterial.map,
      };
      activeMainMaterial.map = mainMappingTexture;
      activeCeilingMaterial.map = mainMappingTexture;
      activeMainMaterial.needsUpdate = true;
      activeCeilingMaterial.needsUpdate = true;
      mappingTestActive = true;
      updateAllMappings();
      ui.toggleMappingTest.textContent = "Hide Mapping Test";
      setStatus(
        "Mapping test active: both screens read the same source; ceiling uses center crop.",
      );
    } catch (error) {
      setStatus(
        `Mapping test failed: ${error instanceof Error ? error.message : String(error)}`,
        "error",
      );
    }
  });

  ui.mappingSurface.addEventListener("change", syncMappingEditor);
  for (const control of [
    ui.mappingUOffset,
    ui.mappingVOffset,
    ui.mappingUScale,
    ui.mappingVScale,
    ui.mappingRotation,
    ui.mappingFlipU,
    ui.mappingFlipV,
  ]) {
    control.addEventListener("input", updateSelectedMapping);
  }

  ui.resetMapping.addEventListener("click", () => {
    const surfaceName = ui.mappingSurface.value;
    mappingSettings[surfaceName] = structuredClone(mappingDefaults[surfaceName]);
    updateSurfaceMapping(surfaceName);
    syncMappingEditor();
    setStatus(`${surfaceName === "main" ? "Main" : "Ceiling"} UV mapping reset.`);
  });

  let uvDrag = null;
  const getUvCanvasPoint = (event) => {
    const bounds = ui.uvCanvas.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * 400,
      y: ((event.clientY - bounds.top) / bounds.height) * 250,
    };
  };

  ui.uvCanvas.addEventListener("pointerdown", (event) => {
    const action = event.target.dataset.action;
    if (!action) return;
    const surfaceName = ui.mappingSurface.value;
    const point = getUvCanvasPoint(event);
    uvDrag = {
      action,
      pointerId: event.pointerId,
      surfaceName,
      startPoint: point,
      startMapping: structuredClone(mappingSettings[surfaceName]),
    };
    ui.uvCanvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  ui.uvCanvas.addEventListener("pointermove", (event) => {
    if (!uvDrag || uvDrag.pointerId !== event.pointerId) return;
    const point = getUvCanvasPoint(event);
    const mapping = mappingSettings[uvDrag.surfaceName];
    const start = uvDrag.startMapping;

    if (uvDrag.action === "move") {
      mapping.uOffset = THREE.MathUtils.clamp(
        start.uOffset + (point.x - uvDrag.startPoint.x) / 360,
        -1,
        1,
      );
      mapping.vOffset = THREE.MathUtils.clamp(
        start.vOffset - (point.y - uvDrag.startPoint.y) / 200,
        -1,
        1,
      );
    } else if (uvDrag.action === "scale") {
      const centerX = 20 + 360 * (0.5 + start.uOffset);
      const centerY = 25 + 200 * (0.5 - start.vOffset);
      const angle = THREE.MathUtils.degToRad(start.rotation);
      const deltaX = point.x - centerX;
      const deltaY = point.y - centerY;
      const localX = deltaX * Math.cos(angle) - deltaY * Math.sin(angle);
      const localY = deltaX * Math.sin(angle) + deltaY * Math.cos(angle);
      mapping.uScale = THREE.MathUtils.clamp(Math.abs(localX) / 180, 0.1, 2);
      mapping.vScale = THREE.MathUtils.clamp(Math.abs(localY) / 100, 0.1, 2);
    } else if (uvDrag.action === "rotate") {
      const centerX = 20 + 360 * (0.5 + start.uOffset);
      const centerY = 25 + 200 * (0.5 - start.vOffset);
      const angle = THREE.MathUtils.radToDeg(Math.atan2(point.y - centerY, point.x - centerX));
      mapping.rotation = (((Math.round((-angle - 90) / 90) * 90) % 360) + 360) % 360;
    }

    commitGraphicalMapping(uvDrag.surfaceName);
  });

  const endUvDrag = (event) => {
    if (!uvDrag || uvDrag.pointerId !== event.pointerId) return;
    ui.uvCanvas.releasePointerCapture(event.pointerId);
    uvDrag = null;
  };
  ui.uvCanvas.addEventListener("pointerup", endUvDrag);
  ui.uvCanvas.addEventListener("pointercancel", endUvDrag);

  window.addEventListener("pagehide", () => cancelAnimationFrame(raf), { once: true });

  resetStage();
  setScreenBrightness(ui.brightness.value);
  updateAllMappings();
  syncMappingEditor();
  ui.toggleCeiling.textContent = "Hide Ceiling";
  setStatus(`Ready in room ${roomId}. Use Pick Window / Screen on the source computer.`);
});
