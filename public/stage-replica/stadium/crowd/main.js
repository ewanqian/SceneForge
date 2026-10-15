// Stage Replica — Stadium Crowd & Sightlines.
//
// Turns "95,000 people surrounding the stage" from a sentence into something measurable:
// how many people, at what density, whether each row can actually see, and how large the audience
// looms from the performer's own position.
//
// The C-value: for a spectator in row i, draw the sightline from their eye to the focus and
// measure the vertical clearance over the head of the spectator in row i-1. That clearance is the
// C-value; 60 mm is the convention this study adopts (theatres commonly use 60-75 mm).
//
// The interesting result, and the reason this is a study rather than a picture: with a CONSTANT
// riser the C-value decays to nothing at the back of the bowl, and no amount of looking at the
// render would tell you that. So the page also solves for the riser profile that holds C at the
// target, which is what real venues do.
//
//   ?view=<id>            viewpoint
//   ?overlay=look|density|sightline|encircle
//   ?density=sparse|normal|packed
//   ?posture=standing|seated
//   ?rake=constant|sightline
//   ?cap=<n>              limit crowd instances (used for headless capture)
//   ?probe=1              write machine-readable metrics into the DOM

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { aspectOf } from "../../shared/fit-math.js";

const params = new URLSearchParams(location.search);
const spec = await (await fetch("./crowd.json")).json();

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const pseudo = (seed) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};

// ---------------------------------------------------------------- state
let posture = params.get("posture") === "seated" ? "seated" : "standing";
let densityKey = spec.crowd.densities[params.get("density")]
  ? params.get("density")
  : spec.crowd.defaultDensity;
let rakeMode = params.get("rake") === "sightline" ? "sightline" : "constant";
let overlay = spec.overlays.some((o) => o.id === params.get("overlay"))
  ? params.get("overlay")
  : spec.defaultOverlay;
let viewId = spec.viewpoints.some((v) => v.id === params.get("view"))
  ? params.get("view")
  : spec.defaultView;
const instanceCap = Number.parseInt(params.get("cap") ?? "", 10) || spec.crowd.maxInstances;

// ---------------------------------------------------------------- stands + sightlines
const human = () => spec.sightline[posture];
const focusH = spec.sightline.focusHeightM;
const targetC = spec.sightline.cValueTargetM;

/** Build the rake. `sightline` mode solves for the riser that holds C at the target. */
function buildRows() {
  const s = spec.stands;
  const { eyeHeightM: E, headHeightM: P } = human();
  const rows = [];
  let height = s.startHeightM;
  for (let i = 0; i < s.rows; i += 1) {
    const radius = s.innerRadiusM + (i + 0.5) * s.rowDepthM;
    if (i === 0 || rakeMode === "constant") {
      height = s.startHeightM + i * s.riserM;
    } else {
      // Solve for the riser h that yields exactly targetC:
      //   C = f + k*(y_prev + h + E - f) - (y_prev + P),  k = D_prev / D_i
      // => h = [C - f + y_prev + P - k*(y_prev + E - f)] / k
      const dPrev = s.innerRadiusM + (i - 0.5) * s.rowDepthM;
      const k = dPrev / radius;
      const yPrev = rows[i - 1].height;
      const h = (targetC - focusH + yPrev + P - k * (yPrev + E - focusH)) / k;
      height = yPrev + Math.max(h, 0);
    }
    rows.push({ index: i, radius, height, riser: i === 0 ? 0 : height - rows[i - 1].height });
  }
  return rows;
}

/** C-value per row: clearance over the head of the row in front. Row 0 has nobody in front. */
function computeCValues(rows) {
  const { eyeHeightM: E, headHeightM: P } = human();
  const s = spec.stands;
  return rows.map((row, i) => {
    if (i === 0) return null;
    const dPrev = s.innerRadiusM + (i - 0.5) * s.rowDepthM;
    const yPrev = rows[i - 1].height;
    const eye = row.height + E;
    const lineAtPrev = focusH + (eye - focusH) * (dPrev / row.radius);
    return lineAtPrev - (yPrev + P);
  });
}

let rows = buildRows();
let cValues = computeCValues(rows);

