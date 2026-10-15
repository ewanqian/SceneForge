// Stage Replica — Festival / Two-Wall Stage (V2).
//
// The demo's whole point is one variable: do the two LED walls show different things, or do they
// resolve into a single continuous image?
//
// V2 geometry changes come from the V1 review:
//   - the performer now stands between the walls, not 10 m in front of them;
//   - the inner edges are 3.28 m apart instead of 8.9 m, so the joined halves actually meet;
//   - the source is 2048x1024 (2:1) to match the 18x9 m screens, removing V1's 12.5% stretch;
//   - the cross-seam landmark is an ASYMMETRIC diagonal, so "joined" is provable rather than
//     inferred from a symmetric shape;
//   - the two walls really are different pictures in the independent state (the right wall is
//     flipped), instead of the same picture at two scales;
//   - RELEASE retreats one side first, as the brief specifies, instead of dimming uniformly.
//
// Deterministic review entry points:
//   ?t=<seconds>   ?view=<id>   ?quad=0|1   ?hud=0|1   ?drop=1   ?dropAt=<sec>
//   ?record=1      play the cue once in real time and stop
//   ?cuts=1        scripted director pass across the cue

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { aspectOf } from "../shared/fit-math.js";

// 2:1 to match the 18 x 9 m screens. This is also the raster the board advertises, so the
// advertisement and the implementation now agree.
const SOURCE_WIDTH = 2048;
const SOURCE_HEIGHT = 1024;

const params = new URLSearchParams(location.search);
// P0.5: the manifest on disk is the unified schema; the loader validates it and projects the shape
// this renderer was written against. One line, one place - not four private conventions.
const sceneJson = await (await import("../shared/load-scene.js")).legacyScene(
  "./scene.json",
  "festival",
);
const structure = sceneJson.structure;
const cueConfig = sceneJson.cue;
const presetCameras = sceneJson.cameras;
const screenSpecs = sceneJson.screens;

// Cue behaviour lives here; venue geometry lives in scene.json (see AGENTS.md).
// `join` is the composition relationship: 0 = two independent pictures, 1 = one continuous image.
const STATE_PARAMS = {
  LOW: { join: 0.05, density: 0.16, bright: 0.5 },
  BUILD: { join: 0.45, density: 0.5, bright: 0.72 },
  PEAK: { join: 1, density: 0.9, bright: 1 },
  RELEASE: { join: 0.1, density: 0.26, bright: 0.55 },
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

  // RELEASE is defined by the brief as "one side withdraws first, the centre is retained".
  // That is a different shape of state from a uniform dim, so it is driven by progress through
  // the state rather than by the entry ramp.
  const stateProgress = clamp(
    (clamped - state.start) / Math.max(state.end - state.start, 0.001),
    0,
    1,
  );
  const retreat = state.id === "RELEASE" ? stateProgress : 0;

  return {
    id: state.id,
    label: state.label,
    index,
    local: clamped - state.start,
    join: blend(from.join, to.join),
    density: blend(from.density, to.density),
    bright: blend(from.bright, to.bright),
    retreat,
    time: clamped,
  };
}

