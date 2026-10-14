// Stage Replica — Sphere / Immersive Dome.
//
// V1 scope: dome mapping, four cue states, one own procedural source with a
// fallback path, four viewpoints and a program/quad director. No WebRTC in V1.
//
// Deterministic review entry points:
//   ?t=<seconds>   seek the cue to an exact time and hold (deterministic stills)
//   ?view=<id>     AUDIENCE_CENTER | AUDIENCE_LEFT | STAGE_LOOKBACK | DEBUG_ORBIT
//   ?mode=<id>     front-window | mirror-extend | shader-fill | square-master
//   ?quad=0|1      quad preview on/off
//   ?hud=0|1       chrome on/off (for clean capture)
//   ?drop=1        simulate the source dropping (live -> fallback -> offline)
//   ?record=1      deterministic 32s single pass at a fixed step

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { aspectOf, fitWindowRect } from "../shared/fit-math.js";

const SOURCE_WIDTH = 1280;
const SOURCE_HEIGHT = 720;

const params = new URLSearchParams(location.search);
const sceneJson = await (await fetch("./scene.json")).json();
const structure = sceneJson.structure;
const cueConfig = sceneJson.cue;
const presetCameras = sceneJson.cameras;
const adaptationModes = sceneJson.adaptationModes;

// Cue behaviour lives here; venue geometry lives in scene.json (see AGENTS.md).
const STATE_PARAMS = {
  HORIZON: { elevMax: 0.3, azMax: 0.55, bright: 0.34, density: 0.16, aperture: 0 },
  ENCLOSE: { elevMax: 0.86, azMax: 1.55, bright: 0.62, density: 0.44, aperture: 0 },
  // FULL_FIELD deliberately overshoots PI so the fixed feather finishes outside the dome.
  FULL_FIELD: {
    elevMax: Math.PI / 2 + 0.25,
    azMax: Math.PI + 0.4,
    bright: 0.96,
    density: 0.86,
    aperture: 0,
  },
  APERTURE: { elevMax: 0.62, azMax: 0.24, bright: 1, density: 0.6, aperture: 1 },
};

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);
const easeInOut = (value) => value * value * (3 - 2 * value);
const pseudo = (seed) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};

// ---------------------------------------------------------------- cue timeline
function evaluateCue(time) {
  const duration = cueConfig.durationSec;
  const clamped = clamp(time, 0, duration - 0.001);
  let index = cueConfig.states.findIndex((state) => clamped >= state.start && clamped < state.end);
  if (index < 0) index = cueConfig.states.length - 1;

  const state = cueConfig.states[index];
  const previous = index === 0 ? state : cueConfig.states[index - 1];
  const from = STATE_PARAMS[previous.id];
  const to = STATE_PARAMS[state.id];
  const ramp = easeInOut(clamp((clamped - state.start) / cueConfig.rampSec, 0, 1));
  const blend = (a, b) => a + (b - a) * ramp;

  return {
    id: state.id,
    label: state.label,
    index,
    local: clamped - state.start,
    elevMax: blend(from.elevMax, to.elevMax),
    azMax: blend(from.azMax, to.azMax),
    bright: blend(from.bright, to.bright),
    density: blend(from.density, to.density),
    aperture: blend(from.aperture, to.aperture),
    time: clamped,
  };
}

