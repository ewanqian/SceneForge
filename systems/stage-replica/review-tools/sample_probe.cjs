// Deep probe: expose the module-level evaluateCue by rewriting the page's module source
// in-flight is not possible, so instead we sample the *rendered* result indirectly:
// read the HUD every 100ms for 3s and report distinct values.
const http = require("http");
const { spawn } = require("child_process");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9334;
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
      "--user-data-dir=" + process.env.TEMP + "\\cdp-probe-profile2",
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
      } catch {}
    }
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
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) {
        pending.get(m.id)(m);
        pending.delete(m.id);
      }
    });
    await new Promise((res) => ws.addEventListener("open", res));
    await send("Runtime.enable");
    await send("Page.enable");
    await sleep(7000);
    const expr = `window.__SAMPLES__ = []; window.__T0__ = performance.now();
      window.__TIMER__ = setInterval(() => {
        const d = document.getElementById('hud-fit');
        window.__SAMPLES__.push([Math.round(performance.now() - window.__T0__), d ? d.textContent : '?']);
      }, 120); 'armed'`;
    await send("Runtime.evaluate", { expression: expr, returnByValue: true });
    await sleep(3000);
    const r = await send("Runtime.evaluate", {
      expression: `JSON.stringify({ samples: window.__SAMPLES__ })`,
      returnByValue: true,
    });
    const out = JSON.parse(r.result.result.value);
    const seen = new Map();
    for (const [t, txt] of out.samples) {
      if (!seen.has(txt)) seen.set(txt, t);
    }
    console.log("URL", url);
    console.log("distinct FIT values over 3s (ms -> text):");
    for (const [txt, t] of seen) console.log("  ", t, txt);
    ws.close();
  } finally {
    child.kill();
  }
  process.exit(0);
})().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
