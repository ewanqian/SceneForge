// Stage Replica — Installation / Black Box.
//
// This demo has no stage, no performer and no director. What it tests is whether a very small
// amount of material can still become a complete现场 through size, viewing distance, sound and
// DURATION. So the cue is 48 s rather than 32 s, the ramps are slow, and there is no cutting.
//
// Deterministic review entry points:
//   ?t=<seconds>   ?view=<id>   ?hud=0|1   ?floor=0|1   ?drop=1   ?dropAt=<sec>   ?record=1

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { aspectOf } from "../shared/fit-math.js";

const SOURCE_WIDTH = 1280;
const SOURCE_HEIGHT = 720;
const GRID_COLS = 64;
const GRID_ROWS = 36;

const params = new URLSearchParams(location.search);
const sceneJson = await (await fetch("./scene.json")).json();
const structure = sceneJson.structure;
const cueConfig = sceneJson.cue;
const presetCameras = sceneJson.cameras;
const screenSpecs = sceneJson.screens;

// Cue behaviour lives here; room geometry lives in scene.json (see AGENTS.md).
// `density` is the amount of rule-driven material on screen; `residual` switches the source from
// clearing each frame to fading, which is what produces the AFTERIMAGE state.
const STATE_PARAMS = {
  SPARSE: { density: 0.02, bright: 0.5, residual: 0 },
  ACCUMULATE: { density: 0.16, bright: 0.78, residual: 0 },
  // DENSE has to actually read as dense: at 36% cell occupancy with 1px ticks it was still a
  // sparse field, so the state failed its own name.
  DENSE: { density: 0.58, bright: 1, residual: 0 },
  AFTERIMAGE: { density: 0.05, bright: 0.4, residual: 1 },
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
    density: blend(from.density, to.density),
    bright: blend(from.bright, to.bright),
    residual: blend(from.residual, to.residual),
    time: clamped,
  };
}