// A solved riser lands exactly on the target, so a bare `c < target` flags rows that are precisely
// compliant as failures. Compare with a tolerance instead.
const failsSightline = (c) => c !== null && c < targetC - 1e-4;

// ---------------------------------------------------------------- renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x04060a, 1);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x04060a, 0.0032);
scene.add(new THREE.HemisphereLight(0x5a6a86, 0x090b10, 0.55));
const stageLight = new THREE.PointLight(0xffd9a0, 900, 260, 2);
stageLight.position.set(0, 14, 0);
scene.add(stageLight);
const beam = new THREE.SpotLight(0xbcd4ff, 2600, 320, 0.72, 0.5, 1.1);
beam.position.set(0, 78, 0);
beam.target.position.set(0, 0, 0);
scene.add(beam, beam.target);

// ---------------------------------------------------------------- ground, stage, cylinder
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(spec.venue.cylinderDiameterM / 2 + 0.5, 96),
  new THREE.MeshStandardMaterial({ color: 0x0a0d13, roughness: 1 }),
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const stageR = spec.venue.stageDiameterM / 2;
const stage = new THREE.Mesh(
  new THREE.CylinderGeometry(stageR, stageR, 1.6, 96),
  new THREE.MeshStandardMaterial({ color: 0x171c24, roughness: 0.95 }),
);
stage.position.y = 0.8;
scene.add(stage);
// the stage surface is the focus plane the whole sightline argument is measured to
scene.add(
  new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 129 }, (_, i) => {
        const a = (i / 128) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(a) * stageR, 1.62, Math.sin(a) * stageR);
      }),
    ),
    new THREE.LineBasicMaterial({ color: 0x6ea8ff, transparent: true, opacity: 0.55 }),
  ),
);

const cylR = spec.venue.cylinderDiameterM / 2;
const cylH = spec.venue.cylinderHeightM;
const cylinder = new THREE.Mesh(
  new THREE.CylinderGeometry(cylR, cylR, cylH, 96, 1, true),
  new THREE.MeshBasicMaterial({
    color: 0x2e5f8f,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
    toneMapped: false,
  }),
);
cylinder.position.y = cylH / 2;
scene.add(cylinder);

const performer = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.3, 1.1, 6, 12),
  new THREE.MeshStandardMaterial({ color: 0xffb86b, emissive: 0xff8a2b, emissiveIntensity: 1.1 }),
);
performer.position.set(0, 1.6 + 0.85, 0);
scene.add(performer);

// ---------------------------------------------------------------- bowl steps
const bowlMaterial = new THREE.MeshStandardMaterial({
  color: 0x14181f,
  roughness: 0.98,
  side: THREE.DoubleSide,
});
function buildBowl() {
  const group = new THREE.Group();
  for (const row of rows) {
    const inner = row.radius - spec.stands.rowDepthM / 2;
    const outer = row.radius + spec.stands.rowDepthM / 2;
    const tread = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 96, 1), bowlMaterial);
    tread.rotation.x = -Math.PI / 2;
    tread.position.y = row.height;
    group.add(tread);
    // riser face
    const riser = new THREE.Mesh(
      new THREE.CylinderGeometry(inner, inner, row.riser || 0.01, 96, 1, true),
      bowlMaterial,
    );
    riser.position.y = row.height - (row.riser || 0.01) / 2;
    group.add(riser);
  }
  return group;
}
let bowl = buildBowl();
scene.add(bowl);

// ---------------------------------------------------------------- crowd
const bodyGeo = new THREE.CapsuleGeometry(0.17, 0.95, 2, 5);
bodyGeo.translate(0, 0.645, 0);
const headGeo = new THREE.SphereGeometry(0.115, 6, 4);
headGeo.translate(0, 1.44, 0);
const figureGeo = mergeGeometries([bodyGeo, headGeo]);

const crowdMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });
let crowdShader = null;
crowdMaterial.onBeforeCompile = (shader) => {
  shader.uniforms.uTime = { value: 0 };
  shader.vertexShader = `uniform float uTime;\n${shader.vertexShader}`.replace(
    "#include <begin_vertex>",
    `#include <begin_vertex>
     float ph = instanceMatrix[3][0] * 0.7 + instanceMatrix[3][2] * 0.9;
     transformed.x += sin(uTime * 1.05 + ph) * 0.032;
     transformed.z += cos(uTime * 0.87 + ph * 1.3) * 0.032;
    `,
  );
  crowdShader = shader;
};

