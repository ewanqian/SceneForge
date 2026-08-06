# Codex execution playbook

Status: proposed operating procedure

Tracking roadmap: #18

## 1. Distinguish the agents

OpenAI Codex and GitHub Copilot coding agent are separate systems.

- **OpenAI Codex:** start tasks from a Codex repository environment, select the repository and base branch, paste a scoped task prompt, review the result, and let Codex open or update a pull request.
- **GitHub Copilot coding agent:** assign an issue to the Copilot bot from GitHub. It then works on the issue and opens a pull request.

SceneForge should use OpenAI Codex as the primary implementation agent and Codex review as an additional reviewer. Do not treat a normal GitHub assignee field as proof that an OpenAI Codex task is running.

## 2. Preconditions

Before starting implementation tasks:

1. Merge PR #2 or deliberately select `feat/stage-viewer-foundation` as the temporary base branch.
2. Configure a Codex environment for `ewanqian/SceneForge`.
3. Use Node.js 24 or a compatible Node.js version satisfying `package.json`.
4. Run setup with `npm install`.
5. Require `npm run verify` before completion.
6. Require the agent to read `AGENTS.md`, the target issue, and related architecture documents.
7. Enable internet access only when the task requires dependency installation or current package documentation, and restrict it to necessary domains.

## 3. Work allocation rule

Use one issue as one unit of intent. A task may produce one pull request or a short documented sequence of dependent pull requests.

Do not start every issue simultaneously. Use at most three concurrent implementation lanes:

### Lane A — Core contract

Owns portable schemas, runtime interfaces, migrations and conformance tests.

Initial issue: #9.

This lane blocks runtime-specific and backend work that depends on identifiers or package structure.

### Lane B — Experience spike

Owns the Needle proof, real venue loading and cross-device experience validation.

Initial issues: #3 and #8, but implementation should begin only after #9 has frozen the minimum package contract.

### Lane C — Infrastructure research

Owns non-invasive architecture, deployment manifests, cost models and test harness preparation.

Initial issue: #10, limited initially to architecture, environment contracts and Docker Compose planning. Do not implement room or media APIs that conflict with #9.

## 4. First execution sequence

### Task 1 — #9 portable package contract

Start first. It defines the boundary needed by the other workstreams.

Expected output:

- package v1 schema;
- runtime adapter interface;
- migration from the current VenueManifest;
- R3F reference adapter skeleton;
- conformance fixtures and tests;
- no Needle dependency in core modules.

Merge gate:

- CI passes;
- schema and naming receive human review;
- no speculative backend or media implementation;
- package examples remain small and readable.

### Task 2A — #3 real venue asset path

Start after the minimum package schema from #9 is reviewable.

Expected output:

- GLB/KTX2 loading path;
- one small verified venue fixture;
- loading/error/fallback UI;
- documented asset budgets;
- no unverified real-world dimensions presented as surveyed data.

### Task 2B — #8 Needle spike

Start from the same approved package contract, in parallel with #3.

Expected output:

- minimal adapter or exporter bridge;
- two-user room proof;
- one synchronized cue;
- screen-share experiment;
- compatibility and licensing report;
- Needle-specific code isolated from the core package.

### Task 2C — #10 domestic deployment design

May run in parallel as a documentation/infrastructure skeleton task.

Expected output:

- endpoint/environment matrix;
- Docker Compose skeleton;
- object storage/CDN and TURN topology;
- cost worksheet structure;
- no premature production-security claims.

### Task 3 — device and self-hosted MVP

After #9, #3 and the #8 go/no-go report:

- #6 device matrix;
- #7 catalog/review service;
- #11 room state;
- #12 LiveKit media.

Only start #13 festival orchestration after a real 25-person session succeeds.

## 5. Codex task prompt template

Use the following structure in Codex Code mode:

