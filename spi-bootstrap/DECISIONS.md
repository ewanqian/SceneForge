# DECISIONS

This file records durable project decisions. Do not rewrite history; append a new decision when a previous one changes.

## D-001 — Project / harness boundary
Date: 2026-10-25
Status: ACCEPTED

Spatial Performance Instrument (SPI) is the project. Performance Harness is its development, validation and memory infrastructure. Mission Control is the task/state interface inside the harness.

SceneForge is a separate spatial renderer/previsualization system and may subscribe to SPI performance state, but it does not own SPI state or task management.

## D-002 — Audio authority
Date: 2026-10-25
Status: ACCEPTED

Ableton Live remains the timing/audio authority for the first performance-ready version. Max/MSP/RNBO may route, transform and expose control/state, but the project will not require a full custom audio engine before 2026-12-03.

## D-003 — Shared-score causality
Date: 2026-10-25
Status: ACCEPTED

Primary audiovisual synchronization should come from a shared event/score source. FFT/onset-driven visual reactivity may be used as a secondary layer, not as the core causal model.

## D-004 — Input semantics
Date: 2026-10-25
Status: ACCEPTED

Device-specific inputs are normalized into semantic controls before they reach Ableton, Max or visual clients.

Continuous: energy, density, space, tension.
Discrete: pattern, fill, break, safe.

## D-005 — First transport proof
Date: 2026-10-26
Status: ACCEPTED

SPI-001 will first prove browser/Vision Pro Safari -> Mac transport using a minimal local WebSocket test page. WebXR hand tracking is intentionally deferred until the transport path itself is stable.

Reason: separating transport reliability from hand-tracking complexity gives a faster and more falsifiable first experiment.
