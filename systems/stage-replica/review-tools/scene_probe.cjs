// Verify the live camera/projection parameters directly through CDP.
const http = require("http");
const { spawn } = require("child_process");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9336;
const url = process.argv[2];
function get(path, method) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: "127.0.0.1", port: PORT, path, method: method || "GET" },
      (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => resolve(JSON.parse(d)));
      },
    );
    req.on("error", reject);
    req.end();
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const child = spawn(
    CHROME,
    [
      `--remote-debugging-port=${PORT}`,
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--user-data-dir=" + process.env.TEMP + "\\cdp-probe-profile4",
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  try {
    let v = null;
    for (let i = 0; i < 40 && !v; i++) {
      await sleep(250);
      try {
        v = await get("/json/version");
      } catch {}
    }
    const target = await get("/json/new?" + encodeURIComponent(url), "PUT");
    const ws = new globalThis.WebSocket(target.webSocketDebuggerUrl);
    let id = 0;
    const pending = new Map();
    const send = (m, p) =>
      new Promise((res) => {
        const mid = ++id;
        pending.set(mid, res);
        ws.send(JSON.stringify({ id: mid, method: m, params: p }));
      });
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    });
    await new Promise((res) => ws.addEventListener("open", res));
    await send("Runtime.enable");
    await sleep(7000);
    const expr = `JSON.stringify((() => {
      const r = window.__STAGE_REPLICA__;
      const s = r && r.scene;
      if (!s || !s.children) return 'no THREE scene: ' + Object.keys(r || {}).join(',') + ' scene type=' + typeof s;
      return {
        renderer: { size: [document.querySelector('canvas').clientWidth, document.querySelector('canvas').clientHeight],
                    dpr: window.devicePixelRatio },
        cameras: s.children.filter(o => o.isCamera).map(c => ({ name: c.name, fov: c.fov, aspect: c.aspect,
          pos: c.position.toArray() })),
        dome: (() => { const d = s.children.find(o => o.material && o.material.uniforms && o.material.uniforms.uElevMax);
          return d ? { geo: d.geometry.type, p: d.geometry.parameters,
            u: { uElevMax: d.material.uniforms.uElevMax.value, uAzMax: d.material.uniforms.uAzMax.value,
                 uTime: d.material.uniforms.uTime.value, uDensity: d.material.uniforms.uDensity.value,
                 uBright: d.material.uniforms.uBright.value, uAperture: d.material.uniforms.uAperture.value,
                 uFeed: d.material.uniforms.uFeed.value, uMode: d.material.uniforms.uMode.value } } : null; })(),
        meshes: s.children.filter(o => o.isMesh).map(m => ({ geo: m.geometry.type, params: m.geometry.parameters,
          pos: m.position.toArray(), col: m.material && m.material.color && m.material.color.getHexString() }))
      };
    })())`;
    const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
    console.log(r.result.result.value || JSON.stringify(r.result));
    ws.close();
  } finally {
    child.kill();
  }
  process.exit(0);
})().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
