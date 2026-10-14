// Buttons + drop probe: click through camera presets and toggle the drop control on the live page.
const http = require("http");
const { spawn } = require("child_process");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9335;
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
      "--user-data-dir=" + process.env.TEMP + "\\cdp-probe-profile3",
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
    await sleep(6000);
    const evalExpr = async (e) => {
      const r = await send("Runtime.evaluate", { expression: e, returnByValue: true });
      return r.result.result.value;
    };
    // click camera buttons by their text prefix 1..4
    for (const n of ["1", "2", "3", "4"]) {
      await evalExpr(
        `[...document.querySelectorAll('#row-cam button')].find(b=>b.textContent.startsWith('${n}·')).click(); 'ok'`,
      );
      await sleep(600);
      const s = await evalExpr(
        `JSON.stringify({ cam: document.getElementById('hud-cam').textContent, fit: document.getElementById('hud-fit').textContent, mode: document.getElementById('hud-mode').textContent })`,
      );
      console.log("cam", n, s);
    }
    for (const label of ["镜像延展", "程序化补全", "1:1 母版", "前区窗口"]) {
      await evalExpr(
        `[...document.querySelectorAll('#row-mode button')].find(b=>b.textContent==='${label}').click(); 'ok'`,
      );
      await sleep(600);
      const s = await evalExpr(
        `JSON.stringify({ mode: document.getElementById('hud-mode').textContent, cam: document.getElementById('hud-cam').textContent })`,
      );
      console.log("mode", label, s);
    }
    const before = await evalExpr(`document.getElementById('hud-stream').textContent`);
    await evalExpr(`document.getElementById('btn-drop').click(); 'ok'`);
    for (let i = 0; i < 6; i++) {
      await sleep(700);
      console.log(
        "t+" + (i + 1) * 0.7 + "s stream=",
        await evalExpr(`document.getElementById('hud-stream').textContent`),
      );
    }
    console.log("stream before drop =", before);
    ws.close();
  } finally {
    child.kill();
  }
  process.exit(0);
})().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