```text
Repository: ewanqian/SceneForge
Base branch: <main or an explicitly named integration branch>
Issue: #<number> — <title>

Read before editing:
- AGENTS.md
- the complete issue body and acceptance criteria
- docs/roadmap-self-hosted-spatial-events-2026.md
- any architecture documents referenced by the issue

Goal:
Implement only the smallest coherent slice of issue #<number> that can be reviewed and tested independently.

Required constraints:
- Follow the architecture rules in AGENTS.md.
- Preserve ESM, TypeScript, Three.js/R3F and WebGL2/WebXR fallback behavior.
- Do not introduce runtime-specific fields into the portable core schema.
- Do not edit unrelated files.
- Do not claim hardware, XR, NDI or low-bandwidth support without evidence.
- Add or update tests for changed behavior.
- Run npm run verify.
- Create a focused pull request that links issue #<number>.

Before coding:
1. Inspect the current implementation.
2. State the proposed file-level plan.
3. Identify ambiguity or dependency conflicts.
4. Prefer a smaller PR when the full issue is too large.

PR description must include:
- implemented scope;
- intentionally deferred scope;
- architecture decisions;
- tests and commands run;
- device/network testing not performed;
- risks and follow-up issues.
```

## 6. Ready-to-run prompt for #9

```text
In ewanqian/SceneForge, implement the first reviewable slice of issue #9: Define the portable SceneForge Package and runtime adapter API.

Use the current Stage Viewer foundation as the base. Read AGENTS.md, issue #9 and docs/roadmap-self-hosted-spatial-events-2026.md before editing.

Deliver only:
1. SceneForgePackage v1 Zod schemas for package metadata, assets, screens, cameras, spawn points, cue sets and quality profiles.
2. A versioned extension field for runtime-specific metadata without adding Needle-specific fields to the core schema.
3. A migration function from the existing VenueManifest.
4. A small RuntimeAdapter TypeScript interface covering load, apply cue, camera selection, media surface binding and XR capability reporting.
5. A minimal R3F adapter skeleton using the existing viewer.
6. Conformance fixtures and unit tests.
7. Documentation for coordinate system, units and package directory layout.

Do not add networking, LiveKit, Needle packages, backend services or new visual features in this PR.

Run npm run verify. Open a focused PR linked to #9 and clearly list deferred acceptance criteria.
```

## 7. Branch and pull-request policy

- Base new Codex tasks on `main` after PR #2 is merged.
- Before that merge, use `feat/stage-viewer-foundation` only for deliberately temporary work.
- Use branch names such as `codex/issue-9-package-v1`.
- Never let two agents modify the same schema or central file concurrently.
- One active PR may depend on another, but the dependency must be stated in the PR description.
- Do not enable automatic merge for renderer, schema, networking, media, authentication, deployment or security work.
- Prefer squash merge after CI, Codex review and human review.

## 8. Review workflow

For each Codex-created PR:

1. Wait for CI.
2. Request or trigger Codex review.
3. Resolve high-severity review comments.
4. Check the diff against the original issue acceptance criteria.
5. Perform human visual/device testing when the change affects rendering, XR or media.
6. Merge only when the PR documents both tested and untested areas.

Codex review is an additional reviewer, not a substitute for human approval.

## 9. Progress tracking

When a Codex task starts, add a comment to the issue containing:

```text
Codex task started
Base: <branch>
Scope: <specific slice>
Expected PR: one focused PR
Blocked by: <issues or none>
```

When the PR opens, add:

```text
Implementation PR: #<number>
Completed acceptance criteria: ...
Deferred acceptance criteria: ...
Manual validation required: ...
```

Close an issue only when all acceptance criteria are complete. Partial PRs should keep the issue open and update its checklist.

## 10. Recommended immediate action

1. Human-review and merge PR #2.
2. Create the Codex environment for the repository.
3. Run the ready-to-use #9 prompt above as the first Code task.
4. Review and merge the smallest package-contract PR.
5. Start #3 and #8 in parallel from that contract.
6. Allow #10 to proceed only as an infrastructure skeleton until the package and endpoint contracts are stable.
