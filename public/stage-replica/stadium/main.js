// Stage Replica — Stadium / 360° Concert (V2).
//
// This is the technical demo: its subject is Camera / Director / Program Out rather than the
// picture. A 360° room has no single front, so switching cameras is not a convenience here, it is
// part of how the show gets arranged at all.
//
// Reference (STUFISH, Anna Vissi / OAKA): "a 20m cylindrical blow-through LED screen rises like a
// beacon above a 30m circular stage", 360° in the round, 95,000 surrounding.
//
// V2 answers the V1 review, which found:
//   - the ring's "rotation" was a NO-OP in world space. The cover arc was computed from unrotated
//     `az` while only the sampling used uRotate, so the HUD reported 163 degrees of rotation while
//     the arc's pixel count, centroid and angle histogram were identical at t=8/16/23.
//   - the three 16:9 ratio modes rendered the same picture (0.00-0.02% of pixels differed), because
//     the sampled slice had no recognisable features.
//   - the declared 5 m scale bar was never drawn.
//   - the performer was unseparable in the wide cameras (max RGB 126,112,131 at the performer).
//   - four states differed only by the covered arc angle.
//
// Deterministic review entry points:
//   ?t=<seconds>   ?view=<id>   ?pano=<id>   ?quad=0|1   ?hud=0|1   ?drop=1   ?dropAt=<sec>
//   ?record=1      play the cue once in real time and stop
//   ?cuts=1        scripted director pass across the cue

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { aspectOf } from "../shared/fit-math.js";

// The runtime canvas is the declared FAST PROXY (2048x256 = 8:1), not the 4096x512 master.
const SOURCE_WIDTH = 2048;
const SOURCE_HEIGHT = 256;

const params = new URLSearchParams(location.search);
// P0.5: the manifest on disk is the unified schema; the loader validates it and projects the shape
// this renderer was written against. One line, one place - not four private conventions.
const sceneJson = await (await import("../shared/load-scene.js")).legacyScene(
  "./scene.json",
  "stadium",
);
const structure = sceneJson.structure;
const cueConfig = sceneJson.cue;
const presetCameras = sceneJson.cameras;
const screenSpec = sceneJson.screens[0];
const panoModes = sceneJson.panoramaModes;

const cylinderRadius = structure.ledCylinderDiameterM / 2;
const cylinderHeight = structure.ledCylinderHeightM;

// Cue behaviour lives here; venue geometry lives in scene.json (see AGENTS.md).
// `wrap` is the half-angle of the ring carrying content. `barLift` raises the blow-through bars
// above the cylinder, and `crowd` lights the surrounding stand ring - both are RELATIONSHIP
// changes, so the states are no longer just four arc angles.
const STATE_PARAMS = {
  LOW: { wrap: 0.79, density: 0.18, bright: 0.5, barLift: 0, barBright: 0.5, crowd: 0.05 },
  BUILD: { wrap: 1.57, density: 0.5, bright: 0.75, barLift: 0.25, barBright: 0.8, crowd: 0.2 },
  PEAK: { wrap: Math.PI, density: 0.92, bright: 1, barLift: 1, barBright: 1, crowd: 0.45 },
  RELEASE: { wrap: 0.7, density: 0.24, bright: 0.55, barLift: 0.1, barBright: 0.6, crowd: 1 },
};
const ROT_SPEED = { LOW: 0, BUILD: 0.12, PEAK: 0.22, RELEASE: 0.04 };

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);
const easeInOut = (value) => value * value * (3 - 2 * value);
const pseudo = (seed) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};

// ---------------------------------------------------------------- cue timeline
function ringRotation(time) {
  // Integrate the per-state rotation speed so the ring angle is a pure function of cue time.
  // Without this, ?t= stills and the recording would disagree about where the content sits.
  let total = 0;
  for (const state of cueConfig.states) {
    const speed = ROT_SPEED[state.id];
    total += speed * clamp(time - state.start, 0, state.end - state.start);
    if (time < state.end) break;
  }
  return total;
}

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
    wrap: blend(from.wrap, to.wrap),
    density: blend(from.density, to.density),
    bright: blend(from.bright, to.bright),
    barLift: blend(from.barLift, to.barLift),
    barBright: blend(from.barBright, to.barBright),
    crowd: blend(from.crowd, to.crowd),
    rotation: ringRotation(clamped),
    time: clamped,
  };
}

