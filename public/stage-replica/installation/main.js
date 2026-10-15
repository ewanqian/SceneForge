// Stage Replica — Installation / Black Box (V2).
//
// V1's independent review verdict was "does not hold up — as the test it claims to be": the demo
// claims to test size, viewing distance, sound and duration, and three of the four were not
// exercised. V2 answers it:
//
//   - the marks now ACCUMULATE for real (a persistent pool that only grows), instead of being
//     re-seeded from scratch every 6 s. That 6-second re-seed was the largest visual event in the
//     whole piece, in a demo that forbids fast cutting.
//   - AFTERIMAGE is a genuine residual: no new marks are added, the existing pool decays slowly,
//     and the fade is slow enough for the trail to be seen. Static chrome is NOT redrawn in
//     residual mode, which is what turned a 1 px rule into a saturated full-width line in V1.
//   - the runtime source is 2048x1080 (1.896:1), matching the 10.24 x 5.4 m projection exactly,
//     and it is exactly half the declared 4096x2160 master. V1 used 1280x720 (1.778), stretched it
//     by 6.7%, and never read the declared raster at all.
//   - the floor is a continuation of the wall in ONE coordinate system (its far edge is flush with
//     the wall's bottom edge and it mirrors outward), not a second copy of the same texture on an
//     unrelated plane with a 2.3 m unlit gap.
//   - the cameras are reframed so the floor, the room's side walls and a known-size reference are
//     actually in frame. V1's program camera had zero near-white pixels and its 5 m scale bar sat
//     behind the camera in three of four presets.
//
// Deterministic review entry points:
//   ?t=<seconds>   ?view=<id>   ?floor=0|1   ?quad=0|1   ?hud=0|1
//   ?drop=1        ?dropAt=<sec>   ?record=1

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { aspectOf } from "../shared/fit-math.js";

// 10.24 / 5.4 = 1.8963, and 2048 / 1080 is the same ratio, so the source maps 1:1 onto the
// projection with no stretch — and it is exactly half the declared 4096x2160 master.
const SOURCE_WIDTH = 2048;
const SOURCE_HEIGHT = 1080;

const params = new URLSearchParams(location.search);
const sceneJson = await (await fetch("./scene.json")).json();
const structure = sceneJson.structure;
const cueConfig = sceneJson.cue;
const presetCameras = sceneJson.cameras;

const floorSpec = sceneJson.screens[1];
const wallWidth = structure.projectionMain.widthM;
const wallHeight = structure.projectionMain.heightM;
const wallZ = structure.projectionMain.planeZ;
const wallCenterY = structure.projectionMain.centerYM;

// Cue behaviour lives here; venue geometry lives in scene.json (see AGENTS.md).
// `rate` is how many marks per second enter the pool. AFTERIMAGE adds none.
const STATE_PARAMS = {
  SPARSE: { rate: 7, density: 0.16, bright: 0.5, residual: 0 },
  ACCUMULATE: { rate: 30, density: 0.5, bright: 0.78, residual: 0 },
  DENSE: { rate: 78, density: 1, bright: 1, residual: 0 },
  AFTERIMAGE: { rate: 0, density: 0.4, bright: 0.62, residual: 1 },
};
const DECAY_RATE = 26; // marks removed per second during AFTERIMAGE
const MAX_MARKS = 3200;
const GRID_COLS = 64;
const GRID_ROWS = 36;

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
    rate: blend(from.rate, to.rate),
    density: blend(from.density, to.density),
    bright: blend(from.bright, to.bright),
    residual: blend(from.residual, to.residual),
    time: clamped,
  };
}

// ---------------------------------------------------------------- accumulating marks
// The pool IS the state. It only grows while a state adds marks, and only shrinks during
// AFTERIMAGE. Nothing re-seeds, so what is on the wall has a continuous history — which is what
// V1 lacked: its states were four independent samples of the same random field.
const marks = [];
let markSeq = 0;
let markClock = 0;
let addAccumulator = 0;
let removeAccumulator = 0;

