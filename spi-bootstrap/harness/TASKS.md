# TASKS

Status: `READY` / `ACTIVE` / `BLOCKED` / `DONE` / `REJECTED`

Project Manager rule: only one P0 delivery bottleneck may be ACTIVE unless the second task is explicitly marked as safe parallel preparation.

## SPI-001 — Prove browser/Vision Pro → Mac transport
Status: ACTIVE
Priority: P0
Delivery gate: 2026-10-30

Goal:
Send one continuous semantic value and one discrete event from a WebXR/browser client to a Mac receiver over the local network.

Why now:
Every later Vision Pro performance feature depends on a reliable transport path.

Execution packet:
`experiments/EXP-001-transport/README.md`

Acceptance:
- continuous value updates at >= 30 Hz where device/browser permits
- discrete event arrives without duplication in normal use
- receiver displays timestamps/value
- 10 minute run recorded
- disconnect and reconnect behavior documented

Evidence:
- short video
- log excerpt
- measured or estimated event latency
- PASS / CONDITIONAL / FAIL written conclusion

Fallback if gate misses:
Keep the semantic WebSocket protocol, substitute desktop/mobile browser input, proceed to SPI-002/003, and return to Vision Pro after shared sound+image proof exists.

Non-goals:
- visual polish
- Ableton mapping
- Max patch complexity
- WebXR hand tracking before the transport probe itself passes

---

## SPI-002 — Define canonical performance-state schema
Status: READY
Priority: P0
Delivery gate: 2026-11-05 together with SPI-003
Safe parallel preparation: YES, documentation/examples only while SPI-001 is active

Goal:
Define transport-independent semantic state for energy, density, space, tension plus pattern/fill/break/safe.

Acceptance:
- JSON schema committed
- example state committed
- source-specific values are normalized before entering canonical state
- visual and audio clients can consume the same structure

Non-goals:
- device-specific gestures
- final artistic mappings

---

## SPI-003 — One shared event → sound + image
Status: READY
Priority: P0
Delivery gate: 2026-11-05
Depends on: SPI-002

Goal:
Use one event source (prefer MIDI/note event) to trigger one Ableton sound and one visual behavior.

Acceptance:
- same event identity reaches both outputs
- timing relationship is visibly/audibly coherent
- no FFT/onset analysis used as the primary trigger
- event velocity/intensity affects both domains

Evidence:
- 20–30 sec capture
- routing diagram
- written timing observation

---

## SPI-004 — Build debug HUD
Status: READY
Priority: P1
Delivery gate: 2026-11-19

Goal:
Display canonical state and connection health in browser/Vision Pro.

Minimum fields:
BPM, section/pattern, energy, density, space, tension, gesture/event, connection status.

---

## SPI-005 — Ableton percussion seed set
Status: READY
Priority: P1
Delivery gate: 2026-11-12
Safe parallel preparation: YES, minimal template only

Goal:
Create a minimal 4-voice percussion set for SPATIAL SCORE 01: LOW, WOOD/BODY, METAL/TRANSIENT, TEXTURE.

Acceptance:
- editable MIDI/event structure
- no dependence on a single generated stereo loop
- all four voices have clear performance roles

---

## SPI-006 — Pedal semantic layer
Status: READY
Priority: P2
Delivery gate: 2026-11-19

Goal:
Map pedals to pattern, fill, break and safe semantics independently of specific Ableton parameters.

---

## SPI-007 — SPATIAL SCORE 01 v0
Status: BLOCKED
Priority: P1
Delivery gate: 2026-11-12
Depends on: SPI-003, SPI-005

Goal:
Produce first 60–180 sec coherent shared-score audiovisual study.

Acceptance:
- plays start-to-finish
- coherent rhythmic/event language
- Critic score >= 8/14
- performer can execute the core phrase without laptop mousing

---

## SPI-008 — Integrated reliability + rehearsal path
Status: BLOCKED
Priority: P2
Delivery gate: first integrated run by 2026-11-19; freeze by 2026-11-26; full rehearsal by 2026-11-30
Depends on: SPI-001, SPI-003, SPI-004

Goal:
Run the active chain repeatedly and document latency, dropouts, reconnect, safe behavior, cold-start setup and backup mode.

Acceptance:
- integrated 10–20 minute runs
- known recovery behavior
- reproducible Mac/Windows setup instructions
- feature freeze recorded
- full rehearsal video by 2026-11-30
