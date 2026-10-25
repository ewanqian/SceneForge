# STATE

Last updated: 2026-10-25

## Current objective

Reach a stable, performable Spatial Performance Instrument for the 2026-12-03 online performance.

## Current concept

A performer uses Apple Vision Pro spatial gestures plus foot pedals to control higher-order musical and visual states. Sound and image share event/score structures instead of relying only on audio-reactive analysis.

## Proposed runtime chain

Apple Vision Pro / WebXR
→ local network transport
→ Max/MSP or lightweight bridge
→ semantic performance state
→ Ableton Live + realtime visual engine
→ optional SceneForge spatial renderer/previs

Pedals feed discrete commands such as pattern, fill, break and reset/safe.

## First artwork

**SPATIAL SCORE 01**

Target: 60–180 seconds.

Initial sound voices:
- LOW percussion
- WOOD/body percussion
- METAL/transient percussion
- TEXTURE/ambience

Initial visual behaviors:
- IMPACT
- CUT
- SCATTER
- FLOW

Initial performance macros:
- ENERGY
- DENSITY
- SPACE
- TENSION

## Known constraints

- User is a beginner in Max/MSP and early-stage Ableton user.
- The project must not depend on mastering Max before useful output exists.
- WebXR on Vision Pro is the near-term browser route; native visionOS is not required for v1.
- The system must support iteration across multiple Mac/Windows machines.
- Repository files, not chat memory, are the authoritative long-term context.

## Current risks

1. No proven Vision Pro → Mac low-latency gesture route yet.
2. No canonical performance-state schema yet validated in runtime.
3. No proven shared-score path from Ableton/MIDI to visual engine yet.
4. No 10-minute stability test across the end-to-end route.
5. Artistic language may drift into generic audio-reactive visuals if shared causality is not enforced.

## Current phase

P0 — Harness bootstrap + minimum end-to-end proof.

## Exit condition for P0

A single gesture/event can travel through the real transport chain and visibly affect both sound and image, with state visible in a debug HUD and a documented fallback when the route fails.