// ---------------------------------------------------------------- own source
// Rule-based rather than "content": the same generating rule at four densities. The brief is
// explicit that the four states must not be four unrelated videos.
function createSource() {
  const canvas = document.createElement("canvas");
  canvas.width = SOURCE_WIDTH;
  canvas.height = SOURCE_HEIGHT;
  const ctx = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  const draw = (time, density, brightness, residual) => {
    // residual > 0 fades the previous frame instead of clearing it, so AFTERIMAGE keeps a real
    // after-glow instead of merely dropping the density.
    ctx.fillStyle = residual > 0.5 ? "rgba(4,5,10,0.055)" : "#04050a";
    ctx.fillRect(0, 0, SOURCE_WIDTH, SOURCE_HEIGHT);

    const cellWidth = SOURCE_WIDTH / GRID_COLS;
    const cellHeight = SOURCE_HEIGHT / GRID_ROWS;
    const active = Math.round(density * GRID_COLS * GRID_ROWS);

    // deterministic selection of active cells, re-seeded slowly so the field breathes
    const seedShift = Math.floor(time / 6);
    for (let i = 0; i < active; i += 1) {
      const pick = Math.floor(pseudo(i * 3.7 + seedShift * 0.31) * GRID_COLS * GRID_ROWS);
      const column = pick % GRID_COLS;
      const row = Math.floor(pick / GRID_COLS);
      const x = (column + 0.5) * cellWidth;
      const y = (row + 0.5) * cellHeight;

      // a tick mark whose length creeps very slowly: duration is the point
      const grow = 0.55 + 0.45 * Math.sin(time * 0.06 + row * 0.4);
      const length = cellWidth * 0.78 * grow;
      const alpha = (0.14 + brightness * 0.72).toFixed(3);
      ctx.fillStyle = `rgba(226,233,244,${alpha})`;
      ctx.fillRect(x - length / 2, y - 1, length, 2);
    }

    // one thin rule across the middle and a short numeric-like band along the bottom
    ctx.fillStyle = "rgba(150,175,210,0.16)";
    ctx.fillRect(0, SOURCE_HEIGHT / 2, SOURCE_WIDTH, 1);
    const bandCount = Math.round(6 + density * 90);
    for (let i = 0; i < bandCount; i += 1) {
      const pick = pseudo(i * 5.1 + seedShift * 0.17);
      const x = pick * SOURCE_WIDTH;
      const height = 6 + pseudo(i * 2.9) * 16;
      ctx.fillStyle = `rgba(226,233,244,${(0.06 + brightness * 0.22).toFixed(3)})`;
      ctx.fillRect(x, SOURCE_HEIGHT - height - 8, 2, height);
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
renderer.setClearColor(0x030407, 1);
renderer.domElement.style.position = "fixed";
renderer.domElement.style.inset = "0";
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0x8899bb, 0x090b10, 0.7));
const keyLight = new THREE.DirectionalLight(0xffffff, 0.5);
keyLight.position.set(4, 14, 8);
scene.add(keyLight);

// ---------------------------------------------------------------- black box
const room = structure.room;
const roomMesh = new THREE.Mesh(
  new THREE.BoxGeometry(room.widthM, room.heightM, room.depthM),
  new THREE.MeshStandardMaterial({
    color: 0x0b0d12,
    side: THREE.BackSide,
    roughness: 1,
    metalness: 0,
  }),
);
roomMesh.position.set(0, room.heightM / 2, 0);
scene.add(roomMesh);

// ---------------------------------------------------------------- projections
const source = createSource();

const wallSpec = screenSpecs.find((spec) => spec.id === "WALL_MAIN");
const floorSpec = screenSpecs.find((spec) => spec.id === "FLOOR_OPTIONAL");

function createProjectionMaterial() {
  const uniforms = {
    uSource: { value: source.texture },
    uBright: { value: 0.5 },
    uFeed: { value: 0 },
    uTint: { value: new THREE.Color(0.92, 0.94, 0.98) },
  };
  return {
    uniforms,
    material: new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uSource;
        uniform float uBright;
        uniform float uFeed;
        uniform vec3 uTint;
        varying vec2 vUv;
        void main() {
          vec3 src = texture2D(uSource, vUv).rgb;
          // projection surfaces are emissive; keep a faint falloff at the very edges
          float edge = smoothstep(0.0, 0.03, vUv.x) * smoothstep(1.0, 0.97, vUv.x);
          edge *= smoothstep(0.0, 0.03, vUv.y) * smoothstep(1.0, 0.97, vUv.y);
          vec3 colour = uTint * src * uBright * mix(0.35, 1.0, edge) * mix(0.4, 1.0, uFeed);
          gl_FragColor = vec4(colour, 1.0);
        }
      `,
    }),
  };
}

const wall = createProjectionMaterial();
const wallMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(wallSpec.physicalSize.widthM, wallSpec.physicalSize.heightM),
  wall.material,
);
wallMesh.position.fromArray(wallSpec.transform.positionM);
scene.add(wallMesh);

// Faint frame around the projected area: against a black room the 10.24 x 5.4 m boundary is
// otherwise unreadable, and the size of the picture is the thing this demo is testing.
scene.add(
  new THREE.LineSegments(
    new THREE.EdgesGeometry(
      new THREE.PlaneGeometry(wallSpec.physicalSize.widthM, wallSpec.physicalSize.heightM),
    ),
    new THREE.LineBasicMaterial({ color: 0x2b3646 }),
  )
    .translateX(wallMesh.position.x)
    .translateY(wallMesh.position.y)
    .translateZ(wallMesh.position.z),
);

const floorProjection = createProjectionMaterial();
const floorMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(floorSpec.physicalSize.widthM, floorSpec.physicalSize.heightM),
  floorProjection.material,
);
floorMesh.position.fromArray(floorSpec.transform.positionM);
floorMesh.rotation.x = (-90 * Math.PI) / 180;
scene.add(floorMesh);

let floorEnabled = params.get("floor") === "1" || floorSpec.enabledByDefault === true;
floorMesh.visible = floorEnabled;

// faint room reference so the black box is not a void while the wall is dark
scene.add(
  new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(room.widthM, room.heightM, room.depthM)),
    new THREE.LineBasicMaterial({ color: 0x1b2230 }),
  ).translateY(room.heightM / 2),
);

// 5 m scale bar on the floor, so the 10.24 m projection width is readable against something
const barHalf = 2.5;
scene.add(
  new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-barHalf, 0.03, 2),
      new THREE.Vector3(barHalf, 0.03, 2),
    ]),
    new THREE.LineBasicMaterial({ color: 0xffffff }),
  ),
);

// ---------------------------------------------------------------- cameras
const cameraList = presetCameras.map((preset) => {
  const camera = new THREE.PerspectiveCamera(
    preset.fovDeg,
    aspectOf(innerWidth, innerHeight),
    0.05,
    120,
  );
  camera.position.fromArray(preset.position);
  camera.lookAt(new THREE.Vector3().fromArray(preset.target));
  camera.name = preset.id;
  return camera;
});
const cameraById = new Map(cameraList.map((camera) => [camera.name, camera]));

const orbitCamera = cameraById.get("FLOOR");
const controls = new OrbitControls(orbitCamera, renderer.domElement);
controls.enableDamping = true;
controls.target.fromArray(
  presetCameras.find((preset) => preset.id === "FLOOR")?.target ?? [0, 2.6, -9],
);

let viewId = cameraById.has(params.get("view")) ? params.get("view") : sceneJson.programCamera;
const viewFor = () => cameraById.get(viewId) ?? cameraList[0];
controls.enabled = viewId === "FLOOR";

// ---------------------------------------------------------------- HUD
const hud = {
  state: document.getElementById("hud-state"),
  cue: document.getElementById("hud-cue"),
  density: document.getElementById("hud-density"),
  stream: document.getElementById("hud-stream"),
  view: document.getElementById("hud-view"),
  room: document.getElementById("hud-room"),
};
const viewRow = document.getElementById("row-view");
const viewButtons = new Map();
for (const preset of presetCameras) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = `${cameraList.findIndex((c) => c.name === preset.id) + 1}·${preset.label}`;
  button.addEventListener("click", () => setView(preset.id));
  viewRow.appendChild(button);
  viewButtons.set(preset.id, button);
}

function setView(id) {
  if (!cameraById.has(id)) return;
  viewId = id;
  controls.enabled = viewId === "FLOOR";
  for (const [cameraId, button] of viewButtons) {
    button.setAttribute("aria-pressed", String(cameraId === viewId));
  }
}

const floorButton = document.getElementById("btn-floor");
function syncFloorButton() {
  floorButton.textContent = `地面投影：${floorEnabled ? "开" : "关"}`;
  floorButton.setAttribute("aria-pressed", String(floorEnabled));
  floorMesh.visible = floorEnabled;
}
floorButton.addEventListener("click", () => {
  floorEnabled = !floorEnabled;
  syncFloorButton();
});

// ---------------------------------------------------------------- stream state
let streamState = "idle";
let dropRequested = params.get("drop") === "1";
let dropTime = null;
const dropAt = params.has("dropAt") ? Number.parseFloat(params.get("dropAt")) : null;
let feed = 0;

function updateStream(time) {
  if (dropAt !== null && dropTime === null && time >= dropAt) dropTime = time;
  if (!dropRequested && dropTime === null) {
    if (time < 0.4) streamState = "idle";
    else if (time < 0.9) streamState = "armed";
    else if (time < 1.6) streamState = "connecting";
    else streamState = "live";
  } else {
    const elapsed = dropTime === null ? time : time - dropTime;
    streamState = elapsed > 3 ? "offline" : "fallback";
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
    if (preset) setView(preset.id);
  } else if (event.key === " " || event.key === "0") {
    setView(sceneJson.programCamera);
  } else if (event.key === "f") {
    floorEnabled = !floorEnabled;
    syncFloorButton();
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
});

setView(viewId);
syncFloorButton();

// ---------------------------------------------------------------- loop
let frames = 0;

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  if (playing) {
    cueTime += delta;
    if (cueTime >= cueConfig.durationSec) {
      if (recordMode) {
        cueTime = cueConfig.durationSec - 0.001;
        playing = false;
        window.__REPLICA_DONE__ = true;
      } else {
        cueTime -= cueConfig.durationSec;
      }
    }
  }

  const sample = evaluateCue(cueTime);
  updateStream(cueTime);

  wall.uniforms.uBright.value = sample.bright;
  wall.uniforms.uFeed.value = feed;
  floorProjection.uniforms.uBright.value = sample.bright * 0.85;
  floorProjection.uniforms.uFeed.value = feed;

  if (streamState !== "offline") {
    source.draw(cueTime, sample.density, sample.bright, sample.residual);
  }

  if (controls.enabled) controls.update();

  const width = renderer.domElement.clientWidth;
  const height = renderer.domElement.clientHeight;
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, width, height);
  renderer.render(scene, viewFor());

  hud.state.textContent = `${sample.id}｜${sample.label}  (${sample.local.toFixed(1)}s / ${
    cueConfig.states[sample.index].end - cueConfig.states[sample.index].start
  }s)`;
  hud.cue.textContent = `${cueTime.toFixed(2)}s / ${cueConfig.durationSec}s${playing ? "" : "  ⏸"}`;
  hud.density.textContent = `${(sample.density * 100).toFixed(1)}% 规则格${
    sample.residual > 0.5 ? " · 余像保持" : ""
  }`;
  hud.stream.textContent = streamState.toUpperCase();
  hud.stream.dataset.state = streamState;
  const preset = presetCameras.find((item) => item.id === viewId);
  hud.view.textContent = preset ? `${viewId}｜${preset.label}` : viewId;
  hud.room.textContent = `房间 ${room.widthM}×${room.depthM}×${room.heightM}m · 墙投影 ${wallSpec.physicalSize.widthM}×${wallSpec.physicalSize.heightM}m · 地面投影 ${floorEnabled ? "开" : "关"}`;

  frames += 1;
  if (frames === 3) window.__REPLICA_READY__ = true;
});

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
    density: evaluateCue(cueTime).density,
    stream: streamState,
    view: viewId,
    floor: floorEnabled,
    frames,
  }),
};
