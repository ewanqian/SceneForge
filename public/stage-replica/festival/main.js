// Stage Replica — Festival / Two-Wall Stage.
//
// The demo's whole point is one variable: do the two LED walls show different things, or do they
// resolve into a single continuous image? Everything else is structure.
//
// Deterministic review entry points:
//   ?t=<seconds>   ?view=<id>   ?quad=0|1   ?hud=0|1   ?drop=1   ?dropAt=<sec>
//   ?record=1      play the cue once in real time and stop
//   ?cuts=1        scripted director pass across the cue

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { aspectOf } from "../shared/fit-math.js";

const SOURCE_WIDTH = 1280;
const SOURCE_HEIGHT = 720;

const params = new URLSearchParams(location.search);
const sceneJson = await (await fetch("./scene.json")).json();
const structure = sceneJson.structure;
const cueConfig = sceneJson.cue;
const presetCameras = sceneJson.cameras;
const screenSpecs = sceneJson.screens;

// Cue behaviour lives here; venue geometry lives in scene.json (see AGENTS.md).
// `join` is the composition relationship: 0 = two independent images, 1 = one continuous image
// spanning the pair. It is the axis this demo exists to test.
const STATE_PARAMS = {
  LOW: { join: 0.05, density: 0.16, bright: 0.46, aperture: 0 },
  BUILD: { join: 0.45, density: 0.5, bright: 0.72, aperture: 0 },
  PEAK: { join: 1, density: 0.9, bright: 1, aperture: 0 },
  RELEASE: { join: 0.15, density: 0.24, bright: 0.52, aperture: 0 },
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
    join: blend(from.join, to.join),
    density: blend(from.density, to.density),
    bright: blend(from.bright, to.bright),
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

    // A wide sweep plus a left/right landmark pair. The landmarks matter for this demo: without
    // them a reviewer cannot tell whether the two screens are showing different regions.
    const sweep = (time * 0.06) % 1;
    const wash = ctx.createLinearGradient(0, 0, SOURCE_WIDTH, 0);
    wash.addColorStop(0, "rgba(255,120,90,0.22)");
    wash.addColorStop(clamp(sweep, 0.02, 0.98), "rgba(180,215,255,0.55)");
    wash.addColorStop(1, "rgba(90,150,255,0.22)");
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, SOURCE_WIDTH, SOURCE_HEIGHT);

    // A landmark centred on the seam (u = 0.5). When the pair is joined each wall carries half of
    // it, so the shape only completes across the gap; when they are independent the whole shape
    // sits inside one wall. Without this, "joined" is an assertion rather than something a
    // reviewer can actually see.
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.ellipse(
      SOURCE_WIDTH * 0.5,
      SOURCE_HEIGHT * 0.5,
      SOURCE_WIDTH * 0.13,
      SOURCE_HEIGHT * 0.3,
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();

    ctx.fillStyle = "rgba(255,210,120,0.85)";
    ctx.fillRect(0, SOURCE_HEIGHT - 26, SOURCE_WIDTH, 4);

    const spacing = 52;
    const drift = (time * 10) % spacing;
    ctx.strokeStyle = "rgba(150,175,210,0.18)";
    ctx.lineWidth = 1;
    for (let y = -spacing + drift; y < SOURCE_HEIGHT; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(SOURCE_WIDTH, y);
      ctx.stroke();
    }

    const count = Math.round(60 + density * 820);
    for (let i = 0; i < count; i += 1) {
      const seedX = pseudo(i * 1.7 + 3.1);
      const seedY = pseudo(i * 2.3 + 7.7);
      const x = (((seedX + time * (0.008 + seedX * 0.02)) % 1) + 1) % 1;
      const y = (((seedY + Math.sin(time * 0.28 + i) * 0.01) % 1) + 1) % 1;
      ctx.fillStyle = `rgba(220,232,248,${(0.16 + brightness * 0.5).toFixed(3)})`;
      ctx.fillRect(x * SOURCE_WIDTH, y * SOURCE_HEIGHT, 1 + seedX * 2.2, 1 + seedX * 2.2);
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
scene.add(new THREE.HemisphereLight(0x8899bb, 0x090b10, 1.1));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
keyLight.position.set(14, 28, 18);
scene.add(keyLight);

// ---------------------------------------------------------------- stage + floor
const stageWidth = structure.stage.widthM;
const stageDepth = structure.stage.depthM;
const stageCenterZ = structure.stage.centerZ;

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(stageWidth, stageDepth),
  new THREE.MeshStandardMaterial({ color: 0x0d1117, roughness: 1, metalness: 0 }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.z = stageCenterZ;
scene.add(floor);

const grid = new THREE.GridHelper(
  stageWidth,
  Math.round(stageWidth / structure.gridSpacingM),
  0x2b3646,
  0x171d26,
);
grid.position.set(0, 0.01, stageCenterZ);
grid.scale.set(1, 1, stageDepth / stageWidth);
scene.add(grid);

// 5 m scale bar on the deck
const barHalf = structure.scaleBarM / 2;
scene.add(
  new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-barHalf, 0.03, 8),
      new THREE.Vector3(barHalf, 0.03, 8),
    ]),
    new THREE.LineBasicMaterial({ color: 0xffffff }),
  ),
);

