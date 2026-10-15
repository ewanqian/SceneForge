// Stage Replica — Multi-angle Replay (V0, manual sync).
//
// The idea borrowed from multi-angle fancam archives: a camera does not have to be a virtual one.
// It can be a recording. As long as every recording is placed on ONE master timeline, you can move
// between "the stage as a space" and "the performance as it was actually recorded".
//
// V0 deliberately does no automatic synchronisation. Each source records only
// `url + timeOffset + camera`. Confidence is displayed rather than implied, so nobody mistakes
// manual offsets for audio-fingerprint results.
//
// Deterministic review entry points:
//   ?t=<seconds>            master timeline position
//   ?cam=<CAM_ID>           which camera is the program
//   ?mode=director|free     DIRECTOR PROGRAM or FREE VIEW
//   ?probe=1                write machine-readable state into the DOM for headless verification

const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

const params = new URLSearchParams(location.search);
const session = await (await fetch("./session.json")).json();

const freeGrid = document.getElementById("freegrid");
const radar = document.getElementById("radar");
const camsRoot = document.getElementById("cams");
const scrub = document.getElementById("scrub");
const readout = document.getElementById("t-readout");
const probe = document.createElement("div");
probe.id = "probe";
probe.style.display = "none";
document.body.appendChild(probe);

// ---------------------------------------------------------------- cameras as recordings
/** @type {Array<{id:string,label:string,src:string,offsetSec:number,positionM:number[],fovDeg:number,confidence:number,video:HTMLVideoElement,tile:HTMLElement,local:HTMLElement,imported:boolean}>} */
const cameras = session.cameras.map((spec) => addCamera(spec));

function addCamera(spec) {
  const tile = document.createElement("div");
  tile.className = "tile";
  tile.dataset.camera = spec.id;

  const video = document.createElement("video");
  video.src = spec.src;
  video.playsInline = true;
  video.muted = true;
  video.preload = "auto";
  tile.appendChild(video);

  const tag = document.createElement("div");
  tag.className = "tag";
  tag.textContent = spec.label;
  tile.appendChild(tag);

  const local = document.createElement("div");
  local.className = "local";
  local.textContent = "0.00s";
  tile.appendChild(local);

  freeGrid.appendChild(tile);
  return { ...spec, video, tile, tag, local, imported: Boolean(spec.imported) };
}

let masterDuration = session.masterDurationSec;
let masterTime = clamp(Number.parseFloat(params.get("t") ?? "0") || 0, 0, masterDuration);
let playing = false;
let programId = session.cameras.some((c) => c.id === params.get("cam"))
  ? params.get("cam")
  : session.defaultCamera;
let mode = params.get("mode") === "free" ? "free" : "director";

const expectedLocal = (camera, master) => {
  const start = camera.offsetSec;
  const end = camera.offsetSec + (camera.durationSec || masterDuration);
  if (master < start) return null; // this recording had not started yet
  if (master > end) return camera.durationSec || masterDuration; // it already ended
  return master - start;
};

// `video.duration` is NaN until metadata loads. Clamping against NaN yields NaN, and assigning
// NaN to currentTime throws — which a try/catch then swallows, leaving the video stuck at 0 with
// no retry. That race is why an early version of this module could load correctly or not at all
// depending on timing, so duration always resolves to a finite number here.
const durationOf = (camera) => {
  const live = camera.video.duration;
  if (Number.isFinite(live) && live > 0) return live;
  const cached = camera.durationSec;
  if (Number.isFinite(cached) && cached > 0) return cached;
  return masterDuration;
};

// ---------------------------------------------------------------- master timeline
function seek(masterSeconds) {
  masterTime = clamp(masterSeconds, 0, masterDuration);
  syncVideos(true);
  render();
}