const densityOf = (key) => spec.crowd.densities[key];
const seatSpacing = () => spec.crowd.seatSpacingM[posture];
const maxDensity = () => 1 / (seatSpacing() * spec.stands.rowDepthM);

let crowdMesh = null;
let crowdStats = { people: 0, capacity: 0, seats: 0 };

function buildCrowd() {
  if (crowdMesh) {
    scene.remove(crowdMesh);
    crowdMesh.geometry.dispose();
    crowdMesh.dispose();
    crowdMesh = null;
  }
  const spacing = seatSpacing();
  const occupancy = clamp(densityOf(densityKey) / maxDensity(), 0, 1);
  const placements = [];
  let seats = 0;
  let capacity = 0;

  for (const row of rows) {
    const tread = row.index % spec.stands.aisleEveryRows === spec.stands.aisleEveryRows - 1;
    const circumference = 2 * Math.PI * row.radius;
    const perRow = Math.floor(circumference / spacing);
    for (let j = 0; j < perRow; j += 1) {
      capacity += 1;
      if (tread) continue; // horizontal walkway
      if (spec.stands.aisleEverySeats > 0 && j % spec.stands.aisleEverySeats === 0) continue; // vertical aisle
      seats += 1;
      // Deterministic thinning so a sparse crowd looks like gaps, not a uniform haze.
      if (pseudo(row.index * 977 + j * 31) > occupancy) continue;
      const angle = (j / perRow) * Math.PI * 2;
      // Capacity is counted over the whole bowl; the instance cap only limits what is DRAWN, so a
      // capped run still reports the true capacity instead of a truncated one.
      if (placements.length < instanceCap) {
        placements.push({
          x: Math.sin(angle) * row.radius,
          z: Math.cos(angle) * row.radius,
          y: row.height,
          rot: angle,
          row: row.index,
        });
      }
    }
  }

  const geometry = figureGeo.clone();
  // stance: a seated crowd is shorter and slightly hunched
  if (posture === "seated") geometry.scale(1, 0.74, 1);

  const mesh = new THREE.InstancedMesh(geometry, crowdMaterial, placements.length);
  const dummy = new THREE.Object3D();
  const colour = new THREE.Color();
  for (const [i, p] of placements.entries()) {
    const scale = 0.92 + pseudo(i * 3.7) * 0.16;
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.set(0, p.rot + Math.PI, 0);
    dummy.scale.set(scale, scale * (posture === "seated" ? 0.99 : 1), scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    // colour conveys the overlay, so the crowd itself is the chart
    let hex = 0x59657a;
    if (overlay === "density") {
      const local = clamp(densityOf(densityKey) / maxDensity(), 0, 1);
      colour.setHSL(0.58 - local * 0.58, 0.72, 0.34 + local * 0.26);
      hex = null;
      mesh.setColorAt(i, colour);
    } else if (overlay === "sightline") {
      const c = cValues[p.row];
      const bad = failsSightline(c);
      colour.set(bad ? 0xff5a5a : 0x66d68a);
      colour.multiplyScalar(0.55 + pseudo(i * 1.3) * 0.2);
      hex = null;
      mesh.setColorAt(i, colour);
    } else if (overlay === "encircle") {
      colour.setHSL(0.09, 0.55, 0.28 + pseudo(i * 2.1) * 0.12);
      hex = null;
      mesh.setColorAt(i, colour);
    } else {
      colour.setHex(0x59657a).multiplyScalar(0.7 + pseudo(i * 2.9) * 0.5);
      hex = null;
      mesh.setColorAt(i, colour);
    }
    if (hex !== null) {
      colour.setHex(hex);
      mesh.setColorAt(i, colour);
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.frustumCulled = false;
  scene.add(mesh);
  crowdMesh = mesh;
  crowdStats = { people: placements.length, capacity, seats };
}

// ---------------------------------------------------------------- encirclement (from the stage)
function computeEncirclement() {
  if (!crowdMesh) return null;
  const d = new THREE.Matrix4();
  const bins = new Array(360).fill(false);
  let nearest = Number.POSITIVE_INFINITY;
  let topAngle = -Infinity;
  let bottomAngle = Infinity;
  const eyeY = 1.6;
  for (let i = 0; i < crowdStats.people; i += 1) {
    crowdMesh.getMatrixAt(i, d);
    const x = d.elements[12];
    const y = d.elements[13];
    const z = d.elements[14];
    const r = Math.hypot(x, z);
    const bearing = (Math.atan2(x, z) * 180) / Math.PI;
    bins[((Math.round(bearing) % 360) + 360) % 360] = true;
    // head top ≈ 1.56 m above the tread for a standing figure at unit scale
    const headY = y + 1.56;
    const angle = (Math.atan2(headY - eyeY, r) * 180) / Math.PI;
    topAngle = Math.max(topAngle, angle);
    bottomAngle = Math.min(bottomAngle, angle);
    nearest = Math.min(nearest, r);
  }
  const covered = bins.filter(Boolean).length;
  return {
    horizontalDeg: covered,
    percent: (covered / 360) * 100,
    nearestM: nearest,
    verticalFromDeg: bottomAngle,
    verticalToDeg: topAngle,
    verticalSpanDeg: topAngle - bottomAngle,
  };
}

// ---------------------------------------------------------------- cameras
const cameraList = spec.viewpoints.map((v) => {
  const camera = new THREE.PerspectiveCamera(v.fovDeg, aspectOf(innerWidth, innerHeight), 0.1, 900);
  camera.position.fromArray(v.positionM);
  camera.lookAt(new THREE.Vector3().fromArray(v.targetM));
  camera.name = v.id;
  return camera;
});
const cameraById = new Map(cameraList.map((c) => [c.name, c]));
const controls = new OrbitControls(cameraById.get(viewId), renderer.domElement);
controls.enableDamping = true;
controls.target.fromArray(spec.viewpoints.find((v) => v.id === viewId)?.targetM ?? [0, 0, 0]);

// ---------------------------------------------------------------- sightline overlay geometry
const aidGroup = new THREE.Group();
scene.add(aidGroup);
function rebuildAids() {
  aidGroup.clear();
  if (overlay !== "sightline") return;
  const { eyeHeightM: E, headHeightM: P } = human();
  // Draw the sightline for a representative mid-bowl row that fails, or the last row if all pass.
  let pick = rows.findIndex((_row, i) => i > 0 && failsSightline(cValues[i]));
  if (pick < 0) pick = rows.length - 1;
  const row = rows[pick];
  const prev = rows[pick - 1];
  if (!prev) return;
  const eye = new THREE.Vector3(0, row.height + E, row.radius);
  const head = new THREE.Vector3(0, prev.height + P, prev.radius);
  const focus = new THREE.Vector3(0, focusH, 0);
  const toFocus = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([eye, focus]),
    new THREE.LineBasicMaterial({ color: 0xffd479 }),
  );
  const toHead = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([eye, head]),
    new THREE.LineBasicMaterial({ color: 0xff5a5a }),
  );
  const ruler = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, prev.height + P, prev.radius),
      new THREE.Vector3(0, prev.height + P + Math.max(cValues[pick], 0), prev.radius),
    ]),
    new THREE.LineBasicMaterial({ color: 0x66d68a }),
  );
  aidGroup.add(toFocus, toHead, ruler);
}