// ---------------------------------------------------------------- own source
// Four large, high-contrast glyphs, one per quadrant, all clearly different shapes. V1 used a
// near-uniform noise field, which made "panorama / 16:9 repeated / 16:9 stretched" visually
// identical: the reviewer measured 0.00-0.02% differing pixels. With four DIFFERENT glyphs, the
// repeat test shows the same glyph four times and the stretch test smears one glyph around the
// ring - both instantly distinguishable from the panorama.
function createSource() {
  const canvas = document.createElement("canvas");
  canvas.width = SOURCE_WIDTH;
  canvas.height = SOURCE_HEIGHT;
  const ctx = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  const glyph = (kind, cx, cy, scale, bright) => {
    const r = SOURCE_HEIGHT * 0.36 * scale;
    ctx.strokeStyle = `rgba(236,244,255,${(0.55 + bright * 0.45).toFixed(3)})`;
    ctx.fillStyle = `rgba(236,244,255,${(0.5 + bright * 0.5).toFixed(3)})`;
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    if (kind === 0) {
      // upward arrow
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r * 0.8, cy);
      ctx.lineTo(cx + r * 0.28, cy);
      ctx.lineTo(cx + r * 0.28, cy + r);
      ctx.lineTo(cx - r * 0.28, cy + r);
      ctx.lineTo(cx - r * 0.28, cy);
      ctx.lineTo(cx - r * 0.8, cy);
      ctx.closePath();
      ctx.fill();
    } else if (kind === 1) {
      // X
      ctx.beginPath();
      ctx.moveTo(cx - r, cy - r);
      ctx.lineTo(cx + r, cy + r);
      ctx.moveTo(cx + r, cy - r);
      ctx.lineTo(cx - r, cy + r);
      ctx.stroke();
    } else if (kind === 2) {
      // diagonal stripes
      for (let i = -2; i <= 2; i += 1) {
        ctx.beginPath();
        ctx.moveTo(cx - r + i * r * 0.5, cy + r);
        ctx.lineTo(cx + i * r * 0.5, cy - r);
        ctx.stroke();
      }
    } else {
      // concentric circles
      for (let i = 1; i <= 3; i += 1) {
        ctx.beginPath();
        ctx.arc(cx, cy, (r * i) / 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  };

  const draw = (time, sample, fallback) => {
    ctx.fillStyle = "#04050a";
    ctx.fillRect(0, 0, SOURCE_WIDTH, SOURCE_HEIGHT);

    if (fallback) {
      const x = ((time * 0.15) % 1) * SOURCE_WIDTH;
      const bar = ctx.createLinearGradient(x - 500, 0, x + 500, 0);
      bar.addColorStop(0, "rgba(90,102,126,0)");
      bar.addColorStop(0.5, "rgba(150,168,196,0.8)");
      bar.addColorStop(1, "rgba(90,102,126,0)");
      ctx.fillStyle = bar;
      ctx.fillRect(0, 0, SOURCE_WIDTH, SOURCE_HEIGHT);
      texture.needsUpdate = true;
      return;
    }

    // four quadrant glyphs, deliberately all different
    for (let q = 0; q < 4; q += 1) {
      glyph(q, ((q + 0.5) / 4) * SOURCE_WIDTH, SOURCE_HEIGHT * 0.5, 1, sample.bright);
    }

    // quadrant separators so orientation is readable on a wrap-around screen
    for (let q = 0; q < 4; q += 1) {
      ctx.fillStyle = "rgba(120,150,190,0.5)";
      ctx.fillRect((q / 4) * SOURCE_WIDTH - 2, 0, 4, SOURCE_HEIGHT);
    }

    const bands = 5;
    for (let i = 0; i < bands; i += 1) {
      const y = ((i + 0.5) / bands) * SOURCE_HEIGHT;
      ctx.fillStyle = `rgba(190,210,240,${(0.04 + sample.bright * 0.08).toFixed(3)})`;
      ctx.fillRect(0, y - 1, SOURCE_WIDTH, 2);
    }

    const count = Math.round(120 + sample.density * 1200);
    for (let i = 0; i < count; i += 1) {
      const seedX = pseudo(i * 1.7 + 3.1);
      const seedY = pseudo(i * 2.3 + 7.7);
      const x = (((seedX + time * (0.004 + seedX * 0.012)) % 1) + 1) % 1;
      const y = (((seedY + Math.sin(time * 0.22 + i) * 0.01) % 1) + 1) % 1;
      ctx.fillStyle = `rgba(220,232,248,${(0.1 + sample.bright * 0.35).toFixed(3)})`;
      ctx.fillRect(x * SOURCE_WIDTH, y * SOURCE_HEIGHT, 2, 2);
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
scene.add(new THREE.HemisphereLight(0x8899bb, 0x090b10, 0.9));
const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
keyLight.position.set(18, 30, 22);
scene.add(keyLight);

// ---------------------------------------------------------------- ground + bowl
const bowlRadius = structure.arenaBowlDiameterM / 2;
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(bowlRadius, 96),
  new THREE.MeshStandardMaterial({ color: 0x0c1016, roughness: 1, metalness: 0 }),
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// The stand ring: "surrounded on all sides" is read from geometry, not from people (the brief
// rules out simulating 95,000). It now lights up during RELEASE, so the crowd relationship
// changes between states instead of the states only changing an arc angle.
const standTicks = new THREE.Group();
const tickMaterial = new THREE.LineBasicMaterial({
  color: 0x2b3646,
  transparent: true,
  opacity: 0.5,
});
for (let i = 0; i < 96; i += 1) {
  const angle = (i / 96) * Math.PI * 2;
  const x = Math.cos(angle) * bowlRadius;
  const z = Math.sin(angle) * bowlRadius;
  standTicks.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, 0, z),
        new THREE.Vector3(x, 1.6, z),
      ]),
      tickMaterial,
    ),
  );
}
scene.add(standTicks);

