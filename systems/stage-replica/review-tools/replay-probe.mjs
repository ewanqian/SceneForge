// CDP probe for the Multi-angle Replay module.
//
// Why this exists: `chrome --headless --virtual-time-budget` does not advance media clocks, so a
// video's currentTime stays 0 no matter what the page does. Probing playback that way produces a
// false failure. This drives a real browser over CDP, waits in real time, then reads the page's own
// `#probe` payload (written by main.js when `?probe=1`) so the numbers come from the page itself.
//
// Usage: node replay-probe.cjs <url> <waitSeconds>

const url = process.argv[2];
const waitSeconds = Number.parseFloat(process.argv[3] ?? "5");

if (!url) {
  console.error("usage: node replay-probe.cjs <url> [waitSeconds]");
  process.exit(2);
}

const endpoint = await (async () => {
  const response = await fetch("http://127.0.0.1:9222/json/list");
  const targets = await response.json();
  const page = targets.find((target) => target.type === "page");
  if (!page) throw new Error("no page target on 127.0.0.1:9222");
  return page.webSocketDebuggerUrl;
})();

const socket = new WebSocket(endpoint);
let nextId = 1;
const pending = new Map();

const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.method === "Runtime.exceptionThrown") {
    const d = message.params.exceptionDetails;
    console.error(
      `[page exception] ${d.exception?.description ?? d.text} @ ${d.url ?? "?"}:${d.lineNumber ?? "?"}`,
    );
  }
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
    console.error(
      `[console.error] ${message.params.args.map((a) => a.value ?? a.description).join(" ")}`,
    );
  }
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolve(message.result);
  }
});

await new Promise((resolve) => socket.addEventListener("open", resolve));

await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await sleep(2500); // let the page load clips and metadata

await send("Runtime.evaluate", { expression: "window.__REPLAY__ && 1" });
await sleep(waitSeconds * 1000);

const { result } = await send("Runtime.evaluate", {
  expression: "document.getElementById('probe')?.textContent || 'NO_PROBE'",
  returnByValue: true,
});

const payload = result.value;
if (payload === "NO_PROBE" || !payload) {
  const diag = await send("Runtime.evaluate", {
    expression:
      "JSON.stringify({title:document.title,href:location.href,videos:document.querySelectorAll('video').length,hasReplay:typeof window.__REPLAY__,probeExists:!!document.getElementById('probe'),tiles:document.querySelectorAll('.tile').length})",
    returnByValue: true,
  });
  console.error(`probe empty. diagnostics: ${diag.result.value}`);
  socket.close();
  process.exit(1);
}

const state = JSON.parse(payload);
console.log(`master=${state.masterTime}s  mode=${state.mode}  program=${state.program}`);
console.log(`maxDrift=${state.maxDrift}s`);

// Optional third argument: any expression evaluated in the page after the probe is read. Used to
// inspect element-level facts (buffered ranges, seeking) without touching the module itself.
const extra = process.argv[4];
if (extra) {
  const out = await send("Runtime.evaluate", { expression: extra, returnByValue: true });
  console.log(`extra: ${JSON.stringify(out.result.value)}`);
}
for (const camera of state.cameras) {
  const expected = camera.expected === null ? "not-yet-started" : camera.expected.toFixed(3);
  const diff =
    camera.expected === null ? "n/a" : Math.abs(camera.currentTime - camera.expected).toFixed(3);
  const extra =
    camera.readyState === undefined
      ? ""
      : `  readyState=${camera.readyState} net=${camera.networkState} dur=${camera.durationSec} err=${camera.mediaError}`;
  console.log(
    `  ${camera.id}: offset=${String(camera.offsetSec).padStart(4)}  current=${camera.currentTime.toFixed(3).padStart(7)}  expected=${String(expected).padStart(15)}  diff=${diff}${extra}`,
  );
}

// A pass means every started recording is within a fifth of a second of its expected position
// while the master clock is running.
const failures = state.cameras.filter(
  (camera) => camera.expected !== null && Math.abs(camera.currentTime - camera.expected) > 0.2,
);
if (failures.length > 0) {
  console.error(`FAIL: ${failures.length} camera(s) out of sync while playing`);
  socket.close();
  process.exit(1);
}
console.log("PASS: all started recordings are in sync during playback");
socket.close();
