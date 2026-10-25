# Spatial Performance Instrument

A long-term embodied audiovisual performance system for Apple Vision Pro, WebXR, Max/MSP/RNBO, Ableton Live, pedals and realtime visuals.

## Goal

Build a reproducible instrument that can be performed, improvised, rehearsed, tested, recovered and taught. The first hard deadline is the 2026-12-03 online performance.

## Project layers

- **Instrument** — gesture, pedal, music, visual and state runtime.
- **Performance Harness** — persistent research/test/task infrastructure.
- **Mission Control** — agent-facing interface for reading state, issuing missions, critique and validation.
- **SceneForge integration** — optional renderer/previsualization client, not the source of truth for performance state.

## Core principle

Sound and image should not merely react to each other. They should be composed from a shared rhythmic/event structure whenever possible.

## Near-term target

Create `SPATIAL SCORE 01`: a 60–180 second audiovisual study where a shared event score drives percussion and realtime visual behaviors, with Apple Vision Pro gestures controlling higher-order parameters such as energy, density, space and tension.

## Repository map

- `AGENTS.md` — operating rules for coding/research agents.
- `STATE.md` — human-readable project state.
- `ROADMAP.md` — phase gates to Dec 03.
- `harness/` — mission control, task queue, critique and validation.
- `protocols/` — transport/state contracts.
- `experiments/` — bounded research spikes.
- `performances/2026-12-03/` — show-specific freeze, cues and evidence.

## Multi-machine rule

Git is the persistent memory. A machine should be able to clone/pull the repository, read `AGENTS.md`, `STATE.md`, `harness/STATUS.json` and `harness/TASKS.md`, then resume work without relying on chat history.