// ---------------------------------------------------------------- own source
// One generating rule plus an ASYMMETRIC cross-seam landmark. The landmark matters: the diagonal
// is broken at u=0.5, so it only becomes one continuous line when the two walls are joined.
function createSource() {
  const canvas = document.createElement("canvas");
  canvas.width = SOURCE_WIDTH;
  canvas.height = SOURCE_HEIGHT;
  const ctx = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  const draw = (time, density, brightness, fallback) => {
    ctx.fillStyle = "#04050a";
    ctx.fillRect(0, 0, SOURCE_WIDTH, SOURCE_HEIGHT);

    if (fallback) {
      // A real local loop, not a frozen frame: a slow dim bar that keeps moving, clearly not the
      // live content. V1 declared a fallback source that did not exist in code.
      const x = ((time * 0.18) % 1) * SOURCE_WIDTH;
      const bar = ctx.createLinearGradient(x - 400, 0, x + 400, 0);
      bar.addColorStop(0, "rgba(70,80,100,0)");
      bar.addColorStop(0.5, "rgba(120,135,160,0.5)");
      bar.addColorStop(1, "rgba(70,80,100,0)");
      ctx.fillStyle = bar;
      ctx.fillRect(0, 0, SOURCE_WIDTH, SOURCE_HEIGHT);
      ctx.fillStyle = "rgba(180,190,205,0.5)";
      ctx.fillRect(0, SOURCE_HEIGHT - 8, SOURCE_WIDTH, 3);
      texture.needsUpdate = true;
      return;
    }

    // base field
    const sweep = (time * 0.05) % 1;
    const wash = ctx.createLinearGradient(0, 0, SOURCE_WIDTH, 0);
    wash.addColorStop(0, "rgba(255,120,90,0.16)");
    wash.addColorStop(clamp(sweep, 0.02, 0.98), "rgba(170,205,255,0.4)");
    wash.addColorStop(1, "rgba(90,150,255,0.16)");
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, SOURCE_WIDTH, SOURCE_HEIGHT);

    const spacing = 64;
    const drift = (time * 12) % spacing;
    ctx.strokeStyle = "rgba(150,175,210,0.13)";
    ctx.lineWidth = 1;
    for (let y = -spacing + drift; y < SOURCE_HEIGHT; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(SOURCE_WIDTH, y);
      ctx.stroke();
    }

    const count = Math.round(60 + density * 900);
    for (let i = 0; i < count; i += 1) {
      const seedX = pseudo(i * 1.7 + 3.1);
      const seedY = pseudo(i * 2.3 + 7.7);
      const x = (((seedX + time * (0.006 + seedX * 0.016)) % 1) + 1) % 1;
      const y = (((seedY + Math.sin(time * 0.26 + i) * 0.008) % 1) + 1) % 1;
      ctx.fillStyle = `rgba(220,232,248,${(0.14 + brightness * 0.42).toFixed(3)})`;
      const size = 1 + seedX * 2.6;
      ctx.fillRect(x * SOURCE_WIDTH, y * SOURCE_HEIGHT, size, size);
    }

    // THE landmark: one thick diagonal crossing u = 0.5, plus a thinner parallel offset so the
    // shape is unmistakably asymmetric judged on either wall alone.
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(255,255,255,0.72)";
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.moveTo(SOURCE_WIDTH * 0.08, SOURCE_HEIGHT * 0.82);
    ctx.lineTo(SOURCE_WIDTH * 0.92, SOURCE_HEIGHT * 0.18);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,205,120,0.5)";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(SOURCE_WIDTH * 0.18, SOURCE_HEIGHT * 0.72);
    ctx.lineTo(SOURCE_WIDTH * 0.74, SOURCE_HEIGHT * 0.28);
    ctx.stroke();

    // an off-centre mark so the two halves cannot be mistaken for a mirrored pair
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillRect(SOURCE_WIDTH * 0.62 - 12, SOURCE_HEIGHT * 0.5 - 12, 24, 24);

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

// square grid matching the 4 m spacing on BOTH axes (V1 used GridHelper's square divisions then
// scaled z, so the z cells were 1.82 m while x cells were 4 m)
const gridGroup = new THREE.Group();
gridGroup.position.set(0, 0.01, stageCenterZ);
const gridMaterial = new THREE.LineBasicMaterial({ color: 0x232c3a, transparent: true });
for (let x = -stageWidth / 2; x <= stageWidth / 2 + 1e-6; x += structure.gridSpacingM) {
  gridGroup.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, 0, -stageDepth / 2),
        new THREE.Vector3(x, 0, stageDepth / 2),
      ]),
      gridMaterial,
    ),
  );
}
for (let z = -stageDepth / 2; z <= stageDepth / 2 + 1e-6; z += structure.gridSpacingM) {
  gridGroup.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-stageWidth / 2, 0, z),
        new THREE.Vector3(stageWidth / 2, 0, z),
      ]),
      gridMaterial,
    ),
  );
}
scene.add(gridGroup);

const barHalf = structure.scaleBarM / 2;
scene.add(
  new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-barHalf, 0.03, 6),
      new THREE.Vector3(barHalf, 0.03, 6),
    ]),
    new THREE.LineBasicMaterial({ color: 0xffffff }),
  ),
);

// ---------------------------------------------------------------- DJ platform + performer
const platformSpec = structure.djPlatform;
const platformHeight = platformSpec.heightM;
const platform = new THREE.Mesh(
  new THREE.CylinderGeometry(3.46, 3.46, platformHeight, 3),
  new THREE.MeshStandardMaterial({ color: 0x232a35, roughness: 0.95, metalness: 0 }),
);
platform.position.fromArray(platformSpec.positionM);
platform.position.y = platformHeight / 2;
platform.rotation.y = Math.PI / 6;
platform.scale.set(1, 1, 0.85);
scene.add(platform);

const performerHeight = structure.performerHeightM;
const performer = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.28, performerHeight - 0.56, 8, 16),
  new THREE.MeshStandardMaterial({ color: 0xffb86b, roughness: 0.8, metalness: 0 }),
);
const performerZ = platformSpec.positionM[2];
performer.position.set(0, platformHeight + performerHeight / 2, performerZ);
scene.add(performer);

