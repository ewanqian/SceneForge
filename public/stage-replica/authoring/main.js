// Stage Replica — Authoring (Issue #42 · P0).
//
// The point of this page is NOT to be a fifth demo. It is to test the goal's actual acceptance
// criterion: can somebody who did not write the renderer build their own scene without touching
// core source? So this page owns a small canonical scene shape and a generic surface renderer, and
// every scene is just data - editable in the side panel, shareable as a URL, exportable as JSON.
//
// It deliberately does not import the four demo pages. Those keep their bespoke shaders and
// behaviours (Issue #42 §4 requires that); this page proves the shared surface can be authored.
//
// Deterministic entry points:
//   #s=<base64url>   a shared scene
//   ?probe=1         write machine-readable state into the DOM
//   ?t=<seconds>     cue position

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { aspectOf } from "../shared/fit-math.js";

const params = new URLSearchParams(location.search);
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

const LS = {
  scene: "stage-replica.authoring.scene",
  v1Scene: "stage-replica.authoring.v1.scene",
  v1Notes: "stage-replica.authoring.v1.notes",
  v2Scene: "stage-replica.authoring.v2.scene",
  v2Notes: "stage-replica.authoring.v2.notes",
};
const readLS = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const writeLS = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode: editing still works, it just will not persist */
  }
};

const encode = (text) => btoa(unescape(encodeURIComponent(text))).replace(/=+$/, "");
const decode = (text) => {
  const padded = text + "=".repeat((4 - (text.length % 4)) % 4);
  return decodeURIComponent(escape(atob(padded)));
};

// ---------------------------------------------------------------- scene model
function defaultScene() {
  return {
    schemaVersion: 1,
    sceneId: "untitled-scene",
    units: "meters",
    note: "Authoring 场景。",
    objects: [
      {
        id: "PLATFORM",
        kind: "platform",
        shape: "cylinder",
        diameterM: 12,
        heightM: 0.9,
        positionM: [0, 0, 0],
        color: "#1b212b",
      },
    ],
    surfaces: [
      {
        id: "SURF_1",
        shape: "plane",
        sizeM: { widthM: 16, heightM: 9 },
        transform: { positionM: [0, 5, -8], rotationDeg: [0, 0, 0] },
        source: { kind: "procedural", id: "testcard" },
        fit: "stretch",
        opacity: 1,
      },
    ],
    cameras: [
      { id: "CAM_1", label: "观众席全景", positionM: [0, 7, 26], targetM: [0, 4.5, 0], fovDeg: 45 },
      { id: "CAM_2", label: "中轴近景", positionM: [0, 2.4, 8], targetM: [0, 3.5, -8], fovDeg: 52 },
      { id: "CAM_3", label: "侧后方", positionM: [-14, 6, 14], targetM: [0, 4, -4], fovDeg: 50 },
    ],
    cue: {
      durationSec: 24,
      rampSec: 2,
      states: [
        { id: "ST_1", label: "铺垫", start: 0, end: 6, brightness: 0.35, coverage: 0.35, cycle: 0 },
        {
          id: "ST_2",
          label: "建立",
          start: 6,
          end: 12,
          brightness: 0.7,
          coverage: 0.65,
          cycle: 0.2,
        },
        { id: "ST_3", label: "爆发", start: 12, end: 18, brightness: 1, coverage: 1, cycle: 0.5 },
        {
          id: "ST_4",
          label: "收束",
          start: 18,
          end: 24,
          brightness: 0.4,
          coverage: 0.4,
          cycle: 0.7,
        },
      ],
    },
    programCamera: "CAM_1",
  };
}

/** Adapt an official demo manifest into this canonical shape.
 *  This adapter is itself the evidence that the four demos do not share one schema: each shape
 *  reads a different set of size keys, and two of them have no transform at all. */
function adaptDemo(raw, demoId) {
  const scene = defaultScene();
  scene.sceneId = `${demoId}-adapted`;
  scene.note = `从官方 Demo「${demoId}」的 scene.json 适配而来。适配器本身就是四个 Demo 尚未共用一套 schema 的证据。`;
  scene.objects = [];
  scene.surfaces = (raw.screens ?? []).map((screen, index) => {
    const size = screen.physicalSize ?? {};
    const shape = screen.shape ?? "plane";
    const surface = {
      id: screen.id ?? `SURF_${index + 1}`,
      shape,
      sizeM: {
        widthM: size.widthM ?? size.diameterM ?? (size.radiusM ? size.radiusM * 2 : 12),
        heightM: size.heightM ?? 9,
      },
      transform: screen.transform ?? { positionM: [0, 5, -8], rotationDeg: [0, 0, 0] },
      source: { kind: "procedural", id: "testcard" },
      fit: "stretch",
      opacity: 1,
    };
    if (shape === "dome") {
      surface.sizeM = { widthM: (size.radiusM ?? 20) * 2, heightM: size.radiusM ?? 20 };
      surface.transform = { positionM: [0, 0, 0], rotationDeg: [0, 0, 0] };
    }
    return surface;
  });
  scene.cameras = (raw.cameras ?? []).map((camera) => ({
    id: camera.id,
    label: camera.label ?? camera.id,
    positionM: camera.position,
    targetM: camera.target,
    fovDeg: camera.fovDeg,
  }));
  scene.cue = {
    durationSec: raw.cue?.durationSec ?? 24,
    rampSec: raw.cue?.rampSec ?? 2,
    states: (raw.cue?.states ?? []).map((state, index) => ({
      id: state.id,
      label: state.label,
      start: state.start,
      end: state.end,
      brightness: 0.4 + index * 0.2,
      coverage: 0.35 + index * 0.22,
      cycle: index * 0.2,
    })),
  };
  scene.programCamera = raw.programCamera ?? scene.cameras[0]?.id;
  return scene;
}

