# CURRENT MISSION

Issued by: Project Manager / Producer
Issued: 2026-10-29
Gate deadline: 2026-10-30
Delivery status: AMBER

## SPI-001 — Close the transport evidence gap

### Objective
Prove that the existing EXP-001 browser/Vision Pro -> Mac path behaves well enough to support later performance integration.

### Do now
1. Run `experiments/EXP-001-transport` on the Mac.
2. Connect from the target browser/device path available today; prefer Vision Pro, but do not block the test if only another browser device is available initially.
3. Run the 30 Hz stream continuously for 10 minutes.
4. Trigger at least 20 FILL events during the run.
5. Intentionally disconnect once and reconnect.
6. Preserve terminal/log output and capture a short video/screen recording.
7. Write a PASS / CONDITIONAL / FAIL conclusion in the experiment folder.

### Acceptance evidence
- 10-minute duration documented
- stream rate observed
- no unexplained duplicate discrete events
- sequence gaps/dropouts described
- reconnect behavior described
- rough transport age/latency observation
- evidence file names or links recorded

### Stop conditions
Do not spend the session on:
- WebXR hand gesture design
- visual style polish
- new Max devices
- RNBO export
- agent-based composition
- more network protocols
- a larger Ableton set

### If the Vision Pro path fails
Do not turn the session into open-ended debugging.

Record the failure, keep the semantic protocol, switch to desktop/mobile browser input, and prove the rest of the chain. Vision Pro returns as a focused interface task after SPI-003.

### Next mission after PASS
SPI-002 -> canonical performance state, immediately followed by SPI-003 -> one shared event reaches both sound and image.

### Definition of a productive session
The session ends with evidence and a conclusion, not merely more code.
