// Stage Replica — P0.5 conformance run.
//
// Loads the four official demos' legacy manifests, adapts each into the unified schema, validates
// it, and reports what was mapped, what was carried into `behaviour.params`, and what would be
// lost. Then it repeats the run with `variant: "v1"` — the raster values the demos actually shipped
// before their independent reviews caught them — because a validation rule that cannot fail on
// known-bad input is decoration, not a rule.

import { adaptLegacy, LEGACY_DEMOS } from "../shared/legacy-adapters.js";
import { describeScene, validateScene } from "../shared/scene-schema.js";

const params = new URLSearchParams(location.search);
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

async function loadLegacy(demo) {
  // Each demo's manifest is also moved around by the authoring work, so a failure here must be
  // reported per demo rather than aborting the whole run.
  const response = await fetch(`../${demo}/scene.json`, { cache: "no-cache" });
  if (!response.ok) throw new Error(`${demo}: HTTP ${response.status}`);
  return response.json();
}

function runVariant(raw, demo, variant) {
  const { scene, report } = adaptLegacy(raw, demo, { variant });
  const result = validateScene(scene);
  return { scene, report, result, summary: describeScene(scene) };
}

function renderDemoCard(demo, current, v1) {
  const card = el("div", "card");
  const head = el("h2");
  head.append(el("span", null, demo));
  head.append(
    el(
      "span",
      current.result.ok ? "pill good" : "pill bad",
      current.result.ok ? "current 通过" : "current 有错",
    ),
  );
  head.append(
    el(
      "span",
      v1.result.ok ? "pill good" : "pill bad",
      v1.result.ok ? "v1 也通过" : "v1 报错（预期）",
    ),
  );
  head.append(el("span", "pill", `behaviour: ${current.scene.behaviour.module}`));
  card.append(head);

  const facts = el("table");
  const factRow = (label, value) => {
    const tr = el("tr");
    tr.append(el("th", null, label), el("td", null, value));
    facts.append(tr);
  };
  factRow(
    "场景",
    `${current.scene.sceneId} · ${current.scene.cue.durationSec}s · program ${current.scene.programCamera}`,
  );
  factRow(
    "媒体面",
    current.scene.surfaces
      .map(
        (s) =>
          `${s.id} (${s.shape}${s.size.widthM ? ` ${s.size.widthM}×${s.size.heightM}m` : s.size.diameterM ? ` ⌀${s.size.diameterM}×${s.size.heightM}m` : ` r=${s.size.radiusM}m`})`,
      )
      .join(" · "),
  );
  factRow("机位", current.scene.cameras.map((c) => c.id).join(" · "));
  factRow("状态", current.scene.cue.states.map((s) => s.id).join(" · "));
  if (current.scene.scaleReference) factRow("尺度参照", `${current.scene.scaleReference.lengthM}m`);
  factRow(
    "fit 模式",
    current.scene.surfaces
      .flatMap((s) => s.fit?.modes ?? [])
      .map((m) => m.id)
      .join(" · ") || "—",
  );
  card.append(facts);

  const info = current.result.info.surfaces
    .map((s) => {
      const bits = [];
      if (s.physicalAspect) bits.push(`物理 ${s.physicalAspect.toFixed(3)}:1`);
      if (s.runtimeMatchesSurface) bits.push("runtime 比例一致 ✓");
      if (s.unwrappedAspect) bits.push(`展开 ${s.unwrappedAspect.toFixed(3)}:1`);
      if (s.masterMatchesUnwrap) bits.push("master 与展开比一致 ✓");
      return `${s.id}: ${bits.join(" · ") || "无比例约束（dome）"}`;
    })
    .join(" | ");
  if (info) {
    card.append(el("h3", null, "校验器算出来的数"));
    card.append(el("div", "note", info));
  }

  const sections = [
    ["转入 behaviour.params（不压平的 bespoke 行为）", current.report.carried, ""],
    ["字段映射", current.report.mapped, ""],
    ["映射中丢弃的键", current.report.dropped, "warnitem"],
    ["current 错误（必须为空才算能初始化）", current.result.errors, "err"],
    ["current 警告", current.result.warnings, "warnitem"],
    ["v1 错误（应当报出历史缺陷）", v1.result.errors, "err"],
  ];
  for (const [title, items, cls] of sections) {
    if (!items || items.length === 0) continue;
    card.append(el("h3", null, title));
    const list = el("ul");
    for (const item of items) list.append(el("li", cls, item));
    card.append(list);
  }
  return card;
}

async function main() {
  const cards = document.getElementById("cards");
  const results = [];
  let currentPass = 0;
  let v1Caught = 0;

  for (const demo of LEGACY_DEMOS) {
    let raw;
    try {
      raw = await loadLegacy(demo);
    } catch (error) {
      const card = el("div", "card");
      card.append(el("h2", null, demo));
      card.append(el("div", "note", `无法读取 legacy manifest：${String(error)}`));
      cards.append(card);
      results.push({ demo, loadError: String(error) });
      continue;
    }
    const current = runVariant(raw, demo, "current");
    const v1 = runVariant(raw, demo, "v1");
    if (current.result.ok) currentPass += 1;
    // Count only RATIO failures, not every error: otherwise the statistic gets padded by unrelated
    // problems and stops measuring whether the stretch rule actually has teeth.
    const ratioErrors = v1.result.errors.filter(
      (message) => message.includes("stretched") || message.includes("unwrapped"),
    );
    if (ratioErrors.length > 0) v1Caught += 1;
    cards.append(renderDemoCard(demo, current, v1));
    results.push({
      demo,
      sceneId: current.scene.sceneId,
      behaviour: current.scene.behaviour.module,
      surfaces: current.scene.surfaces.length,
      cameras: current.scene.cameras.length,
      states: current.scene.cue.states.length,
      fitModes: current.scene.surfaces.flatMap((s) => s.fit?.modes ?? []).length,
      carried: current.report.carried.length,
      dropped: current.report.dropped,
      currentOk: current.result.ok,
      currentErrors: current.result.errors,
      currentWarnings: current.result.warnings,
      v1Ok: v1.result.ok,
      v1Errors: v1.result.errors,
      v1RatioErrors: ratioErrors,
      ratios: current.result.info.surfaces,
    });
  }

  const summary = document.getElementById("summary");
  const stat = (label, value, cls) => {
    const box = el("div", "stat");
    box.append(el("b", cls, String(value)), el("span", null, label));
    summary.append(box);
  };
  stat(
    "个 Demo 用统一 schema 初始化成功",
    `${currentPass}/${LEGACY_DEMOS.length}`,
    currentPass === LEGACY_DEMOS.length ? "ok" : "bad",
  );
  stat(
    "个 Demo 的 v1 比例缺陷被规则抓出",
    `${v1Caught}/${LEGACY_DEMOS.length}`,
    v1Caught > 0 ? "ok" : "warn",
  );
  document.getElementById("footer").textContent =
    `统一 schema 版本 1 · 本次运行于 ${new Date().toISOString()} · 四个 manifest 逐个读取，没有硬编码副本。`;

  if (params.get("probe") === "1") {
    const probe = document.createElement("div");
    probe.id = "probe";
    probe.style.display = "none";
    probe.textContent = JSON.stringify({
      schemaVersion: 1,
      demos: results,
      currentPass,
      total: LEGACY_DEMOS.length,
      v1Caught,
    });
    document.body.append(probe);
  }
}

main();