function syncVideos(force) {
  for (const camera of cameras) {
    const want = expectedLocal(camera, masterTime);
    const duration = durationOf(camera);
    if (want === null) {
      camera.video.pause();
      if (camera.video.currentTime !== 0) camera.video.currentTime = 0;
      continue;
    }
    const target = clamp(want, 0, Math.max(duration - 0.05, 0));
    // Only correct when the drift is visible; otherwise let the element play natively so playback
    // stays smooth. This is the whole of V0's "sync" - it is drift correction, not alignment.
    // `seeking` matters: re-issuing currentTime while a seek is still in flight restarts it, so on
    // a slow first load the clip would never arrive. Wait for the pending seek to settle instead.
    if ((force || Math.abs(camera.video.currentTime - target) > 0.12) && !camera.video.seeking) {
      try {
        camera.video.currentTime = target;
      } catch {
        /* not seekable yet; the next frame retries */
      }
    }
    if (playing && camera.video.paused) camera.video.play().catch(() => {});
    if (!playing && !camera.video.paused) camera.video.pause();
  }
}

// ---------------------------------------------------------------- radar (plan view)
function buildRadar() {
  const plan = session.plan;
  const r = plan.arenaDiameterM / 2;
  const svgNS = "http://www.w3.org/2000/svg";
  const el = (name, attrs) => {
    const node = document.createElementNS(svgNS, name);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
  };
  radar.replaceChildren();
  radar.appendChild(el("circle", { cx: 0, cy: 0, r, fill: "#0d1117", stroke: "#2b3646" }));
  radar.appendChild(
    el("circle", {
      cx: 0,
      cy: 0,
      r: plan.stageDiameterM / 2,
      fill: "#1b212b",
      stroke: "#55657c",
    }),
  );
  radar.appendChild(
    el("circle", {
      cx: 0,
      cy: 0,
      r: plan.cylinderDiameterM / 2,
      fill: "none",
      stroke: "#6ea8ff",
      "stroke-dasharray": "2 2",
    }),
  );
  // audience-side arrow so the plan is oriented like the venue
  radar.appendChild(el("line", { x1: 0, y1: 0, x2: 0, y2: r * 0.92, stroke: "#2b3646" }));
}

function renderRadar() {
  for (const camera of cameras) {
    const [x, , z] = camera.positionM;
    // top-down: +x right, +z down
    const node = radar.querySelector(`[data-cam="${camera.id}"]`);
    const cx = x;
    const cy = z;
    if (node) {
      node.setAttribute("cx", String(cx));
      node.setAttribute("cy", String(cy));
    } else {
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group.dataset.cam = camera.id;
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("data-cam", camera.id);
      dot.setAttribute("cx", String(cx));
      dot.setAttribute("cy", String(cy));
      dot.setAttribute("r", "3.2");
      dot.setAttribute("fill", "#7cc4ff");
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("data-cam", camera.id);
      label.setAttribute("x", String(cx + 4.5));
      label.setAttribute("y", String(cy - 3));
      label.setAttribute("font-size", "5");
      label.setAttribute("fill", "#cfe0f5");
      label.textContent = camera.label;
      radar.appendChild(group);
      radar.appendChild(dot);
      radar.appendChild(label);
    }
  }
}

function renderCameraList() {
  camsRoot.replaceChildren();
  for (const [index, camera] of cameras.entries()) {
    const row = document.createElement("div");
    row.className = "camrow";
    row.dataset.active = String(camera.id === programId);

    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = camera.id === programId ? "#f3f5f7" : "#7cc4ff";

    const name = document.createElement("button");
    name.type = "button";
    name.style.cssText = "all:unset;cursor:pointer;font-size:11px";
    name.textContent = `${index + 1}·${camera.label}${camera.imported ? "（导入）" : ""}`;
    name.addEventListener("click", () => setProgram(camera.id));

    const offWrap = document.createElement("span");
    offWrap.className = "off";
    const off = document.createElement("input");
    off.type = "number";
    off.step = "0.1";
    off.value = String(camera.offsetSec);
    off.title = "这条素材的 timeOffset（秒）：它的第 0 秒等于 master 的第几秒";
    off.style.cssText =
      "width:52px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.16);color:#f4f6f8;border-radius:5px;font:600 10px ui-monospace,monospace;padding:2px 3px";
    off.addEventListener("change", () => {
      camera.offsetSec = Number.parseFloat(off.value) || 0;
      recomputeDuration();
      seek(masterTime);
    });
    offWrap.append(off, " s");

    row.append(dot, name, offWrap);
    camsRoot.appendChild(row);
  }
}