// ---------------------------------------------------------------- own source
function createSource() {
  const canvas = document.createElement("canvas");
  canvas.width = SOURCE_WIDTH;
  canvas.height = SOURCE_HEIGHT;
  const ctx = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  const draw = (time, density, brightness) => {
    ctx.fillStyle = "#04050a";
    ctx.fillRect(0, 0, SOURCE_WIDTH, SOURCE_HEIGHT);

    const sweep = (time * 0.07) % 1;
    const wash = ctx.createLinearGradient(0, 0, SOURCE_WIDTH, SOURCE_HEIGHT);
    wash.addColorStop(0, "rgba(120,150,200,0)");
    wash.addColorStop(clamp(sweep, 0.01, 0.98), "rgba(200,220,255,0.45)");
    wash.addColorStop(1, "rgba(120,150,200,0)");
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, SOURCE_WIDTH, SOURCE_HEIGHT);

    const spacing = 46;
    const drift = (time * 12) % spacing;
    ctx.strokeStyle = "rgba(150,175,210,0.2)";
    ctx.lineWidth = 1;
    for (let y = -spacing + drift; y < SOURCE_HEIGHT; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(SOURCE_WIDTH, y);
      ctx.stroke();
    }

    const count = Math.round(70 + density * 900);
    for (let i = 0; i < count; i += 1) {
      const seedX = pseudo(i * 1.7 + 3.1);
      const seedY = pseudo(i * 2.3 + 7.7);
      const x = (((seedX + time * (0.01 + seedX * 0.02)) % 1) + 1) % 1;
      const y = (((seedY + Math.sin(time * 0.3 + i) * 0.01) % 1) + 1) % 1;
      const size = 1 + seedX * 2.4;
      ctx.fillStyle = `rgba(220,232,248,${(0.16 + brightness * 0.5).toFixed(3)})`;
      ctx.fillRect(x * SOURCE_WIDTH, y * SOURCE_HEIGHT, size, size);
    }

    texture.needsUpdate = true;
  };

  return { draw, texture };
}

// ---------------------------------------------------------------- renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x05070a, 1);
renderer.domElement.style.position = "fixed";
renderer.domElement.style.inset = "0";
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
// No scene fog: at dome scale fog reads as "the screen is vanishing", which is exactly the
// failure this demo has to be able to reveal rather than hide.

scene.add(new THREE.HemisphereLight(0x8899bb, 0x090b10, 1.05));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
keyLight.position.set(12, 26, 12);
scene.add(keyLight);

const floorRadius = structure.audienceFloorDiameterM / 2;
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(floorRadius, 96),
  new THREE.MeshStandardMaterial({ color: 0x0d1117, roughness: 1, metalness: 0 }),
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const gridGroup = new THREE.Group();
gridGroup.position.y = 0.01;
const ringMaterial = new THREE.LineBasicMaterial({ color: 0x2b3646, transparent: true });
const radialMaterial = new THREE.LineBasicMaterial({ color: 0x1d2531, transparent: true });
for (let r = structure.gridRingM; r <= floorRadius + 1e-6; r += structure.gridRingM) {
  const points = Array.from({ length: 129 }, (_, index) => {
    const angle = (index / 128) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r);
  });
  gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), ringMaterial));
}
for (let i = 0; i < structure.gridRadials; i += 1) {
  const angle = (i / structure.gridRadials) * Math.PI * 2;
  gridGroup.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(Math.cos(angle) * floorRadius, 0, Math.sin(angle) * floorRadius),
      ]),
      radialMaterial,
    ),
  );
}
scene.add(gridGroup);

const stageHeight = structure.stagePlatform.heightM;
const stage = new THREE.Mesh(
  new THREE.BoxGeometry(
    structure.stagePlatform.widthM,
    stageHeight,
    structure.stagePlatform.depthM,
  ),
  new THREE.MeshStandardMaterial({ color: 0x222a36, roughness: 0.95, metalness: 0 }),
);
stage.position.y = stageHeight / 2;
scene.add(stage);

const performerHeight = structure.performerHeightM;
const performer = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.28, performerHeight - 0.56, 8, 16),
  new THREE.MeshStandardMaterial({ color: 0xffb86b, roughness: 0.8, metalness: 0 }),
);
performer.position.set(0, stageHeight + performerHeight / 2, 0);
scene.add(performer);

// ---------------------------------------------------------------- dome
const source = createSource();

const uniforms = {
  uSource: { value: source.texture },
  uTime: { value: 0 },
  uElevMax: { value: STATE_PARAMS.HORIZON.elevMax },
  uAzMax: { value: STATE_PARAMS.HORIZON.azMax },
  uBright: { value: STATE_PARAMS.HORIZON.bright },
  uDensity: { value: STATE_PARAMS.HORIZON.density },
  uAperture: { value: 0 },
  uFeed: { value: 0 },
  uMode: { value: 0 },
  uFitLo: { value: new THREE.Vector2(0, 0) },
  uFitHi: { value: new THREE.Vector2(1, 1) },
};