function resetMarks() {
  marks.length = 0;
  markSeq = 0;
  markClock = 0;
  addAccumulator = 0;
  removeAccumulator = 0;
}

function nextMark() {
  markSeq += 1;
  return {
    col: Math.floor(pseudo(markSeq * 1.7 + 3.1) * GRID_COLS),
    row: Math.floor(pseudo(markSeq * 2.3 + 7.7) * GRID_ROWS),
  };
}

function advanceMarks(toTime) {
  // Replayed from zero for ?t= seeks so a still at any time is reproducible.
  if (toTime < markClock) resetMarks();
  const step = 1 / 30;
  let guard = 0;
  while (markClock < toTime - 1e-6 && guard < 40000) {
    guard += 1;
    const next = Math.min(markClock + step, toTime);
    markClock = next;
    const sample = evaluateCue(next);
    if (sample.residual > 0.5) {
      removeAccumulator += DECAY_RATE * step;
      while (removeAccumulator >= 1 && marks.length > 0) {
        removeAccumulator -= 1;
        marks.shift();
      }
    } else {
      addAccumulator += sample.rate * step;
      while (addAccumulator >= 1) {
        addAccumulator -= 1;
        marks.push(nextMark());
      }
    }
    if (marks.length > MAX_MARKS) marks.splice(0, marks.length - MAX_MARKS);
  }
}

function occupancy() {
  const distinct = new Set();
  for (const mark of marks) distinct.add(mark.col * GRID_ROWS + mark.row);
  return distinct.size / (GRID_COLS * GRID_ROWS);
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

  const draw = (time, sample, fallback) => {
    const residual = sample.residual > 0.5;
    // Slow fade: with the marks decaying too, this leaves a residual that persists for seconds,
    // instead of V1's ~0.2 s half-life that made the "afterimage" invisible.
    ctx.fillStyle = residual ? "rgba(4,5,10,0.012)" : "#04050a";
    ctx.fillRect(0, 0, SOURCE_WIDTH, SOURCE_HEIGHT);

    if (fallback) {
      // A legible local loop, not the near-black frame V1 produced when the feed dropped.
      const x = ((time * 0.16) % 1) * SOURCE_WIDTH;
      const bar = ctx.createLinearGradient(x - 520, 0, x + 520, 0);
      bar.addColorStop(0, "rgba(90,102,126,0)");
      bar.addColorStop(0.5, "rgba(150,168,196,0.8)");
      bar.addColorStop(1, "rgba(90,102,126,0)");
      ctx.fillStyle = bar;
      ctx.fillRect(0, 0, SOURCE_WIDTH, SOURCE_HEIGHT);
      ctx.fillStyle = "rgba(210,222,238,0.85)";
      ctx.fillRect(0, SOURCE_HEIGHT - 6, SOURCE_WIDTH, 4);
      texture.needsUpdate = true;
      return;
    }

    const cellW = SOURCE_WIDTH / GRID_COLS;
    const cellH = SOURCE_HEIGHT / GRID_ROWS;
    const tickLength = (0.35 + sample.density * 0.65) * cellW * 1.6;
    const alpha = 0.12 + sample.bright * 0.72;

    for (const mark of marks) {
      const x = mark.col * cellW + cellW * 0.5;
      const y = mark.row * cellH + cellH * 0.5;
      const tall = pseudo(mark.col * 3.3 + mark.row * 1.9) > 0.6;
      ctx.fillStyle = `rgba(226,236,250,${alpha.toFixed(3)})`;
      if (tall) {
        ctx.fillRect(x - cellW * 0.08, y - tickLength * 0.5, cellW * 0.16, tickLength);
      } else {
        ctx.fillRect(x - tickLength * 0.5, y - cellH * 0.07, tickLength, cellH * 0.14);
      }
    }

    // Static chrome belongs to the image, NOT to the residual buffer: redrawing fixed lines under
    // a fade-only composite is exactly how V1 produced a saturated full-width line.
    if (!residual) {
      ctx.fillStyle = "rgba(120,140,170,0.5)";
      ctx.fillRect(0, SOURCE_HEIGHT * 0.5, SOURCE_WIDTH, 2);
      for (let i = 0; i < 4; i += 1) {
        ctx.fillRect(0, SOURCE_HEIGHT * (0.2 + i * 0.2), SOURCE_WIDTH * 0.06, 2);
      }
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
renderer.setClearColor(0x04050a, 1);
renderer.domElement.style.position = "fixed";
renderer.domElement.style.inset = "0";
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0x8899bb, 0x080a0f, 0.7));
const keyLight = new THREE.DirectionalLight(0xffffff, 0.5);
keyLight.position.set(6, 12, 8);
scene.add(keyLight);

// ---------------------------------------------------------------- room + references
const room = structure.room;
const roomBox = new THREE.Mesh(
  new THREE.BoxGeometry(room.widthM, room.heightM, room.depthM),
  new THREE.MeshStandardMaterial({
    color: 0x0b0d12,
    roughness: 1,
    metalness: 0,
    side: THREE.BackSide,
  }),
);
roomBox.position.set(0, room.heightM / 2, -room.depthM / 2 + (wallZ + room.depthM));
scene.add(roomBox);

// A drawn edge on the projection, so the boundary of the light is readable in a dark room.
const frameEdges = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.PlaneGeometry(wallWidth, wallHeight)),
  new THREE.LineBasicMaterial({ color: 0x55657c, transparent: true, opacity: 0.7 }),
);
frameEdges.position.set(0, wallCenterY, wallZ + 0.01);
scene.add(frameEdges);