const heightRule = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(1.1, platformHeight, performerZ),
    new THREE.Vector3(1.1, platformHeight + performerHeight, performerZ),
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
    uFlipV: { value: 0 },
    uBright: { value: 0.4 },
    uDensity: { value: 0.2 },
    uTime: { value: 0 },
    uPhase: { value: 0 },
    uFeed: { value: 0 },
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
        uniform vec2 uScale;
        uniform vec2 uOffset;
        uniform float uFlipV;
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
          if (uFlipV > 0.5) uv.y = 1.0 - uv.y;
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
    }),
  };
}

const screens = screenSpecs.map((spec) => {
  const { material, uniforms } = createScreenMaterial();
  const group = new THREE.Group();
  group.position.fromArray(spec.transform.positionM);
  group.rotation.y = (spec.transform.rotationDeg[1] * Math.PI) / 180;

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
  return { id: spec.id, isLeft: spec.id === "SCREEN_L", uniforms };
});

// Per-screen UV transform.
// Independent: each wall gets a DIFFERENT treatment - the right wall is vertically flipped and
// sampled from a different crop, so they read as two different pictures rather than one picture
// at two scales (the V1 review's criticism).
// Joined: each wall takes one half of one master, so together they are one continuous image.
const INDEPENDENT = {
  SCREEN_L: { scale: [1, 1], offset: [0, 0], flip: 0, phase: 0 },
  SCREEN_R: { scale: [0.62, 0.62], offset: [0.19, 0.19], flip: 1, phase: 9 },
};
const JOINED = {
  SCREEN_L: { scale: [0.5, 1], offset: [0, 0], flip: 0, phase: 0 },
  SCREEN_R: { scale: [0.5, 1], offset: [0.5, 0], flip: 0, phase: 0 },
};

function applyRelationship(sample) {
  const join = sample.join;
  const mix = (a, b) => a + (b - a) * join;

  // RELEASE: the left wall withdraws first, then the right. The performer stays central.
  const leftRetreat = clamp(sample.retreat * 2, 0, 1);
  const rightRetreat = clamp((sample.retreat - 0.45) * 2, 0, 1);

  for (const screen of screens) {
    const independent = INDEPENDENT[screen.id];
    const joined = JOINED[screen.id];
    screen.uniforms.uScale.value.set(
      mix(independent.scale[0], joined.scale[0]),
      mix(independent.scale[1], joined.scale[1]),
    );
    screen.uniforms.uOffset.value.set(
      mix(independent.offset[0], joined.offset[0]),
      mix(independent.offset[1], joined.offset[1]),
    );
    screen.uniforms.uFlipV.value = mix(independent.flip, joined.flip) > 0.5 ? 1 : 0;
    screen.uniforms.uPhase.value = mix(independent.phase, joined.phase);

    const sideRetreat = screen.isLeft ? leftRetreat : rightRetreat;
    screen.uniforms.uBright.value = sample.bright * (1 - 0.88 * sideRetreat);
    screen.uniforms.uDensity.value = sample.density * (1 - 0.8 * sideRetreat);
    screen.uniforms.uTime.value = sample.time;
  }
}

// ---------------------------------------------------------------- cameras
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
  presetCameras.find((preset) => preset.id === "HIGH_WIDE")?.target ?? [0, 3, -5],
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
  feed = streamState === "live" ? 1 : streamState === "fallback" ? 0.5 : 0.25;
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

  applyRelationship(sample);
  for (const screen of screens) {
    screen.uniforms.uFeed.value = feed;
  }

  // the fallback is a real local loop that keeps animating, not a frozen frame
  source.draw(cueTime, sample.density, sample.bright, streamState !== "live");

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
    const leftRetreatPct = clamp(sample.retreat * 2, 0, 1) * 100;
    const rightRetreatPct = clamp((sample.retreat - 0.45) * 2, 0, 1) * 100;
    const retreatNote =
      sample.retreat > 0.02
        ? ` · 收束：左退 ${leftRetreatPct.toFixed(0)}% / 右退 ${rightRetreatPct.toFixed(0)}%`
        : "";
    hud.rel.textContent = `${phrase}（join ${(sample.join * 100).toFixed(0)}%）${retreatNote}`;
    hud.stream.textContent = streamState.toUpperCase();
    hud.stream.dataset.state = streamState;
    const preset = presetCameras.find((item) => item.id === programId);
    hud.cam.textContent = preset ? `${programId}｜${preset.label}` : programId;
    hud.scale.textContent = `屏 ${screenSpecs[0].physicalSize.widthM}×${screenSpecs[0].physicalSize.heightM}m · 内旋 ${Math.abs(screenSpecs[0].transform.rotationDeg[1])}° · 中央间距 ${sceneJson.derivedGeometry.centreGapM}m · 人物 ${structure.performerHeightM}m`;
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
  state: () => {
    const sample = evaluateCue(cueTime);
    return {
      state: sample.id,
      cueTime,
      join: sample.join,
      retreat: sample.retreat,
      stream: streamState,
      program: programId,
      frames,
    };
  },
};