const dome = new THREE.Mesh(
  new THREE.SphereGeometry(structure.domeRadiusM, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms,
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uSource;
      uniform float uTime;
      uniform float uElevMax;
      uniform float uAzMax;
      uniform float uBright;
      uniform float uDensity;
      uniform float uAperture;
      uniform float uFeed;
      uniform float uMode;
      uniform vec2 uFitLo;
      uniform vec2 uFitHi;
      varying vec3 vPos;

      const float PI = 3.141592653589793;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      void main() {
        float radius = length(vPos);
        if (radius < 0.001) {
          gl_FragColor = vec4(0.004, 0.005, 0.008, 1.0);
          return;
        }

        // azimuth 0 = the direction the audience faces; elevation 0 = horizon.
        float elev = asin(clamp(vPos.y / radius, 0.0, 1.0));
        float az = atan(vPos.x, -vPos.z);
        float azAbs = abs(az);

        // Occupied area is the primary difference between the four states.
        // Feather widths are fixed in radians (not a fraction of the state), otherwise a
        // "full field" state fades to black across its own last 30% and is not full at all.
        float elevEdge = min(0.20, uElevMax * 0.5);
        float azEdge = min(0.30, uAzMax * 0.5);
        float bandE = 1.0 - smoothstep(uElevMax - elevEdge, uElevMax, elev);
        float bandA = 1.0 - smoothstep(uAzMax - azEdge, uAzMax, azAbs);
        float cover = bandE * bandA;

        // APERTURE is a different shape, not a smaller band: one centred opening.
        vec2 window = vec2((elev - 0.55) / 0.42, az / 0.34);
        float apertureMask = 1.0 - smoothstep(0.55, 1.0, length(window));
        cover = mix(cover, apertureMask, uAperture);

        if (cover < 0.002) {
          gl_FragColor = vec4(0.004, 0.005, 0.008, 1.0);
          return;
        }

        vec2 master = vec2((az + PI) / (2.0 * PI), elev / (PI * 0.5));
        vec2 srcUv;
        float procedural = 0.2;

        if (uMode < 0.5) {
          vec2 windowUv = vec2(az / (2.0 * max(uAzMax, 0.0001)) + 0.5, elev / max(uElevMax, 0.0001));
          float inside = step(uFitLo.x, windowUv.x) * step(windowUv.x, uFitHi.x);
          inside *= step(uFitLo.y, windowUv.y) * step(windowUv.y, uFitHi.y);
          srcUv = (windowUv - uFitLo) / max(uFitHi - uFitLo, vec2(0.0001));
          cover *= inside;
          procedural = 0.15;
        } else if (uMode < 1.5) {
          srcUv = vec2(1.0 - abs(fract(master.x * 2.0) * 2.0 - 1.0), master.y);
          procedural = 0.3;
        } else if (uMode < 2.5) {
          srcUv = vec2(fract(master.x * 0.25), master.y);
          procedural = 0.9;
        } else {
          srcUv = master;
          procedural = 0.35;
        }

        vec3 src = texture2D(uSource, clamp(srcUv, 0.0, 1.0)).rgb;
        float luma = dot(src, vec3(0.299, 0.587, 0.114));

        vec2 latticeUv = vec2(az * 6.0, elev * 6.0) - vec2(0.0, uTime * 0.05);
        vec2 cell = fract(latticeUv) - 0.5;
        float line = 1.0 - smoothstep(0.015, 0.09, min(abs(cell.x), abs(cell.y)));
        float points = step(0.988 - uDensity * 0.07, hash(floor(latticeUv * 2.0)));
        float field = mix(line, points, 0.4);

        vec3 tint = mix(vec3(0.42, 0.49, 0.6), vec3(0.8, 0.86, 0.95), uFeed);
        vec3 colour = tint * (0.18 + 0.82 * src.g) + tint * field * (0.25 + luma) * (0.6 + procedural);
        colour *= uBright * cover * mix(0.5, 1.0, uFeed);

        gl_FragColor = vec4(colour, 1.0);
      }
    `,
  }),
);
scene.add(dome);

// ---------------------------------------------------------------- cameras
const cameraList = presetCameras.map((preset) => {
  const camera = new THREE.PerspectiveCamera(
    preset.fovDeg,
    aspectOf(innerWidth, innerHeight),
    0.05,
    400,
  );
  camera.position.fromArray(preset.position);
  camera.lookAt(new THREE.Vector3().fromArray(preset.target));
  camera.name = preset.id;
  return camera;
});
const cameraById = new Map(cameraList.map((camera) => [camera.name, camera]));

const debugCamera = cameraById.get("DEBUG_ORBIT");
const controls = new OrbitControls(debugCamera, renderer.domElement);
controls.enableDamping = true;
controls.target.fromArray(
  presetCameras.find((preset) => preset.id === "DEBUG_ORBIT")?.target ?? [0, 4, 0],
);

let programId = cameraById.has(params.get("view")) ? params.get("view") : sceneJson.programCamera;
const programFor = () => cameraById.get(programId) ?? cameraList[0];
controls.enabled = programId === "DEBUG_ORBIT";

let modeIndex = Math.max(
  0,
  adaptationModes.findIndex((mode) => mode.id === (params.get("mode") ?? adaptationModes[0].id)),
);

// ---------------------------------------------------------------- quad preview
const quadEnabled = params.get("quad") !== "0";
const hudEnabled = params.get("hud") !== "0";
const quadRoot = document.getElementById("quad");
if (!hudEnabled) {
  for (const element of document.querySelectorAll(".hud, .badge, #quad")) {
    element.style.display = "none";
  }
}

const TILE_MARGIN = 16;
const TILE_GAP = 8;

function quadLayout(width) {
  const tileWidth = Math.round(Math.min(288, width * 0.21));
  const tileHeight = Math.round((tileWidth * 9) / 16);
  const totalWidth = tileWidth * 2 + TILE_GAP;
  const totalHeight = tileHeight * 2 + TILE_GAP;
  const originX = width - TILE_MARGIN - totalWidth;
  const originY = TILE_MARGIN;
  const tiles = cameraList.map((camera, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    return {
      camera,
      x: originX + column * (tileWidth + TILE_GAP),
      y: originY + (1 - row) * (tileHeight + TILE_GAP),
      width: tileWidth,
      height: tileHeight,
    };
  });
  return { tiles, originX, originY, totalWidth, totalHeight };
}

const quadLabels = new Map();
if (quadEnabled && hudEnabled) {
  for (const camera of cameraList) {
    const frame = document.createElement("div");
    frame.className = "quad-frame";
    frame.dataset.camera = camera.name;
    const label = document.createElement("div");
    label.className = "quad-label";
    label.textContent = camera.name;
    quadRoot.append(frame, label);
    quadLabels.set(camera.name, { frame, label });
  }
}

function layoutQuadChrome(width, height) {
  if (!quadEnabled || !hudEnabled) return;
  const { tiles } = quadLayout(width);
  for (const tile of tiles) {
    const entry = quadLabels.get(tile.camera.name);
    if (!entry) continue;
    const top = height - (tile.y + tile.height);
    entry.frame.style.left = `${tile.x}px`;
    entry.frame.style.top = `${top}px`;
    entry.frame.style.width = `${tile.width}px`;
    entry.frame.style.height = `${tile.height}px`;
    entry.frame.dataset.program = String(tile.camera.name === programId);
    entry.label.style.left = `${tile.x + 6}px`;
    entry.label.style.top = `${top + 6}px`;
  }
}

function renderQuads(width, height) {
  const { tiles } = quadLayout(width);
  renderer.setScissorTest(true);
  for (const tile of tiles) {
    renderer.setViewport(tile.x, tile.y, tile.width, tile.height);
    renderer.setScissor(tile.x, tile.y, tile.width, tile.height);
    renderer.setClearColor(0x05070a, 1);
    renderer.clear();
    renderer.render(scene, tile.camera);
  }
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, width, height);
}

// ---------------------------------------------------------------- HUD
const hud = {
  state: document.getElementById("hud-state"),
  cue: document.getElementById("hud-cue"),
  stream: document.getElementById("hud-stream"),
  mode: document.getElementById("hud-mode"),
  cam: document.getElementById("hud-cam"),
  fit: document.getElementById("hud-fit"),
};
const cameraRow = document.getElementById("row-cam");
const modeRow = document.getElementById("row-mode");

const cameraButtons = new Map();
for (const preset of presetCameras) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = `${cameraList.findIndex((c) => c.name === preset.id) + 1}·${preset.label}`;
  button.addEventListener("click", () => setProgram(preset.id));
  cameraRow.appendChild(button);
  cameraButtons.set(preset.id, button);
}

const modeButtons = new Map();
for (const mode of adaptationModes) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = mode.label;
  button.title = mode.note;
  button.addEventListener("click", () => setMode(adaptationModes.indexOf(mode)));
  modeRow.appendChild(button);
  modeButtons.set(mode.id, button);
}

function setProgram(id) {
  if (!cameraById.has(id)) return;
  programId = id;
  controls.enabled = programId === "DEBUG_ORBIT";
  for (const [cameraId, button] of cameraButtons) {
    button.setAttribute("aria-pressed", String(cameraId === programId));
  }
  layoutQuadChrome(innerWidth, innerHeight);
}

function setMode(index) {
  modeIndex = clamp(index, 0, adaptationModes.length - 1);
  for (const [modeId, button] of modeButtons) {
    button.setAttribute("aria-pressed", String(modeId === adaptationModes[modeIndex].id));
  }
}

// ---------------------------------------------------------------- stream state
let streamState = "idle";
let dropRequested = params.get("drop") === "1";
let dropTime = null;
const dropAt = params.has("dropAt") ? Number.parseFloat(params.get("dropAt")) : null;
let feed = 0;

function updateStream(time) {
  if (dropAt !== null && dropTime === null && time >= dropAt) dropTime = time;
  if (!dropRequested && dropTime === null) {
    if (time < 0.3) streamState = "idle";
    else if (time < 0.7) streamState = "armed";
    else if (time < 1.2) streamState = "connecting";
    else streamState = "live";
  } else {
    const elapsed = dropTime === null ? time : time - dropTime;
    streamState = elapsed > 2.5 ? "offline" : "fallback";
  }
  feed = streamState === "live" ? 1 : streamState === "fallback" ? 0.45 : 0.16;
}

// ---------------------------------------------------------------- clock
const recordMode = params.get("record") === "1";
const clock = new THREE.Clock();
let cueTime = Number.parseFloat(params.get("t") ?? "0");
let playing = !(params.has("t") && !recordMode);

document.getElementById("btn-cue").addEventListener("click", (event) => {
  playing = !playing;
  event.currentTarget.textContent = playing ? "暂停 CUE" : "播放 CUE";
});
document.getElementById("btn-drop").addEventListener("click", (event) => {
  dropRequested = !dropRequested;
  dropTime = dropRequested ? cueTime : null;
  event.currentTarget.textContent = dropRequested ? "恢复源" : "模拟源中断";
});

addEventListener("keydown", (event) => {
  if (event.key >= "1" && event.key <= "4") {
    const preset = presetCameras[Number.parseInt(event.key, 10) - 1];
    if (preset) setProgram(preset.id);
  } else if (event.key === " " || event.key === "0") {
    setProgram(sceneJson.programCamera);
  } else if (event.key === "m") {
    setMode((modeIndex + 1) % adaptationModes.length);
  } else if (event.key === "d") {
    dropRequested = !dropRequested;
    dropTime = dropRequested ? cueTime : null;
  } else if (event.key === "p") {
    playing = !playing;
  }
});

addEventListener("resize", () => {
  const aspect = aspectOf(innerWidth, innerHeight);
  for (const camera of cameraList) {
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }
  renderer.setSize(innerWidth, innerHeight);
  layoutQuadChrome(innerWidth, innerHeight);
});

setProgram(programId);
setMode(modeIndex);
layoutQuadChrome(innerWidth, innerHeight);

// ---------------------------------------------------------------- loop
let frames = 0;

renderer.setAnimationLoop(() => {
  const delta = recordMode ? 1 / 30 : clock.getDelta();
  if (playing) {
    cueTime += delta;
    if (cueTime >= cueConfig.durationSec) {
      if (recordMode) {
        cueTime = cueConfig.durationSec - 0.001;
        playing = false;
      } else {
        cueTime -= cueConfig.durationSec;
      }
    }
  }

  const sample = evaluateCue(cueTime);
  updateStream(cueTime);

  uniforms.uTime.value = cueTime;
  uniforms.uElevMax.value = sample.elevMax;
  uniforms.uAzMax.value = sample.azMax;
  uniforms.uBright.value = sample.bright;
  uniforms.uDensity.value = sample.density;
  uniforms.uAperture.value = sample.aperture;
  uniforms.uFeed.value = feed;
  uniforms.uMode.value = modeIndex;

  // front-window uses the shared fit math: the window's real aspect comes from the
  // angular extent it covers at the dome radius.
  let fitNote = adaptationModes[modeIndex].label;
  if (modeIndex === 0) {
    const windowAspect = (2 * sample.azMax) / Math.max(sample.elevMax, 0.001);
    const rect = fitWindowRect({
      windowAspect,
      sourceAspect: aspectOf(SOURCE_WIDTH, SOURCE_HEIGHT),
    });
    uniforms.uFitLo.value.set(rect.lo[0], rect.lo[1]);
    uniforms.uFitHi.value.set(rect.hi[0], rect.hi[1]);
    const widthFrac = rect.hi[0] - rect.lo[0];
    const heightFrac = rect.hi[1] - rect.lo[1];
    // The state band can cover 100% while the source window covers far less. Reporting
    // only one of the two numbers makes the HUD disagree with the picture, so show both.
    fitNote += ` · 窗口覆盖 方位 ${(widthFrac * 100).toFixed(0)}% / 高度 ${(
      heightFrac * 100
    ).toFixed(0)}%`;
    const bars = Math.round((1 - widthFrac) * 100);
    if (bars > 0) fitNote += ` · 左右留边 ${bars}%`;
  } else {
    fitNote += " · 全场覆盖";
  }

  if (streamState !== "offline") {
    source.draw(cueTime, sample.density, sample.bright);
  }

  if (controls.enabled) controls.update();

  const width = renderer.domElement.clientWidth;
  const height = renderer.domElement.clientHeight;
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, width, height);
  renderer.render(scene, programFor());
  if (quadEnabled) renderQuads(width, height);

  if (hudEnabled) {
    hud.state.textContent = `${sample.id}｜${sample.label}  (${sample.local.toFixed(1)}s / ${
      cueConfig.states[sample.index].end - cueConfig.states[sample.index].start
    }s)`;
    hud.cue.textContent = `${cueTime.toFixed(2)}s / ${cueConfig.durationSec}s${
      playing ? "" : "  ⏸"
    }`;
    hud.stream.textContent = streamState.toUpperCase();
    hud.stream.dataset.state = streamState;
    hud.mode.textContent = fitNote;
    const preset = presetCameras.find((item) => item.id === programId);
    hud.cam.textContent = preset ? `${programId}｜${preset.label}` : programId;
    const occupied = clamp(
      sample.aperture > 0.5
        ? sample.aperture * 0.18 * 100
        : (sample.elevMax / (Math.PI / 2)) * (sample.azMax / Math.PI) * 100,
      0,
      100,
    );
    hud.fit.textContent = `elevMax ${(sample.elevMax * 57.2958).toFixed(1)}° · azMax ${(
      sample.azMax * 57.2958
    ).toFixed(1)}° · 占用 ${occupied.toFixed(1)}%`;
  }

  frames += 1;
  if (frames === 3) window.__REPLICA_READY__ = true;
});

// Automation hook for the review dashboard and headless capture.
window.__STAGE_REPLICA__ = {
  scene: sceneJson,
  seek: (time) => {
    cueTime = clamp(time, 0, cueConfig.durationSec);
    playing = false;
  },
  play: () => {
    playing = true;
  },
  state: () => ({
    state: evaluateCue(cueTime).id,
    cueTime,
    stream: streamState,
    mode: adaptationModes[modeIndex].id,
    program: programId,
    frames,
  }),
};