function recomputeDuration() {
  masterDuration = Math.max(
    session.masterDurationSec,
    ...cameras.map((c) => c.offsetSec + (c.durationSec || 0)),
  );
  scrub.max = String(masterDuration);
}

// ---------------------------------------------------------------- UI wiring
function setProgram(id) {
  programId = id;
  for (const camera of cameras) camera.tile.classList.toggle("active", camera.id === id);
  render();
}

function setMode(next) {
  mode = next;
  freeGrid.classList.toggle("director", mode === "director");
  document.getElementById("btn-mode").textContent =
    mode === "director" ? "DIRECTOR PROGRAM" : "FREE VIEW";
  document.getElementById("btn-mode").setAttribute("aria-pressed", mode === "free");
  render();
}

function setPlaying(next) {
  playing = next;
  document.getElementById("btn-play").textContent = playing ? "⏸ 暂停" : "▶ 播放";
  syncVideos(false);
}

document.getElementById("btn-play").addEventListener("click", () => setPlaying(!playing));
document
  .getElementById("btn-mode")
  .addEventListener("click", () => setMode(mode === "director" ? "free" : "director"));
scrub.addEventListener("input", () => {
  setPlaying(false);
  seek(Number.parseFloat(scrub.value));
});
document.getElementById("btn-back").addEventListener("click", () => seek(masterTime - 1));
document.getElementById("btn-fwd").addEventListener("click", () => seek(masterTime + 1));

document.getElementById("file").addEventListener("change", (event) => {
  for (const file of event.target.files ?? []) {
    const spec = {
      id: `IMPORT_${cameras.length + 1}`,
      label: file.name.replace(/\.[^.]+$/, "").slice(0, 22),
      src: URL.createObjectURL(file),
      offsetSec: 0,
      positionM: [0, 1.6, 30],
      fovDeg: 60,
      confidence: 0,
      imported: true,
    };
    cameras.push(addCamera(spec));
  }
  recomputeDuration();
  renderCameraList();
  renderRadar();
  seek(masterTime);
});

addEventListener("keydown", (event) => {
  if (event.key >= "1" && event.key <= "9") {
    const camera = cameras[Number.parseInt(event.key, 10) - 1];
    if (camera) setProgram(camera.id);
  } else if (event.key === " ") {
    event.preventDefault();
    setPlaying(!playing);
  } else if (event.key === "f") {
    setMode(mode === "director" ? "free" : "director");
  }
});

// ---------------------------------------------------------------- render loop
function drift() {
  let worst = 0;
  for (const camera of cameras) {
    const want = expectedLocal(camera, masterTime);
    if (want === null) continue;
    worst = Math.max(worst, Math.abs(camera.video.currentTime - want));
  }
  return worst;
}