// ---------------------------------------------------------------- UI
const overlayRow = document.getElementById("row-overlay");
const viewRow = document.getElementById("row-view");
const densityRow = document.getElementById("row-density");
const buttons = { overlay: new Map(), view: new Map(), density: new Map() };

for (const o of spec.overlays) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = o.label;
  b.addEventListener("click", () => {
    overlay = o.id;
    buildCrowd();
    rebuildAids();
    syncButtons();
  });
  overlayRow.appendChild(b);
  buttons.overlay.set(o.id, b);
}
for (const v of spec.viewpoints) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = v.label;
  b.title = v.note ?? "";
  b.addEventListener("click", () => setView(v.id));
  viewRow.appendChild(b);
  buttons.view.set(v.id, b);
}
for (const key of Object.keys(spec.crowd.densities)) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = `${key} ${spec.crowd.densities[key]}/m²`;
  b.addEventListener("click", () => {
    densityKey = key;
    buildCrowd();
    syncButtons();
  });
  densityRow.appendChild(b);
  buttons.density.set(key, b);
}

const rakeButton = document.createElement("button");
rakeButton.type = "button";
rakeButton.id = "btn-rake";
rakeButton.addEventListener("click", () => {
  rakeMode = rakeMode === "constant" ? "sightline" : "constant";
  rebuildStands();
});
document.querySelector(".hud .row:last-child").appendChild(rakeButton);