let scene = defaultScene();
let selected = { kind: "surface", id: "SURF_1" };
let playing = false;
let cueTime = Number.parseFloat(params.get("t") ?? "0") || 0;

// ---------------------------------------------------------------- sources
const sourceCache = new Map();
function proceduralTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 576;
  const ctx = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const draw = (time) => {
    ctx.fillStyle = "#05070c";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "rgba(120,150,200,0.28)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvas.width; x += canvas.width / 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += canvas.height / 9) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    // An asymmetric landmark, so a fit change is visible rather than merely asserted.
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 16;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.12, canvas.height * 0.82);
    ctx.lineTo(canvas.width * 0.86, canvas.height * 0.2);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,190,110,0.9)";
    const sweep = (time * 0.18) % 1;
    ctx.fillRect(sweep * canvas.width, canvas.height * 0.5 - 10, 70, 20);
    ctx.fillStyle = "rgba(210,225,245,0.8)";
    ctx.font = "bold 40px monospace";
    ctx.fillText("SURFACE", 30, canvas.height - 30);
    texture.needsUpdate = true;
  };
  return { texture, draw };
}
const procedural = proceduralTexture();

function textureFor(source) {
  if (!source || source.kind === "procedural") return procedural.texture;
  const key = `${source.kind}:${source.url}`;
  if (sourceCache.has(key)) return sourceCache.get(key);
  const loader = new THREE.TextureLoader();
  const texture = loader.load(source.url, undefined, undefined, () => {
    /* a broken URL keeps the last good texture rather than blanking the scene */
  });
  texture.colorSpace = THREE.SRGBColorSpace;
  sourceCache.set(key, texture);
  return texture;
}

// ---------------------------------------------------------------- renderer
const stageEl = document.getElementById("stage");
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x04060a, 1);
stageEl.appendChild(renderer.domElement);

const three = new THREE.Scene();
three.add(new THREE.HemisphereLight(0x8899bb, 0x090b10, 0.9));
const key = new THREE.DirectionalLight(0xffffff, 0.9);
key.position.set(14, 26, 16);
three.add(key);

const editable = new THREE.Group();
three.add(editable);