// ---------------------------------------------------------------- DJ platform (triangular)
const platformHeight = structure.djPlatform.heightM;
const platform = new THREE.Mesh(
  new THREE.CylinderGeometry(3.46, 3.46, platformHeight, 3),
  new THREE.MeshStandardMaterial({ color: 0x232a35, roughness: 0.95, metalness: 0 }),
);
platform.position.y = platformHeight / 2;
platform.rotation.y = Math.PI / 6;
platform.scale.set(1, 1, 0.85);
scene.add(platform);

const performerHeight = structure.performerHeightM;
const performer = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.28, performerHeight - 0.56, 8, 16),
  new THREE.MeshStandardMaterial({ color: 0xffb86b, roughness: 0.8, metalness: 0 }),
);
performer.position.set(0, platformHeight + performerHeight / 2, 0);
scene.add(performer);

const heightRule = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(1.1, platformHeight, 0),
    new THREE.Vector3(1.1, platformHeight + performerHeight, 0),
  ]),
  new THREE.LineBasicMaterial({ color: 0xffb86b, transparent: true }),
);
scene.add(heightRule);

// ---------------------------------------------------------------- two LED walls
const source = createSource();

function createScreenMaterial() {
  const uniforms = {
    uSource: { value: source.texture },
    uScale: { value: new THREE.Vector2(1, 1) },
    uOffset: { value: new THREE.Vector2(0, 0) },
    uBright: { value: 0.4 },
    uDensity: { value: 0.2 },
    uTime: { value: 0 },
    uPhase: { value: 0 },
    uFeed: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
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
      uniform vec2 uScale;
      uniform vec2 uOffset;
      uniform float uBright;
      uniform float uDensity;
      uniform float uTime;
      uniform float uPhase;
      uniform float uFeed;
      varying vec2 vUv;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      void main() {
        vec2 uv = vUv * uScale + uOffset;
        vec3 src = texture2D(uSource, clamp(uv, 0.0, 1.0)).rgb;
        float luma = dot(src, vec3(0.299, 0.587, 0.114));

        vec2 g = vUv * vec2(26.0, 13.0) + vec2(uPhase, uTime * 0.05);
        vec2 cell = fract(g) - 0.5;
        float line = 1.0 - smoothstep(0.02, 0.12, min(abs(cell.x), abs(cell.y)));
        float dots = step(0.988 - uDensity * 0.07, hash(floor(g * 2.0)));
        float field = mix(line, dots, 0.4);

        vec3 tint = mix(vec3(0.45, 0.55, 0.7), vec3(0.86, 0.9, 0.98), uFeed);
        vec3 colour = tint * (0.16 + 0.84 * src.g) + tint * field * (0.3 + luma);
        colour *= uBright * mix(0.45, 1.0, uFeed);
        gl_FragColor = vec4(colour, 1.0);
      }
    `,
  });
  return { material, uniforms };
}

const screens = screenSpecs.map((spec) => {
  const { material, uniforms } = createScreenMaterial();
  const group = new THREE.Group();
  group.position.fromArray(spec.transform.positionM);
  group.rotation.y = (spec.transform.rotationDeg[1] * Math.PI) / 180;

  // bezel behind the emissive face, so the pair reads as physical walls
  const bezel = new THREE.Mesh(
    new THREE.BoxGeometry(spec.physicalSize.widthM + 0.5, spec.physicalSize.heightM + 0.5, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x11151c, roughness: 1, metalness: 0 }),
  );
  bezel.position.z = -0.2;
  group.add(bezel);

  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(spec.physicalSize.widthM, spec.physicalSize.heightM),
    material,
  );
  group.add(face);
  scene.add(group);
  return { id: spec.id, uniforms, group };
});

const screenById = new Map(screens.map((screen) => [screen.id, screen]));

// Per-screen UV transform. Independent: left shows the whole source, right shows an offset crop at
// a different scale, so the two walls are visibly not the same picture. Joined: each takes half of
// one source, so together they form a single continuous image.
const INDEPENDENT = {
  SCREEN_L: { scale: [1, 1], offset: [0, 0] },
  SCREEN_R: { scale: [0.58, 0.58], offset: [0.21, 0.3] },
};
const JOINED = {
  SCREEN_L: { scale: [0.5, 1], offset: [0, 0] },
  SCREEN_R: { scale: [0.5, 1], offset: [0.5, 0] },
};

function applyRelationship(join) {
  for (const screen of screens) {
    const independent = INDEPENDENT[screen.id];
    const joined = JOINED[screen.id];
    const mix = (a, b) => a + (b - a) * join;
    screen.uniforms.uScale.value.set(
      mix(independent.scale[0], joined.scale[0]),
      mix(independent.scale[1], joined.scale[1]),
    );
    screen.uniforms.uOffset.value.set(
      mix(independent.offset[0], joined.offset[0]),
      mix(independent.offset[1], joined.offset[1]),
    );
    // the phase offset disappears as the pair joins, otherwise the seam reads as a mistake
    screen.uniforms.uPhase.value = (screen.id === "SCREEN_R" ? 7.5 : 0) * (1 - join);
  }
}

// ---------------------------------------------------------------- cameras
// Inner gap between the two walls, derived from the geometry rather than hard-coded, so the HUD
// readout cannot drift away from the scene if the placement changes.
const screenRotationDeg = Math.abs(screenSpecs[0].transform.rotationDeg[1]);
const screenCenterX = Math.abs(screenSpecs[0].transform.positionM[0]);
const screenHalfWidth = screenSpecs[0].physicalSize.widthM / 2;
const innerGapM =
  2 * (screenCenterX - screenHalfWidth * Math.cos((screenRotationDeg * Math.PI) / 180));

const cameraList = presetCameras.map((preset) => {
  const camera = new THREE.PerspectiveCamera(
    preset.fovDeg,
    aspectOf(innerWidth, innerHeight),
    0.05,
    500,
  );
  camera.position.fromArray(preset.position);
  camera.lookAt(new THREE.Vector3().fromArray(preset.target));
  camera.name = preset.id;
  return camera;
});
const cameraById = new Map(cameraList.map((camera) => [camera.name, camera]));

const debugCamera = cameraById.get("HIGH_WIDE");
const controls = new OrbitControls(debugCamera, renderer.domElement);
controls.enableDamping = true;
controls.target.fromArray(
  presetCameras.find((preset) => preset.id === "HIGH_WIDE")?.target ?? [0, 3, -8],
);

let programId = cameraById.has(params.get("view")) ? params.get("view") : sceneJson.programCamera;
const programFor = () => cameraById.get(programId) ?? cameraList[0];
controls.enabled = programId === "HIGH_WIDE";

const cutSchedule =
  params.get("cuts") === "1"
    ? [
        { at: 0, view: "FOH_WIDE" },
        { at: 12, view: "DJ_FRONT" },
        { at: 20, view: "STAGE_LEFT" },
        { at: 24, view: "HIGH_WIDE" },
        { at: 28, view: "FOH_WIDE" },
      ]
    : null;

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
  return { tiles };
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
  rel: document.getElementById("hud-rel"),
  stream: document.getElementById("hud-stream"),
  cam: document.getElementById("hud-cam"),
  scale: document.getElementById("hud-scale"),
};
const cameraRow = document.getElementById("row-cam");
const cameraButtons = new Map();
for (const preset of presetCameras) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = `${cameraList.findIndex((c) => c.name === preset.id) + 1}·${preset.label}`;
  button.addEventListener("click", () => setProgram(preset.id));
  cameraRow.appendChild(button);
  cameraButtons.set(preset.id, button);
}

function setProgram(id) {
  if (!cameraById.has(id)) return;
  programId = id;
  controls.enabled = programId === "HIGH_WIDE";
  for (const [cameraId, button] of cameraButtons) {
    button.setAttribute("aria-pressed", String(cameraId === programId));
  }
  layoutQuadChrome(innerWidth, innerHeight);
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
layoutQuadChrome(innerWidth, innerHeight);

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

  if (cutSchedule) {
    let desired = cutSchedule[0].view;
    for (const cut of cutSchedule) {
      if (cueTime >= cut.at) desired = cut.view;
    }
    if (desired !== programId) setProgram(desired);
  }

  applyRelationship(sample.join);
  for (const screen of screens) {
    screen.uniforms.uTime.value = cueTime;
    screen.uniforms.uDensity.value = sample.density;
    screen.uniforms.uBright.value = sample.bright;
    screen.uniforms.uFeed.value = feed;
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
    const phrase = sample.join < 0.25 ? "两块独立" : sample.join < 0.72 ? "过渡中" : "合成一个整体";
    hud.rel.textContent = `${phrase}（join ${(sample.join * 100).toFixed(0)}%）`;
    hud.stream.textContent = streamState.toUpperCase();
    hud.stream.dataset.state = streamState;
    const preset = presetCameras.find((item) => item.id === programId);
    hud.cam.textContent = preset ? `${programId}｜${preset.label}` : programId;
    hud.scale.textContent = `屏 ${screenSpecs[0].physicalSize.widthM}×${screenSpecs[0].physicalSize.heightM}m · 内旋 ${screenRotationDeg}° · 中央间距 ${innerGapM.toFixed(1)}m · 人物 ${structure.performerHeightM}m`;
  }

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
    join: evaluateCue(cueTime).join,
    stream: streamState,
    program: programId,
    screens: screenById.size,
    frames,
  }),
};