document.getElementById("btn-posture").addEventListener("click", (event) => {
  posture = posture === "standing" ? "seated" : "standing";
  event.currentTarget.textContent = posture === "standing" ? "站姿" : "坐姿";
  rebuildStands();
});

function setView(id) {
  viewId = id;
  const camera = cameraById.get(id) ?? cameraList[0];
  const controls2 = controls;
  controls2.object = camera;
  controls2.target.fromArray(spec.viewpoints.find((v) => v.id === id)?.targetM ?? [0, 0, 0]);
  syncButtons();
}

function syncButtons() {
  for (const [k, b] of buttons.overlay) b.setAttribute("aria-pressed", String(k === overlay));
  for (const [k, b] of buttons.view) b.setAttribute("aria-pressed", String(k === viewId));
  for (const [k, b] of buttons.density) b.setAttribute("aria-pressed", String(k === densityKey));
  rakeButton.setAttribute("aria-pressed", String(rakeMode === "sightline"));
  rakeButton.textContent =
    rakeMode === "constant"
      ? `等升阶 ${spec.stands.riserM}m（看后排失效）`
      : `按 C 值解算升阶（保持 ${(targetC * 1000).toFixed(0)}mm）`;
}

function rebuildStands() {
  scene.remove(bowl);
  bowl.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
  });
  rows = buildRows();
  cValues = computeCValues(rows);
  bowl = buildBowl();
  scene.add(bowl);
  buildCrowd();
  rebuildAids();
  syncButtons();
  drawChart();
  updateHud();
}