function render() {
  scrub.value = String(masterTime);
  readout.textContent = `${masterTime.toFixed(2)} / ${masterDuration.toFixed(2)}s`;
  const active = cameras.find((c) => c.id === programId) ?? cameras[0];
  const activeWant = active ? expectedLocal(active, masterTime) : null;

  document.getElementById("m-time").textContent = `${masterTime.toFixed(2)}s`;
  document.getElementById("m-off").textContent = active
    ? `${active.label} · +${active.offsetSec.toFixed(1)}s`
    : "—";
  document.getElementById("m-local").textContent =
    activeWant === null ? "尚未开始（master 早于它的 offset）" : `${activeWant.toFixed(2)}s`;
  const d = drift();
  // A clip that has not buffered past metadata cannot complete a seek. Saying "OK" in that state
  // would be a lie about a frame the viewer can see, so it is reported as buffering instead.
  const buffering = cameras.some(
    (camera) => expectedLocal(camera, masterTime) !== null && camera.video.readyState < 2,
  );
  const syncEl = document.getElementById("m-sync");
  if (buffering) {
    syncEl.textContent = "缓冲中…（素材未就绪，尚未定位）";
    syncEl.className = "bad";
  } else {
    syncEl.textContent = d < 0.15 ? `OK（最大偏差 ${d.toFixed(3)}s）` : `偏差 ${d.toFixed(3)}s`;
    syncEl.className = d < 0.15 ? "ok" : "bad";
  }
  document.getElementById("m-conf").textContent = active
    ? `${active.confidence.toFixed(2)}（手工 offset，非自动同步）`
    : "—";

  for (const camera of cameras) {
    const want = expectedLocal(camera, masterTime);
    camera.local.textContent = want === null ? "未开始" : `${camera.video.currentTime.toFixed(2)}s`;
    camera.tag.classList.toggle("hot", camera.id === programId);
    camera.tile.dataset.active = String(camera.id === programId);
  }

  for (const camera of cameras) {
    const node = radar.querySelector(`circle[data-cam="${camera.id}"]`);
    if (node) node.setAttribute("fill", camera.id === programId ? "#f3f5f7" : "#7cc4ff");
    const row = camsRoot.children[cameras.indexOf(camera)];
    if (row) row.dataset.active = String(camera.id === programId);
  }

  if (params.get("probe") === "1") {
    probe.textContent = JSON.stringify({
      masterTime: Number(masterTime.toFixed(3)),
      mode,
      program: programId,
      masterDuration,
      maxDrift: Number(d.toFixed(3)),
      cameras: cameras.map((c) => ({
        id: c.id,
        offsetSec: c.offsetSec,
        currentTime: Number(c.video.currentTime.toFixed(3)),
        expected: expectedLocal(c, masterTime),
        durationSec: Number((c.video.duration || 0).toFixed(2)),
        readyState: c.video.readyState,
        networkState: c.video.networkState,
        mediaError: c.video.error ? c.video.error.code : null,
      })),
    });
  }
}

let last = performance.now();
function loop(now) {
  const delta = (now - last) / 1000;
  last = now;
  if (playing) {
    masterTime = clamp(masterTime + delta, 0, masterDuration);
    if (masterTime >= masterDuration) setPlaying(false);
  }
  // Reconcile every frame, not only while playing. A seek issued before the clip's metadata
  // exists is silently rejected by the element, and there is no guarantee about when
  // loadedmetadata arrives relative to that first seek - so retrying here is what makes the
  // module self-healing instead of timing-dependent.
  syncVideos(false);
  render();
  requestAnimationFrame(loop);
}

for (const camera of cameras) {
  camera.video.addEventListener("loadedmetadata", () => {
    camera.durationSec = camera.video.duration;
    recomputeDuration();
    // re-apply the seek that was computed before metadata existed
    syncVideos(true);
  });
}

recomputeDuration();
renderCameraList();
buildRadar();
renderRadar();
setMode(mode);
setProgram(programId);
seek(masterTime);
if (params.get("play") === "1") setPlaying(true);
requestAnimationFrame(loop);

document.getElementById("note").textContent = session.syncPolicy.note;
window.__REPLAY__ = {
  seek,
  play: () => setPlaying(true),
  pause: () => setPlaying(false),
  setProgram,
  setMode,
  state: () =>
    JSON.parse(
      JSON.stringify({
        masterTime,
        mode,
        program: programId,
        masterDuration,
        maxDrift: drift(),
        cameras: cameras.map((c) => ({
          id: c.id,
          offsetSec: c.offsetSec,
          currentTime: c.video.currentTime,
          expected: expectedLocal(c, masterTime),
        })),
      }),
    ),
};