// 5 m scale bar on the ground in front of the stage. V1 declared structure.scaleBarM and never
// drew it, so the reviewer measured zero near-white pixels across all four presets.
const barHalf = structure.scaleBarM / 2;
scene.add(
  new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-barHalf, 0.06, structure.scaleBarZ),
      new THREE.Vector3(barHalf, 0.06, structure.scaleBarZ),
    ]),
    new THREE.LineBasicMaterial({ color: 0xffffff }),
  ),
);

// ---------------------------------------------------------------- stage + performer
const stageRadius = structure.mainStageDiameterM / 2;
const stage = new THREE.Mesh(
  new THREE.CylinderGeometry(stageRadius, stageRadius, 0.9, 96),
  new THREE.MeshStandardMaterial({ color: 0x1b212b, roughness: 0.95, metalness: 0 }),
);
stage.position.y = 0.45;
scene.add(stage);

const zoneRadius = structure.performerZoneDiameterM / 2;
scene.add(
  new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 129 }, (_, i) => {
        const a = (i / 128) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(a) * zoneRadius, 0.94, Math.sin(a) * zoneRadius);
      }),
    ),
    new THREE.LineBasicMaterial({ color: 0x6ea8ff, transparent: true, opacity: 0.7 }),
  ),
);

// The performer: emissive so it separates from the screen behind it. The review measured
// (126,112,131) at the performer's position in BOWL_WIDE, i.e. no separable figure at all.
const performerHeight = structure.performerHeightM;
const performer = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.3, performerHeight - 0.6, 8, 16),
  new THREE.MeshStandardMaterial({
    color: 0xffb86b,
    emissive: 0xff8a2b,
    emissiveIntensity: 0.85,
    roughness: 0.7,
    metalness: 0,
  }),
);
performer.position.set(0, 0.9 + performerHeight / 2, 0);
scene.add(performer);

const haloRadius = structure.haloRingDiameterM / 2;
const halo = new THREE.Mesh(
  new THREE.TorusGeometry(haloRadius, 0.1, 8, 96),
  new THREE.MeshBasicMaterial({ color: 0x9fd0ff, toneMapped: false }),
);
halo.rotation.x = Math.PI / 2;
halo.position.y = cylinderHeight + 0.6;
scene.add(halo);

// ---------------------------------------------------------------- blow-through back light
// STUFISH: the screen is transparent, so lighting sits BEHIND it. The bars are unit-height boxes
// scaled per frame, so that at PEAK they rise above the cylinder - the light crossing the screen
// becomes the event, which is a relationship change rather than an angle change.
const barMaterial = new THREE.MeshBasicMaterial({
  color: 0xffcf8a,
  toneMapped: false,
  transparent: true,
  opacity: 0.85,
  blending: THREE.AdditiveBlending,
});
const backLightBars = [];
for (let i = 0; i < sceneJson.lightThroughScreen.backLightBars; i += 1) {
  const angle = ((i + 0.5) / sceneJson.lightThroughScreen.backLightBars) * Math.PI * 2;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1, 0.5), barMaterial);
  bar.position.set(
    Math.cos(angle) * (cylinderRadius - 1.5),
    0,
    Math.sin(angle) * (cylinderRadius - 1.5),
  );
  bar.renderOrder = 1;
  backLightBars.push(bar);
  scene.add(bar);
}

