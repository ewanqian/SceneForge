// CDP probe: read the live page's own state + the dome uniforms at a given URL.
const http = require("http");
const { spawn } = require("child_process");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9333;
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
      "--user-data-dir=" + process.env.TEMP + "\\cdp-probe-profile",
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  try {
    let version = null;
    for (let i = 0; i < 40 && !version; i++) {
      await sleep(250);
      try {
        version = await get("/json/version");
      } catch {
        /* retry */
      }
    }
    if (!version) throw new Error("chrome devtools never came up");
    const target = await get("/json/new?" + encodeURIComponent(url), "PUT");
    const ws = new globalThis.WebSocket(target.webSocketDebuggerUrl);
    let id = 0;
    const pending = new Map();
    const send = (method, params) =>
      new Promise((res) => {
        const mid = ++id;
        pending.set(mid, res);
        ws.send(JSON.stringify({ id: mid, method, params }));
      });
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    });
    await new Promise((res) => ws.addEventListener("open", res));
    await send("Page.enable");
    await sleep(9000);
    const expr = `JSON.stringify({
      state: window.__STAGE_REPLICA__ ? window.__STAGE_REPLICA__.state() : null,
      uniforms: (() => {
        let u = null;
        const walk = (o) => { if (!o) return; if (o.uniforms && o.uniforms.uElevMax) { u = o; return; }
          (o.children || []).forEach(walk); };
        walk(window.__STAGE_REPLICA__ && window.__STAGE_REPLICA__.scene);
        if (!u) return null;
        const g = u.uniforms;
        return { uElevMax: g.uElevMax.value, uAzMax: g.uAzMax.value, uBright: g.uBright.value,
                 uDensity: g.uDensity.value, uAperture: g.uAperture.value, uFeed: g.uFeed.value,
                 uMode: g.uMode.value, uTime: g.uTime.value,
                 fitLo: g.uFitLo.value.toArray(), fitHi: g.uFitHi.value.toArray() };
      })(),
      hud: { state: document.getElementById('hud-state').textContent,
             cue: document.getElementById('hud-cue').textContent,
             mode: document.getElementById('hud-mode').textContent,
             fit: document.getElementById('hud-fit').textContent,
             stream: document.getElementById('hud-stream').textContent },
      perf: performance.now()
    })`;
    const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
    console.log("URL", url);
    console.log(JSON.stringify(JSON.parse(r.result.result.value), null, 2));
    ws.close();
  } finally {
    child.kill();
  }
  process.exit(0);
})().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