// 5 m scale bar at the base of the projection. V1 declared structure.scaleBarM and never drew it,
// and had placed it behind the camera in three of four presets.
const barHalf = structure.scaleBarM / 2;
scene.add(
  new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-barHalf, 0.04, structure.scaleBarZ),
      new THREE.Vector3(barHalf, 0.04, structure.scaleBarZ),
    ]),
    new THREE.LineBasicMaterial({ color: 0xffffff }),
  ),
);

// Two 1.7 m reference posts, flush with the projection edges, so human scale is in frame.
const postHeight = structure.referencePostHeightM;
const postMaterial = new THREE.MeshStandardMaterial({
  color: 0xd8dee8,
  roughness: 0.8,
  emissive: 0x2a3038,
});
for (const sign of [-1, 1]) {
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, postHeight, 0.12), postMaterial);
  post.position.set(sign * structure.referencePostXM, postHeight / 2, wallZ + 0.2);
  scene.add(post);
}

// ---------------------------------------------------------------- screens
const source = createSource();

function createScreenMaterial(mirror) {
  const uniforms = {
    uSource: { value: source.texture },
    uBright: { value: 0.5 },
    uMirror: { value: mirror ? 1 : 0 },
    uFeed: { value: 1 },
  };
  return new THREE.ShaderMaterial({
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
      uniform float uMirror;
      uniform float uFeed;
      varying vec2 vUv;
      void main() {
        vec2 uv = vUv;
        if (uMirror > 0.5) uv.y = 1.0 - uv.y;
        vec3 src = texture2D(uSource, uv).rgb;
        vec3 tint = mix(vec3(0.5, 0.58, 0.72), vec3(0.92, 0.95, 1.0), uFeed);
        vec3 colour = src * tint * uBright * mix(0.5, 1.0, uFeed);
        gl_FragColor = vec4(colour, 1.0);
      }
    `,
  });
}

const wallMaterial = createScreenMaterial(false);
const wallMesh = new THREE.Mesh(new THREE.PlaneGeometry(wallWidth, wallHeight), wallMaterial);
wallMesh.position.set(0, wallCenterY, wallZ);
scene.add(wallMesh);

// The floor continues the wall: same texture, same u, mirrored in v, far edge flush with the
// wall's bottom edge, so the two surfaces share one coordinate system.
const floorMaterial = createScreenMaterial(true);
const floorMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(floorSpec.physicalSize.widthM, floorSpec.physicalSize.heightM),
  floorMaterial,
);
floorMesh.rotation.x = -Math.PI / 2;
floorMesh.position.set(0, 0.02, wallZ + floorSpec.physicalSize.heightM / 2);
floorMesh.visible = params.get("floor") === "1";
scene.add(floorMesh);

// ---------------------------------------------------------------- cameras
const cameraList = presetCameras.map((preset) => {
  const camera = new THREE.PerspectiveCamera(
    preset.fovDeg,
    aspectOf(innerWidth, innerHeight),
    0.05,
    200,
  );
  camera.position.fromArray(preset.position);
  camera.lookAt(new THREE.Vector3().fromArray(preset.target));
  camera.name = preset.id;
  return camera;
});
const cameraById = new Map(cameraList.map((camera) => [camera.name, camera]));

const debugCamera = cameraById.get("FAR");
const controls = new OrbitControls(debugCamera, renderer.domElement);
controls.enableDamping = true;
controls.target.fromArray(
  presetCameras.find((preset) => preset.id === "FAR")?.target ?? [0, 2.8, -9],
);
let programId = cameraById.has(params.get("view")) ? params.get("view") : sceneJson.programCamera;
const programFor = () => cameraById.get(programId) ?? cameraList[0];
controls.enabled = programId === "FAR";

// ---------------------------------------------------------------- quad preview
const quadEnabled = params.get("quad") !== "0";
const hudEnabled = params.get("hud") !== "0";
const quadRoot = document.getElementById("quad");
if (!hudEnabled) {
  // V1 documented ?hud=0 but never implemented it. This is the implementation.
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
    renderer.setClearColor(0x04050a, 1);
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
  marks: document.getElementById("hud-marks"),
  occ: document.getElementById("hud-occ"),
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
const floorButton = document.getElementById("btn-floor");
if (floorButton) {
  floorButton.addEventListener("click", () => {
    floorMesh.visible = !floorMesh.visible;
    floorButton.setAttribute("aria-pressed", String(floorMesh.visible));
  });
  floorButton.setAttribute("aria-pressed", String(floorMesh.visible));
}

function setProgram(id) {
  if (!cameraById.has(id)) return;
  programId = id;
  controls.enabled = programId === "FAR";
  for (const [cameraId, button] of cameraButtons) {
    button.setAttribute("aria-pressed", String(cameraId === programId));
  }
  layoutQuadChrome(innerWidth, innerHeight);
}

// ---------------------------------------------------------------- stream state
// V1: '?drop=1' alone rendered a near-black wall, because the drop was treated as long past and
// the offline feed factor dimmed the fallback loop to nothing. The fallback is now legible.
let streamState = "idle";
let dropRequested = params.get("drop") === "1";
let dropTime = dropRequested ? 2 : null;
const dropAt = params.has("dropAt") ? Number.parseFloat(params.get("dropAt")) : null;
let feed = 1;

function updateStream(time) {
  if (dropAt !== null && dropTime === null && time >= dropAt) dropTime = time;
  if (!dropRequested && dropTime === null) {
    if (time < 0.3) streamState = "idle";
    else if (time < 0.7) streamState = "armed";
    else if (time < 1.2) streamState = "connecting";
    else streamState = "live";
  } else {
    const elapsed = dropTime === null ? 0 : time - dropTime;
    streamState = elapsed > 2.5 ? "offline" : "fallback";
  }
  feed = streamState === "live" ? 1 : streamState === "fallback" ? 0.85 : 0.68;
}

// ---------------------------------------------------------------- clock
const recordMode = params.get("record") === "1";
const clock = new THREE.Clock();
let cueTime = Number.parseFloat(params.get("t") ?? "0");
let playing = !(params.has("t") && !recordMode);

const cueButton = document.getElementById("btn-cue");
cueButton.addEventListener("click", (event) => {
  playing = !playing;
  event.currentTarget.textContent = playing ? "暂停 CUE" : "播放 CUE";
});
const dropButton = document.getElementById("btn-drop");
dropButton.addEventListener("click", (event) => {
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
  } else if (event.key === "f") {
    floorMesh.visible = !floorMesh.visible;
    if (floorButton) floorButton.setAttribute("aria-pressed", String(floorMesh.visible));
  } else if (event.key === "p") {
    playing = !playing;
  } else if (event.key === "d") {
    dropRequested = !dropRequested;
    dropTime = dropRequested ? cueTime : null;
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

// Seeking with ?t= replays the mark pool from zero so any still is reproducible.
resetMarks();
advanceMarks(cueTime);

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
        // a new pass starts from an empty wall, which is a property of the piece, not a cut
        cueTime -= cueConfig.durationSec;
        resetMarks();
      }
    }
  }

  const sample = evaluateCue(cueTime);
  updateStream(cueTime);
  advanceMarks(cueTime);

  wallMaterial.uniforms.uBright.value = sample.bright;
  wallMaterial.uniforms.uFeed.value = feed;
  floorMaterial.uniforms.uBright.value = sample.bright * 0.85;
  floorMaterial.uniforms.uFeed.value = feed;

  source.draw(cueTime, sample, streamState !== "live");

  if (controls.enabled) controls.update();

  const width = renderer.domElement.clientWidth;
  const height = renderer.domElement.clientHeight;
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, width, height);
  renderer.render(scene, programFor());
  if (quadEnabled) renderQuads(width, height);

  if (hudEnabled) {
    const stateLength = cueConfig.states[sample.index].end - cueConfig.states[sample.index].start;
    hud.state.textContent = `${sample.id}｜${sample.label}  (${sample.local.toFixed(1)}s / ${stateLength}s)`;
    hud.cue.textContent = `${cueTime.toFixed(2)}s / ${cueConfig.durationSec}s${
      playing ? "" : "  ⏸"
    }`;
    hud.marks.textContent = `${marks.length} 条${
      sample.residual > 0.5 ? "（不再新增，缓慢消退）" : ""
    }`;
    // Occupancy is the DEDUPLICATED fraction of cells actually carrying a mark. V1 printed the
    // generator's draw count (and drew with replacement), so it claimed 58% where only 44.6% of
    // distinct cells were lit.
    hud.occ.textContent = `${(occupancy() * 100).toFixed(1)}% 格占用`;
    hud.stream.textContent = streamState.toUpperCase();
    hud.stream.dataset.state = streamState;
    const preset = presetCameras.find((item) => item.id === programId);
    hud.cam.textContent = preset ? `${programId}｜${preset.label}` : programId;
    hud.scale.textContent = `房间 ${room.widthM}×${room.depthM}×${room.heightM}m · 投影 ${wallWidth}×${wallHeight}m · 参考柱 ${postHeight}m · 比例尺 ${structure.scaleBarM}m`;
  }

  frames += 1;
  if (frames === 3) window.__REPLICA_READY__ = true;
});

window.__STAGE_REPLICA__ = {
  scene: sceneJson,
  seek: (time) => {
    cueTime = clamp(time, 0, cueConfig.durationSec);
    playing = false;
    resetMarks();
    advanceMarks(cueTime);
  },
  play: () => {
    playing = true;
  },
  state: () => {
    const sample = evaluateCue(cueTime);
    return {
      state: sample.id,
      cueTime,
      marks: marks.length,
      occupancy: occupancy(),
      residual: sample.residual,
      stream: streamState,
      program: programId,
      floor: floorMesh.visible,
      frames,
    };
  },
};