// ---------------------------------------------------------------- cylinder LED
const source = createSource();

const uniforms = {
  uSource: { value: source.texture },
  uWrap: { value: STATE_PARAMS.LOW.wrap },
  uRotate: { value: 0 },
  uBright: { value: STATE_PARAMS.LOW.bright },
  uDensity: { value: STATE_PARAMS.LOW.density },
  uTime: { value: 0 },
  uFeed: { value: 0 },
  uPano: { value: 0 },
  uOpacity: { value: sceneJson.lightThroughScreen.screenOpacity },
};

const cylinderMaterial = new THREE.ShaderMaterial({
  uniforms,
  side: THREE.DoubleSide,
  transparent: true,
  depthWrite: false,
  vertexShader: `
    varying vec3 vPos;
    varying vec2 vUv;
    void main() {
      vPos = position;
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D uSource;
    uniform float uWrap;
    uniform float uRotate;
    uniform float uBright;
    uniform float uDensity;
    uniform float uTime;
    uniform float uFeed;
    uniform float uPano;
    uniform float uOpacity;
    varying vec3 vPos;
    varying vec2 vUv;

    const float PI = 3.141592653589793;
    // the 16:9 slice used by the three input-ratio modes, centred on the X glyph in quadrant 2
    const float TILE_U0 = 0.25;
    const float TILE_W = 0.22;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    void main() {
      // V1 BUG: the cover arc was computed from the UNROTATED azimuth, so uRotate moved only the
      // sampling inside a world-fixed arc and the HUD reported a rotation that never happened.
      float az = atan(vPos.x, vPos.z);
      float a = az - uRotate;
      a = atan(sin(a), cos(a));
      float azAbs = abs(a);

      float cover = 1.0 - smoothstep(max(uWrap - 0.30, 0.0), uWrap, azAbs);

      vec2 pano = vec2((a + PI) / (2.0 * PI), vUv.y);
      vec2 srcUv;

      if (uPano < 0.5) {
        srcUv = pano;
      } else if (uPano < 1.5) {
        float win = 1.0 - smoothstep(PI * 0.25 - 0.12, PI * 0.25, azAbs);
        cover *= win;
        srcUv = vec2(TILE_U0 + (az / (PI * 0.5) + 0.5) * TILE_W, vUv.y);
      } else if (uPano < 2.5) {
        srcUv = vec2(TILE_U0 + fract(pano.x * 4.0) * TILE_W, vUv.y);
      } else {
        srcUv = vec2(TILE_U0 + pano.x * TILE_W, vUv.y);
      }

      if (cover < 0.002) {
        gl_FragColor = vec4(0.006, 0.008, 0.013, uOpacity * 0.6);
        return;
      }

      vec3 src = texture2D(uSource, clamp(srcUv, 0.0, 1.0)).rgb;
      float luma = dot(src, vec3(0.299, 0.587, 0.114));

      vec2 g = vec2(a * 5.0, vUv.y * 26.0) - vec2(0.0, uTime * 0.05);
      vec2 cell = fract(g) - 0.5;
      float line = 1.0 - smoothstep(0.02, 0.13, min(abs(cell.x), abs(cell.y)));
      float dots = step(0.988 - uDensity * 0.07, hash(floor(g * 2.0)));
      float field = mix(line, dots, 0.4);

      vec3 tint = mix(vec3(0.45, 0.55, 0.7), vec3(0.86, 0.9, 0.98), uFeed);
      vec3 colour = tint * (0.16 + 0.84 * src.g) + tint * field * (0.3 + luma);
      colour *= uBright * cover * mix(0.45, 1.0, uFeed);

      gl_FragColor = vec4(colour, uOpacity);
    }
  `,
});
cylinderMaterial.renderOrder = 2;

const cylinder = new THREE.Mesh(
  new THREE.CylinderGeometry(cylinderRadius, cylinderRadius, cylinderHeight, 128, 1, true),
  cylinderMaterial,
);
cylinder.position.y = cylinderHeight / 2;
scene.add(cylinder);

// ---------------------------------------------------------------- cameras
const cameraList = presetCameras.map((preset) => {
  const camera = new THREE.PerspectiveCamera(
    preset.fovDeg,
    aspectOf(innerWidth, innerHeight),
    0.05,
    600,
  );
  camera.position.fromArray(preset.position);
  camera.lookAt(new THREE.Vector3().fromArray(preset.target));
  camera.name = preset.id;
  return camera;
});
const cameraById = new Map(cameraList.map((camera) => [camera.name, camera]));

