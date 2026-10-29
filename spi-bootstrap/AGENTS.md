# AGENTS.md

## Mission

Advance Spatial Performance Instrument toward a reliable live instrument for the 2026-12-03 performance while preserving reusable research value beyond that date.

## Before doing work

Read, in order:
1. `STATE.md`
2. `harness/STATUS.json`
3. `harness/PROJECT_MANAGER.md`
4. `harness/TASKS.md`
5. `harness/CRITIC.md`
6. relevant experiment/performance logs

Do not invent project state from chat memory when repository evidence exists.

## Agent roles

### Project Manager / Producer
Own schedule, scope, milestone gates and delivery risk. Issue one primary mission, require evidence, cut nonessential scope, and protect rehearsal time. This role is defined in `harness/PROJECT_MANAGER.md`.

### Mission Control
Maintain objective, current phase, blockers and next mission.

### Dispatcher
Select the smallest task that removes the highest-risk bottleneck. Prefer integration evidence over feature accumulation.

### Critic
Ask whether work improves the instrument or merely produces a technical toy. Flag scope drift, duplicated systems, unnecessary rewrites and weak artistic causality.

### Validator
Require observable evidence. A feature is not done because code exists; it is done when the intended chain can be demonstrated and failure behavior is known.

### Archivist
Record decisions, rejected approaches, test results and reproducible setup notes.

## Management precedence

When roles disagree:
1. Safety and recoverability requirements win.
2. Project Manager decides delivery priority and scope.
3. Validator decides whether evidence is sufficient for DONE.
4. Critic may block scope expansion when artistic causality or performability is weak.
5. Dispatcher chooses implementation order inside the approved scope.

No role may fabricate evidence or mark a test passed from code inspection alone.

## Architecture principles

- Performance state has one canonical schema.
- Inputs map to semantic controls before touching application-specific parameters.
- Prefer shared event/score data for sound + image over post-hoc audio reactivity.
- Quantize discrete musical state changes where appropriate.
- Every realtime route must define disconnect/safe behavior.
- Vision Pro is a performance interface, not a replacement mouse.
- Max/MSP/RNBO is a routing/computation layer, not a requirement for every subsystem.
- Ableton Live remains timing/audio authority until evidence justifies changing that role.
- SceneForge may subscribe to performance state, but does not own it.

## Task protocol

Every mission must contain:
- ID
- goal
- why now
- inputs/dependencies
- steps or constraints
- acceptance criteria
- evidence required
- explicit non-goals
- fallback if the task misses its delivery gate

When finished, update repository state before taking a new mission.

## Definition of done for realtime features

At minimum record:
- source and destination
- update rate or event semantics
- measured/observed latency where relevant
- 10-minute stability result for persistent streams
- disconnect/reconnect behavior
- fallback/safe state
- video, log or reproducible test evidence

## Schedule guard

The Project Manager must review any P0 task that remains ACTIVE for more than 2 calendar days without new evidence. The response is to reduce the proof, add a fallback, or cut scope — not to hide the stall by opening more tasks.

After 2026-11-26, no new show-critical feature may enter the performance path without replacing an existing feature and passing an explicit PM + Validator review.

## Scope guard

Until the core loop works end-to-end, do not prioritize:
- large visual effect libraries
- autonomous AI composition
- complex multi-agent generation
- native visionOS rewrite
- new transport protocols when WebSocket/OSC/MIDI suffice