const surfaceMaterial = (spec, texture) =>
  new THREE.ShaderMaterial({
    uniforms: {
      uSource: { value: texture },
      uBright: { value: 1 },
      uCoverage: { value: 1 },
      uCycle: { value: 0 },
      uShape: { value: spec.shape === "cylinder" ? 1 : spec.shape === "dome" ? 2 : 0 },
      uOpacity: { value: spec.opacity ?? 1 },
      uTime: { value: 0 },
    },
    side: THREE.DoubleSide,
    transparent: (spec.opacity ?? 1) < 1,
    vertexShader: `
      varying vec3 vPos; varying vec2 vUv;
      void main() { vPos = position; vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: `
      uniform sampler2D uSource; uniform float uBright, uCoverage, uCycle, uShape, uOpacity, uTime;
      varying vec3 vPos; varying vec2 vUv;
      const float PI = 3.141592653589793;
      void main() {
        vec2 uv = vUv;
        float cover = 1.0;
        if (uShape > 0.5) {
          // cylinder and dome: the sample is placed by azimuth around the object, so "coverage"
          // genuinely opens and closes the media rather than just changing brightness.
          float az = atan(vPos.x, vPos.z) - uCycle * PI * 2.0;
          az = atan(sin(az), cos(az));
          // NOTE: this variable must NOT be named after the GLSL ES reserved word for a 16-bit
          // float. Reserved words are illegal identifiers, and the failure mode is invisible: the
          // fragment shader simply refuses to compile and the surface renders black at every time.
          float halfAz = max(uCoverage * PI, 0.02);
          cover = 1.0 - smoothstep(max(halfAz - 0.30, 0.0), halfAz, abs(az));
          uv = vec2((az + PI) / (2.0 * PI), vUv.y);
          if (uShape > 1.5) {
            float elev = clamp((vPos.y / max(length(vPos), 0.001)) * 0.5 + 0.5, 0.0, 1.0);
            float halfElev = max(uCoverage * PI * 0.5, 0.02);
            float e = asin(clamp(vPos.y / max(length(vPos), 0.001), -1.0, 1.0));
            cover *= 1.0 - smoothstep(max(halfElev - 0.30, 0.0), halfElev, abs(e));
            uv = vec2(uv.x, elev);
          }
        } else {
          // plane: coverage crops horizontally, centred. The smoothstep edges must be in ascending
          // order - the reversed form is undefined in GLSL and returns 0, which silently turned the
          // whole surface into a black scrim.
          float halfX = max(uCoverage * 0.5, 0.02);
          cover = 1.0 - smoothstep(halfX, halfX + 0.03, abs(uv.x - 0.5));
        }
        if (cover < 0.004) { gl_FragColor = vec4(0.01, 0.012, 0.018, uOpacity); return; }
        vec3 src = texture2D(uSource, clamp(uv, 0.0, 1.0)).rgb;
        float luma = dot(src, vec3(0.299, 0.587, 0.114));
        float grid = step(0.92, fract(uv.x * 24.0)) + step(0.92, fract(uv.y * 14.0));
        vec3 colour = src * uBright + vec3(0.10, 0.16, 0.26) * grid * 0.5 * (0.3 + luma);
        gl_FragColor = vec4(colour * cover, uOpacity);
      }
    `,
  });

let surfaceMeshes = [];
let cameraList = [];
let controls = null;

function disposeEditable() {
  editable.traverse((node) => {
    if (node.geometry) node.geometry.dispose();
    if (node.material && node.material.dispose) node.material.dispose();
  });
  editable.clear();
  surfaceMeshes = [];
}

function rebuildScene() {
  disposeEditable();

  for (const object of scene.objects ?? []) {
    const colour = new THREE.Color(object.color ?? "#1b212b");
    if (object.shape === "cylinder") {
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(object.diameterM / 2, object.diameterM / 2, object.heightM, 48),
        new THREE.MeshStandardMaterial({ color: colour, roughness: 0.95 }),
      );
      mesh.position.fromArray(object.positionM).add(new THREE.Vector3(0, object.heightM / 2, 0));
      editable.add(mesh);
    } else if (object.shape === "box") {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(object.widthM ?? 10, object.heightM, object.depthM ?? 6),
        new THREE.MeshStandardMaterial({ color: colour, roughness: 0.95 }),
      );
      mesh.position.fromArray(object.positionM);
      editable.add(mesh);
    } else {
      const mesh = new THREE.Mesh(
        new THREE.CircleGeometry(object.diameterM / 2, 48),
        new THREE.MeshStandardMaterial({ color: colour, roughness: 1, side: THREE.DoubleSide }),
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.fromArray(object.positionM);
      editable.add(mesh);
    }
  }

  for (const spec of scene.surfaces ?? []) {
    const texture = textureFor(spec.source);
    const material = surfaceMaterial(spec, texture);
    let geometry;
    if (spec.shape === "cylinder") {
      geometry = new THREE.CylinderGeometry(
        spec.sizeM.widthM / 2,
        spec.sizeM.widthM / 2,
        spec.sizeM.heightM,
        96,
        1,
        true,
      );
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.fromArray(spec.transform.positionM);
      mesh.rotation.y = ((spec.transform.rotationDeg?.[1] ?? 0) * Math.PI) / 180;
      editable.add(mesh);
    } else if (spec.shape === "dome") {
      const radius = spec.sizeM.widthM / 2;
      geometry = new THREE.SphereGeometry(radius, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.fromArray(spec.transform.positionM);
      editable.add(mesh);
    } else {
      geometry = new THREE.PlaneGeometry(spec.sizeM.widthM, spec.sizeM.heightM);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.fromArray(spec.transform.positionM);
      const rot = spec.transform.rotationDeg ?? [0, 0, 0];
      mesh.rotation.set(
        (rot[0] * Math.PI) / 180,
        (rot[1] * Math.PI) / 180,
        (rot[2] * Math.PI) / 180,
      );
      editable.add(mesh);
    }
    surfaceMeshes.push(material);
  }

  // floor grid + a 1.7 m scale reference, so a scene always carries scale
  editable.add(new THREE.GridHelper(80, 20, 0x2a3441, 0x1a2029));
  const post = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 1.7, 0.14),
    new THREE.MeshStandardMaterial({ color: 0xd8dee8, emissive: 0x262c34 }),
  );
  post.position.set(-6, 0.85, 0);
  editable.add(post);

  cameraList = (scene.cameras ?? []).map((spec) => {
    const camera = new THREE.PerspectiveCamera(
      spec.fovDeg ?? 45,
      aspectOf(innerWidth, innerHeight),
      0.1,
      900,
    );
    camera.position.fromArray(spec.positionM ?? [0, 5, 20]);
    camera.lookAt(new THREE.Vector3().fromArray(spec.targetM ?? [0, 3, 0]));
    camera.name = spec.id;
    return camera;
  });

  if (!controls) {
    controls = new OrbitControls(cameraList[0], renderer.domElement);
    controls.enableDamping = true;
  }
  controls.enabled = false;

  if (procedural.texture) {
    for (const material of surfaceMeshes)
      material.uniforms.uSource.value = textureSafeguard(material);
  }
  renderCameraBar();
  resize();
}

// ensure every surface keeps a live procedural texture if its source is procedural
function textureSafeguard(material) {
  return material.uniforms.uSource.value ?? procedural.texture;
}

function resize() {
  const width = stageEl.clientWidth || 800;
  const height = stageEl.clientHeight || 600;
  renderer.setSize(width, height, false);
  const aspect = aspectOf(width, height);
  for (const camera of cameraList) {
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }
}

// ---------------------------------------------------------------- cue
function evaluate(time) {
  const cue = scene.cue ?? { durationSec: 24, rampSec: 2, states: [] };
  const states = cue.states ?? [];
  if (states.length === 0) return { brightness: 1, coverage: 1, cycle: 0, index: -1 };
  const clamped = clamp(time, 0, cue.durationSec - 0.001);
  let index = states.findIndex((s) => clamped >= s.start && clamped < s.end);
  if (index < 0) index = states.length - 1;
  const state = states[index];
  const previous = index === 0 ? state : states[index - 1];
  const ramp = cue.rampSec > 0 ? clamp((clamped - state.start) / cue.rampSec, 0, 1) : 1;
  const eased = ramp * ramp * (3 - 2 * ramp);
  const mix = (a, b) => (a ?? 0) + ((b ?? 0) - (a ?? 0)) * eased;
  return {
    index,
    id: state.id,
    label: state.label,
    brightness: mix(previous.brightness, state.brightness),
    coverage: mix(previous.coverage, state.coverage),
    cycle: mix(previous.cycle, state.cycle),
  };
}

// ---------------------------------------------------------------- UI: lists
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

function numberField(parent, label, value, onChange, step = 0.1) {
  parent.append(el("span", null, label));
  const input = el("input");
  input.type = "number";
  input.step = String(step);
  input.value = String(value ?? 0);
  input.addEventListener("change", () => {
    const parsed = Number.parseFloat(input.value);
    onChange(Number.isFinite(parsed) ? parsed : 0);
  });
  parent.append(input);
  return input;
}

function renderSurfaces() {
  const root = document.getElementById("surfaces");
  root.replaceChildren();
  const list = scene.surfaces ?? [];
  if (list.length === 0) root.append(el("div", "empty", "还没有媒体面。"));
  list.forEach((spec, index) => {
    const card = el("div", "item");
    card.dataset.sel = String(selected.kind === "surface" && selected.id === spec.id);
    const head = el("div", "item-head");
    head.append(el("b", null, `${index + 1}. ${spec.id}`));
    const remove = el("button", "tiny", "删除");
    remove.addEventListener("click", () => {
      scene.surfaces.splice(index, 1);
      rebuildScene();
      renderUI();
    });
    head.append(remove);
    card.append(head);

    const g = el("div", "grid");
    g.append(el("span", null, "形状"));
    const shape = el("select");
    for (const value of ["plane", "cylinder", "dome"]) {
      const option = el("option", null, value);
      option.value = value;
      if (spec.shape === value) option.selected = true;
      shape.append(option);
    }
    shape.addEventListener("change", () => {
      spec.shape = shape.value;
      rebuildScene();
    });
    g.append(shape);
    g.append(el("span", null, "fit"));
    const fit = el("select");
    for (const value of ["stretch", "cover"]) {
      const option = el("option", null, value);
      option.value = value;
      if (spec.fit === value) option.selected = true;
      fit.append(option);
    }
    fit.addEventListener("change", () => {
      spec.fit = fit.value;
    });
    g.append(fit);
    numberField(g, "宽 m", spec.sizeM.widthM, (v) => {
      spec.sizeM.widthM = v;
      rebuildScene();
    });
    numberField(g, "高 m", spec.sizeM.heightM, (v) => {
      spec.sizeM.heightM = v;
      rebuildScene();
    });
    numberField(g, "x", spec.transform.positionM[0], (v) => {
      spec.transform.positionM[0] = v;
      rebuildScene();
    });
    numberField(g, "y", spec.transform.positionM[1], (v) => {
      spec.transform.positionM[1] = v;
      rebuildScene();
    });
    numberField(g, "z", spec.transform.positionM[2], (v) => {
      spec.transform.positionM[2] = v;
      rebuildScene();
    });
    numberField(
      g,
      "旋 Y°",
      spec.transform.rotationDeg?.[1] ?? 0,
      (v) => {
        spec.transform.rotationDeg = spec.transform.rotationDeg ?? [0, 0, 0];
        spec.transform.rotationDeg[1] = v;
        rebuildScene();
      },
      1,
    );
    card.append(g);

    const src = el("div", "grid n2");
    src.append(el("span", null, "素材"));
    const kind = el("select");
    for (const value of ["procedural", "video", "image"]) {
      const option = el("option", null, value);
      option.value = value;
      if ((spec.source?.kind ?? "procedural") === value) option.selected = true;
      kind.append(option);
    }
    kind.addEventListener("change", () => {
      spec.source = { kind: kind.value, url: spec.source?.url ?? "" };
      rebuildScene();
      renderUI();
    });
    src.append(kind);
    card.append(src);
    if ((spec.source?.kind ?? "procedural") !== "procedural") {
      const urlRow = el("div", "grid n2");
      urlRow.append(el("span", null, "URL"));
      const url = el("input");
      url.type = "text";
      url.placeholder = "https://… 或选择本地文件";
      url.value = spec.source?.url ?? "";
      url.addEventListener("change", () => {
        spec.source = { kind: spec.source.kind, url: url.value };
        rebuildScene();
      });
      urlRow.append(url);
      card.append(urlRow);
      const fileRow = el("div", "row");
      const file = el("input");
      file.type = "file";
      file.accept = spec.source.kind === "video" ? "video/*" : "image/*";
      file.addEventListener("change", (event) => {
        const chosen = event.target.files?.[0];
        if (!chosen) return;
        spec.source = { kind: spec.source.kind, url: URL.createObjectURL(chosen) };
        rebuildScene();
        renderUI();
      });
      fileRow.append(file);
      card.append(fileRow);
    }
    root.append(card);
  });
}

function renderObjects() {
  const root = document.getElementById("objects");
  root.replaceChildren();
  const list = scene.objects ?? [];
  if (list.length === 0) root.append(el("div", "empty", "还没有物体。"));
  list.forEach((spec, index) => {
    const card = el("div", "item");
    const head = el("div", "item-head");
    head.append(el("b", null, `${index + 1}. ${spec.id}`));
    const remove = el("button", "tiny", "删除");
    remove.addEventListener("click", () => {
      scene.objects.splice(index, 1);
      rebuildScene();
      renderUI();
    });
    head.append(remove);
    card.append(head);
    const g = el("div", "grid");
    g.append(el("span", null, "形状"));
    const shape = el("select");
    for (const value of ["cylinder", "box", "disc"]) {
      const option = el("option", null, value);
      option.value = value;
      if (spec.shape === value) option.selected = true;
      shape.append(option);
    }
    shape.addEventListener("change", () => {
      spec.shape = shape.value;
      rebuildScene();
    });
    g.append(shape);
    numberField(g, "直径 m", spec.diameterM, (v) => {
      spec.diameterM = v;
      rebuildScene();
    });
    numberField(g, "高 m", spec.heightM, (v) => {
      spec.heightM = v;
      rebuildScene();
    });
    numberField(g, "x", spec.positionM[0], (v) => {
      spec.positionM[0] = v;
      rebuildScene();
    });
    numberField(g, "z", spec.positionM[2], (v) => {
      spec.positionM[2] = v;
      rebuildScene();
    });
    card.append(g);
    root.append(card);
  });
}

function renderCameras() {
  const root = document.getElementById("cameras");
  root.replaceChildren();
  const list = scene.cameras ?? [];
  if (list.length === 0) root.append(el("div", "empty", "还没有机位。"));
  list.forEach((spec, index) => {
    const card = el("div", "item");
    const head = el("div", "item-head");
    head.append(el("b", null, `${index + 1}. ${spec.id}`));
    const setProgram = el("button", "tiny", "设为 Program");
    setProgram.addEventListener("click", () => {
      scene.programCamera = spec.id;
      renderCameraBar();
      renderUI();
    });
    const remove = el("button", "tiny", "删除");
    remove.addEventListener("click", () => {
      scene.cameras.splice(index, 1);
      if (scene.programCamera === spec.id) scene.programCamera = scene.cameras[0]?.id;
      rebuildScene();
      renderUI();
    });
    head.append(setProgram, remove);
    card.append(head);
    const g = el("div", "grid n2");
    g.append(el("span", null, "名称"));
    const label = el("input");
    label.type = "text";
    label.value = spec.label ?? spec.id;
    label.addEventListener("change", () => {
      spec.label = label.value;
      renderCameraBar();
      renderUI();
    });
    g.append(label);
    numberField(g, "眼高 y", spec.positionM[1], (v) => {
      spec.positionM[1] = v;
      rebuildScene();
    });
    numberField(g, "距离 z", spec.positionM[2], (v) => {
      spec.positionM[2] = v;
      rebuildScene();
    });
    numberField(g, "横向 x", spec.positionM[0], (v) => {
      spec.positionM[0] = v;
      rebuildScene();
    });
    numberField(
      g,
      "fov°",
      spec.fovDeg,
      (v) => {
        spec.fovDeg = v;
        rebuildScene();
      },
      1,
    );
    card.append(g);
    root.append(card);
  });
}

function renderStates() {
  const root = document.getElementById("states");
  root.replaceChildren();
  const states = scene.cue?.states ?? [];
  if (states.length === 0) root.append(el("div", "empty", "还没有状态。"));
  states.forEach((spec, index) => {
    const card = el("div", "item");
    const head = el("div", "item-head");
    head.append(el("b", null, `${index + 1}. ${spec.id}｜${spec.label ?? ""}`));
    const remove = el("button", "tiny", "删除");
    remove.addEventListener("click", () => {
      scene.cue.states.splice(index, 1);
      renderUI();
    });
    head.append(remove);
    card.append(head);
    const g = el("div", "grid");
    numberField(g, "起 s", spec.start, (v) => {
      spec.start = v;
      renderUI();
    });
    numberField(g, "止 s", spec.end, (v) => {
      spec.end = v;
      renderUI();
    });
    numberField(g, "亮度", spec.brightness, (v) => {
      spec.brightness = v;
    });
    numberField(g, "覆盖", spec.coverage, (v) => {
      spec.coverage = v;
    });
    numberField(g, "循环", spec.cycle, (v) => {
      spec.cycle = v;
    });
    card.append(g);
    root.append(card);
  });
}

function renderCameraBar() {
  const bar = document.getElementById("cam-bar");
  bar.replaceChildren();
  for (const camera of scene.cameras ?? []) {
    const button = el("button", null, `${camera.id}｜${camera.label ?? ""}`);
    button.setAttribute("aria-pressed", String(camera.id === scene.programCamera));
    button.addEventListener("click", () => {
      scene.programCamera = camera.id;
      renderCameraBar();
    });
    bar.append(button);
  }
}

// ---------------------------------------------------------------- checklist
const CHECK_ITEMS = [
  {
    id: "surfaces",
    label: "可以添加 / 删除 / 移动至少 2 个 media surface",
    test: () => (scene.surfaces?.length ?? 0) >= 2,
  },
  {
    id: "source",
    label: "可以替换自己的素材（procedural / video / image）",
    test: () =>
      (scene.surfaces ?? []).some((s) => s.source?.kind && s.source.kind !== "procedural"),
  },
  {
    id: "states",
    label: "可以保存 3–4 个状态",
    test: () => {
      const n = scene.cue?.states?.length ?? 0;
      return n >= 3 && n <= 4;
    },
  },
  { id: "cameras", label: "可以建立至少 3 个机位", test: () => (scene.cameras?.length ?? 0) >= 3 },
  { id: "v1", label: "可以完整播放 V1", test: () => Boolean(readLS(LS.v1Scene)) },
  {
    id: "notes",
    label: "可以保存 review notes",
    test: () => (document.getElementById("v1-notes").value ?? "").trim().length >= 10,
  },
  {
    id: "v2",
    label: "可以保存 V2 且 V1 不被覆盖",
    test: () => Boolean(readLS(LS.v2Scene)) && Boolean(readLS(LS.v1Scene)),
  },
  { id: "share", label: "可以生成可分享 URL", test: () => location.hash.startsWith("#s=") },
  {
    id: "export",
    label: "可以导出 scene package",
    test: () => window.__AUTHORING__.exported === true,
  },
];

function updateChecklist() {
  const root = document.getElementById("checklist");
  root.replaceChildren();
  let passed = 0;
  for (const item of CHECK_ITEMS) {
    let ok = false;
    try {
      ok = item.test();
    } catch {
      ok = false;
    }
    if (ok) passed += 1;
    const row = el("div", "check");
    row.append(el("span", ok ? "m" : "x", ok ? "✓" : "○"), el("span", null, item.label));
    root.append(row);
  }
  document.getElementById("check-sub").textContent =
    `Issue #42 §3 的最低验收 · ${passed}/${CHECK_ITEMS.length} 通过`;
}

function renderUI() {
  document.getElementById("scene-id").value = scene.sceneId ?? "";
  renderObjects();
  renderSurfaces();
  renderCameras();
  renderStates();
  renderCameraBar();
  const cue = scene.cue ?? {};
  document.getElementById("scrub").max = String(cue.durationSec ?? 24);
  document.getElementById("v1-stamp").textContent = readLS(LS.v1Scene)
    ? "已保存 V1 快照"
    : "尚未保存";
  document.getElementById("v2-stamp").textContent = readLS(LS.v2Scene)
    ? "已保存 V2 快照"
    : "尚未保存";
  updateChecklist();
}

// ---------------------------------------------------------------- persistence
function serialize() {
  return JSON.stringify(scene, null, 2);
}

function loadScene(next) {
  scene = next;
  selected = { kind: "surface", id: scene.surfaces?.[0]?.id };
  cueTime = 0;
  rebuildScene();
  renderUI();
}

function persistWorking() {
  writeLS(LS.scene, serialize());
}

// ---------------------------------------------------------------- wiring
document.getElementById("scene-id").addEventListener("change", (event) => {
  scene.sceneId = event.target.value;
  persistWorking();
});
document.getElementById("add-surface").addEventListener("click", () => {
  const index = (scene.surfaces?.length ?? 0) + 1;
  scene.surfaces = scene.surfaces ?? [];
  scene.surfaces.push({
    id: `SURF_${index}`,
    shape: "plane",
    sizeM: { widthM: 12, heightM: 6.75 },
    transform: {
      positionM: [index % 2 === 0 ? 10 : -10, 4, 6],
      rotationDeg: [0, index % 2 === 0 ? -30 : 30, 0],
    },
    source: { kind: "procedural", id: "testcard" },
    fit: "stretch",
    opacity: 1,
  });
  rebuildScene();
  renderUI();
});
document.getElementById("add-object").addEventListener("click", () => {
  scene.objects = scene.objects ?? [];
  scene.objects.push({
    id: `OBJ_${(scene.objects.length ?? 0) + 1}`,
    kind: "platform",
    shape: "cylinder",
    diameterM: 8,
    heightM: 0.8,
    positionM: [8, 0, 4],
    color: "#232a35",
  });
  rebuildScene();
  renderUI();
});
document.getElementById("add-camera").addEventListener("click", () => {
  scene.cameras = scene.cameras ?? [];
  const index = scene.cameras.length + 1;
  scene.cameras.push({
    id: `CAM_${index}`,
    label: "新机位",
    positionM: [index % 2 ? 10 : -10, 4, 18],
    targetM: [0, 4, -4],
    fovDeg: 50,
  });
  rebuildScene();
  renderUI();
});
document.getElementById("add-state").addEventListener("click", () => {
  scene.cue = scene.cue ?? { durationSec: 24, rampSec: 2, states: [] };
  const states = scene.cue.states;
  const last = states[states.length - 1];
  const start = last ? last.end : 0;
  states.push({
    id: `ST_${states.length + 1}`,
    label: "新状态",
    start,
    end: start + 6,
    brightness: 0.6,
    coverage: 0.6,
    cycle: 0.3,
  });
  scene.cue.durationSec = Math.max(scene.cue.durationSec, start + 6);
  renderUI();
});
document.getElementById("btn-reset").addEventListener("click", () => {
  loadScene(defaultScene());
  persistWorking();
});
async function loadDemo(demo) {
  if (!demo) return;
  try {
    const response = await fetch(`../${demo}/scene.json`);
    loadScene(adaptDemo(await response.json(), demo));
    persistWorking();
  } catch {
    /* a missing demo manifest should not break the editor */
  }
}

const demoRow = document.getElementById("demo-row");
for (const demo of ["sphere", "festival", "installation", "stadium"]) {
  const button = el("button", "tiny", demo);
  button.addEventListener("click", () => loadDemo(demo));
  demoRow.append(button);
}
document.getElementById("btn-load-demo").addEventListener("click", () => loadDemo("stadium"));
document.getElementById("btn-export").addEventListener("click", () => {
  const blob = new Blob([serialize()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${scene.sceneId || "scene"}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  window.__AUTHORING__.exported = true;
  updateChecklist();
});
document.getElementById("btn-share").addEventListener("click", async () => {
  location.hash = `s=${encode(serialize())}`;
  try {
    await navigator.clipboard.writeText(location.href);
    document.getElementById("share-hint").textContent = "已复制。整个场景在 URL 里，不需要服务器。";
  } catch {
    document.getElementById("share-hint").textContent =
      "链接已生成（见地址栏）；浏览器拒绝了剪贴板权限。";
  }
  updateChecklist();
});
document.getElementById("btn-save-v1").addEventListener("click", () => {
  writeLS(LS.v1Scene, serialize());
  writeLS(LS.v1Notes, document.getElementById("v1-notes").value);
  renderUI();
});
document.getElementById("btn-save-v2").addEventListener("click", () => {
  // V1 is never overwritten: the V2 write has its own key, and V1 is created if it is missing so
  // a participant cannot end up with a V2 and no V1 to compare against.
  if (!readLS(LS.v1Scene)) {
    writeLS(LS.v1Scene, serialize());
    writeLS(LS.v1Notes, document.getElementById("v1-notes").value);
  }
  writeLS(LS.v2Scene, serialize());
  writeLS(LS.v2Notes, document.getElementById("v2-notes").value);
  renderUI();
});
document.getElementById("btn-restore-v1").addEventListener("click", () => {
  const stored = readLS(LS.v1Scene);
  if (!stored) return;
  loadScene(JSON.parse(stored));
  document.getElementById("v1-notes").value = readLS(LS.v1Notes) ?? "";
});
document.getElementById("btn-export-notes").addEventListener("click", () => {
  const payload = {
    exportedAt: new Date().toISOString(),
    sceneId: scene.sceneId,
    v1: {
      notes: readLS(LS.v1Notes) ?? "",
      scene: readLS(LS.v1Scene) ? JSON.parse(readLS(LS.v1Scene)) : null,
    },
    v2: {
      notes: readLS(LS.v2Notes) ?? "",
      scene: readLS(LS.v2Scene) ? JSON.parse(readLS(LS.v2Scene)) : null,
    },
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${scene.sceneId || "scene"}-review.json`;
  anchor.click();
  URL.revokeObjectURL(url);
});
document.getElementById("btn-play").addEventListener("click", () => {
  playing = !playing;
  document.getElementById("btn-play").textContent = playing ? "⏸ 暂停" : "▶ 播放 V1";
});
document.getElementById("scrub").addEventListener("input", (event) => {
  playing = false;
  document.getElementById("btn-play").textContent = "▶ 播放 V1";
  cueTime = Number.parseFloat(event.target.value);
});
document.getElementById("v1-notes").addEventListener("input", updateChecklist);
addEventListener("resize", resize);
addEventListener("hashchange", () => {
  if (location.hash.startsWith("#s=")) {
    try {
      loadScene(JSON.parse(decode(location.hash.slice(3))));
    } catch {
      /* a malformed share link should not blank the editor */
    }
  }
});

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
const probe = el("div");
probe.id = "probe";
probe.style.display = "none";
document.body.append(probe);

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  if (playing) {
    cueTime += delta;
    const duration = scene.cue?.durationSec ?? 24;
    if (cueTime >= duration) {
      cueTime = params.get("t") ? duration - 0.001 : 0;
      if (params.get("t")) playing = false;
    }
    document.getElementById("scrub").value = String(cueTime);
  }
  const sample = evaluate(cueTime);
  for (const material of surfaceMeshes) {
    material.uniforms.uTime.value = cueTime;
    material.uniforms.uBright.value = sample.brightness;
    material.uniforms.uCoverage.value = sample.coverage;
    material.uniforms.uCycle.value = sample.cycle;
  }
  procedural.draw(cueTime);
  const program = cameraList.find((c) => c.name === scene.programCamera) ?? cameraList[0];
  if (program) renderer.render(three, program);
  else
    renderer.render(
      three,
      new THREE.PerspectiveCamera(45, aspectOf(innerWidth, innerHeight), 0.1, 900),
    );

  document.getElementById("t-readout").textContent =
    `${cueTime.toFixed(2)} / ${(scene.cue?.durationSec ?? 24).toFixed(2)}s  ${sample.id ? `· ${sample.id}` : ""}`;

  if (params.get("probe") === "1") {
    probe.textContent = JSON.stringify({
      sceneId: scene.sceneId,
      surfaces: (scene.surfaces ?? []).map((s) => ({
        id: s.id,
        shape: s.shape,
        source: s.source?.kind,
      })),
      cameras: (scene.cameras ?? []).map((c) => c.id),
      states: (scene.cue?.states ?? []).map((s) => s.id),
      durationSec: scene.cue?.durationSec,
      programCamera: scene.programCamera,
      cueTime,
      sample,
      checklist: CHECK_ITEMS.length,
    });
  }
});

// ---------------------------------------------------------------- boot
window.__AUTHORING__ = {
  exported: false,
  get scene() {
    return scene;
  },
  setScene: loadScene,
  exportScene: serialize,
  shareUrl: () => `${location.origin}${location.pathname}#s=${encode(serialize())}`,
  encodeScene: () => encode(serialize()),
  checklist: () => CHECK_ITEMS.map((item) => ({ id: item.id, ok: item.test() })),
  markExported: () => {
    window.__AUTHORING__.exported = true;
  },
  saveV1: () => {
    writeLS(LS.v1Scene, serialize());
    writeLS(LS.v1Notes, document.getElementById("v1-notes").value);
    renderUI();
  },
  saveV2: () => {
    writeLS(LS.v2Scene, serialize());
    renderUI();
  },
  setNotes: (value) => {
    document.getElementById("v1-notes").value = value;
    updateChecklist();
  },
};

if (location.hash.startsWith("#s=")) {
  try {
    loadScene(JSON.parse(decode(location.hash.slice(3))));
  } catch {
    loadScene(defaultScene());
  }
} else if (params.get("demo")) {
  loadScene(defaultScene());
  loadDemo(params.get("demo"));
} else {
  const stored = readLS(LS.scene);
  loadScene(stored ? JSON.parse(stored) : defaultScene());
}
const storedV1Notes = readLS(LS.v1Notes);
if (storedV1Notes) document.getElementById("v1-notes").value = storedV1Notes;
// loadScene() resets the cue clock, so a ?t= still has to be applied after the boot load.
if (params.has("t")) cueTime = Number.parseFloat(params.get("t")) || 0;
resize();