const debugCamera = cameraById.get("TOP");
const controls = new OrbitControls(debugCamera, renderer.domElement);
controls.enableDamping = true;
controls.target.fromArray(presetCameras.find((preset) => preset.id === "TOP")?.target ?? [0, 0, 0]);
let programId = cameraById.has(params.get("view")) ? params.get("view") : sceneJson.programCamera;
const programFor = () => cameraById.get(programId) ?? cameraList[0];
controls.enabled = programId === "TOP";

// The brief's recording request for this demo: Wide -> Performer -> Orbit -> Top -> Wide.
const cutSchedule =
  params.get("cuts") === "1"
    ? [
        { at: 0, view: "BOWL_WIDE" },
        { at: 8, view: "PERFORMER_FRONT" },
        { at: 16, view: "ORBIT_45" },
        { at: 24, view: "TOP" },
        { at: 28, view: "BOWL_WIDE" },
      ]
    : null;

let panoIndex = Math.max(
  0,
  panoModes.findIndex((mode) => mode.id === (params.get("pano") ?? panoModes[0].id)),
);

// ---------------------------------------------------------------- quad preview
const quadEnabled = params.get("quad") !== "0";
const hudEnabled = params.get("hud") !== "0";
const quadRoot = document.getElementById("quad");
if (!hudEnabled) {
  for (const element of document.querySelectorAll(".hud, .badge, #quad, .cut")) {
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
  wrap: document.getElementById("hud-wrap"),
  pano: document.getElementById("hud-pano"),
  stream: document.getElementById("hud-stream"),
  cam: document.getElementById("hud-cam"),
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

const panoRow = document.getElementById("row-pano");
const panoButtons = new Map();
for (const mode of panoModes) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = mode.label;
  button.title = mode.note;
  button.addEventListener("click", () => setPano(panoModes.indexOf(mode)));
  panoRow.appendChild(button);
  panoButtons.set(mode.id, button);
}

function setProgram(id) {
  if (!cameraById.has(id)) return;
  programId = id;
  controls.enabled = programId === "TOP";
  for (const [cameraId, button] of cameraButtons) {
    button.setAttribute("aria-pressed", String(cameraId === programId));
  }
  layoutQuadChrome(innerWidth, innerHeight);
}

function setPano(index) {
  panoIndex = clamp(index, 0, panoModes.length - 1);
  for (const [modeId, button] of panoButtons) {
    button.setAttribute("aria-pressed", String(modeId === panoModes[panoIndex].id));
  }
}

// ---------------------------------------------------------------- stream state
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
setPano(panoIndex);
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

  uniforms.uWrap.value = sample.wrap;
  uniforms.uRotate.value = sample.rotation;
  uniforms.uBright.value = sample.bright;
  uniforms.uDensity.value = sample.density;
  uniforms.uTime.value = cueTime;
  uniforms.uFeed.value = feed;
  uniforms.uPano.value = panoIndex;

  // bars rise above the cylinder at PEAK: the light crossing the screen becomes the event
  const barHeight = (cylinderHeight - 0.8) * (1 + sample.barLift * 0.55);
  for (const bar of backLightBars) {
    bar.scale.y = barHeight;
    bar.position.y = barHeight / 2;
  }
  barMaterial.opacity = 0.35 + sample.barBright * 0.6;
  tickMaterial.opacity = 0.22 + sample.crowd * 0.7;

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
    const coveredDeg = Math.min(sample.wrap * 2 * 57.2958, 360);
    hud.wrap.textContent = `覆盖 ${coveredDeg.toFixed(0)}° / 360° · 旋转 ${(
      (sample.rotation * 180) / Math.PI
    ).toFixed(0)}° · 观众环 ${(sample.crowd * 100).toFixed(0)}%`;
    // the ratio printed is the mode's ACTUAL ratio; V1 printed 7.85:1 for every mode
    hud.pano.textContent = `${panoModes[panoIndex].label} · ${panoModes[panoIndex].ratio}`;
    hud.stream.textContent = streamState.toUpperCase();
    hud.stream.dataset.state = streamState;
    const preset = presetCameras.find((item) => item.id === programId);
    hud.cam.textContent = preset ? `${programId}｜${preset.label}` : programId;
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
      wrap: sample.wrap,
      rotation: sample.rotation,
      barLift: sample.barLift,
      crowd: sample.crowd,
      pano: panoModes[panoIndex].id,
      stream: streamState,
      program: programId,
      frames,
    };
  },
};