// ---------------------------------------------------------------- chart
const chart = document.getElementById("chart");
const chartNote = document.getElementById("chart-note");
const SVGNS = "http://www.w3.org/2000/svg";
function svg(name, attrs) {
  const node = document.createElementNS(SVGNS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

function drawChart() {
  const W = 1000;
  const H = 92;
  const pad = { l: 34, r: 8, t: 8, b: 14 };
  const values = cValues.map((c) => (c === null ? 0 : c * 1000));
  const lo = Math.min(-40, ...values);
  const hi = Math.max(120, ...values);
  const x = (i) => pad.l + (i / Math.max(rows.length - 1, 1)) * (W - pad.l - pad.r);
  const y = (mm) => H - pad.b - ((mm - lo) / (hi - lo)) * (H - pad.t - pad.b);
  chart.replaceChildren();
  chart.appendChild(
    svg("line", {
      x1: pad.l,
      y1: y(0),
      x2: W - pad.r,
      y2: y(0),
      stroke: "#3a4454",
      "stroke-width": 1,
    }),
  );
  chart.appendChild(
    svg("line", {
      x1: pad.l,
      y1: y(60),
      x2: W - pad.r,
      y2: y(60),
      stroke: "#f0c98a",
      "stroke-width": 1,
      "stroke-dasharray": "4 3",
    }),
  );
  chart.appendChild(
    svg("text", {
      x: 2,
      y: y(60) + 3,
      fill: "#f0c98a",
      "font-size": 9,
      "font-family": "monospace",
    }),
  ).textContent = "60";
  chart.appendChild(
    svg("text", { x: 2, y: y(0) + 3, fill: "#5c6675", "font-size": 9, "font-family": "monospace" }),
  ).textContent = "0";
  const bw = Math.max((W - pad.l - pad.r) / rows.length - 1.2, 1.2);
  for (let i = 0; i < rows.length; i += 1) {
    const c = cValues[i];
    if (c === null) continue;
    const mm = c * 1000;
    const bad = failsSightline(c);
    const top = Math.min(y(mm), y(0));
    const h = Math.max(Math.abs(y(mm) - y(0)), 1);
    chart.appendChild(
      svg("rect", {
        x: x(i) - bw / 2,
        y: top,
        width: bw,
        height: h,
        fill: bad ? "#ff5a5a" : "#66d68a",
        opacity: 0.9,
      }),
    );
  }
  const failIndex = cValues.findIndex((c, i) => i > 0 && failsSightline(c));
  chartNote.textContent =
    failIndex > 0
      ? `首次低于判据在第 ${failIndex + 1} 排（C=${(cValues[failIndex] * 1000).toFixed(0)}mm）`
      : "全部排满足判据";
}

// ---------------------------------------------------------------- HUD
const probe = document.createElement("div");
probe.id = "probe";
probe.style.display = "none";
document.body.appendChild(probe);

function updateHud() {
  const density = densityOf(densityKey);
  const enc = computeEncirclement();
  const minC = Math.min(...cValues.filter((c) => c !== null));
  const failIndex = cValues.findIndex((c, i) => i > 0 && failsSightline(c));
  document.getElementById("m-people").textContent =
    `${crowdStats.people.toLocaleString()} / 容量 ${crowdStats.capacity.toLocaleString()}`;
  document.getElementById("m-density").textContent =
    `${density} 人/m²（满座 ${maxDensity().toFixed(2)}）`;
  document.getElementById("m-rows").textContent =
    `${rows.length} 排 · ${posture === "standing" ? "站姿" : "坐姿"} · ${rakeMode === "constant" ? "等升阶" : "解算升阶"}`;
  const cminEl = document.getElementById("m-cmin");
  cminEl.textContent = `最小 ${(minC * 1000).toFixed(0)}mm`;
  cminEl.className = minC >= targetC ? "good" : "warn";
  const failEl = document.getElementById("m-fail");
  failEl.textContent =
    failIndex > 0 ? `第 ${failIndex + 1} 排（${(cValues[failIndex] * 1000).toFixed(0)}mm）` : "无";
  failEl.className = failIndex > 0 ? "warn" : "good";
  const encEl = document.getElementById("m-encircle");
  encEl.textContent = enc
    ? `水平 ${enc.percent.toFixed(0)}% · 垂直 ${enc.verticalFromDeg.toFixed(1)}°→${enc.verticalToDeg.toFixed(1)}° · 最近 ${enc.nearestM.toFixed(1)}m`
    : "—";
  document.getElementById("m-view").textContent = viewId;

  if (params.get("probe") === "1") {
    probe.textContent = JSON.stringify({
      people: crowdStats.people,
      capacity: crowdStats.capacity,
      densityPerM2: density,
      maxDensityPerM2: maxDensity(),
      posture,
      rakeMode,
      rows: rows.length,
      minCMm: minC * 1000,
      firstFailRow: failIndex > 0 ? failIndex + 1 : null,
      firstFailCMm: failIndex > 0 ? cValues[failIndex] * 1000 : null,
      encirclement: enc,
      overlay,
      view: viewId,
    });
  }
}

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
let hudTick = 0;
renderer.setAnimationLoop(() => {
  const t = clock.getElapsedTime();
  if (crowdShader) crowdShader.uniforms.uTime.value = t;
  controls.update();
  renderer.render(scene, controls.object);
  hudTick += 1;
  if (hudTick % 12 === 0) updateHud();
});

addEventListener("resize", () => {
  const aspect = aspectOf(innerWidth, innerHeight);
  for (const camera of cameraList) {
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }
  renderer.setSize(innerWidth, innerHeight);
});

addEventListener("keydown", (event) => {
  const index = Number.parseInt(event.key, 10);
  if (index >= 1 && index <= spec.viewpoints.length) setView(spec.viewpoints[index - 1].id);
});

buildCrowd();
rebuildAids();
syncButtons();
rebuildStands();

window.__CROWD__ = {
  state: () => JSON.parse(probe.textContent || "{}"),
  setOverlay: (id) => {
    overlay = id;
    buildCrowd();
    rebuildAids();
    syncButtons();
    updateHud();
  },
  setDensity: (key) => {
    densityKey = key;
    buildCrowd();
    syncButtons();
    updateHud();
  },
  setRake: (mode) => {
    rakeMode = mode;
    rebuildStands();
  },
  setView,
};
