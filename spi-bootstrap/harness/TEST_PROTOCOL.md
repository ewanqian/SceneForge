# TEST PROTOCOL

## Purpose

Every realtime feature must be demonstrated as a chain, not merely as code.

## Minimum evidence packet

For each test record:

- test ID and task ID
- date/time and machine
- source device/browser/app
- destination app/process
- network/transport
- expected update rate or event semantics
- actual observed behavior
- latency observation or measurement method
- 10-minute stability result for persistent streams
- disconnect/reconnect result
- safe-state result
- evidence links/paths
- pass / partial / fail

## Standard realtime checks

### RT-01 — Continuous stream
Send one normalized continuous value for 10 minutes.

Pass when:
- receiver remains responsive
- no progressive lag is observed
- message rate stays within the task's accepted range
- malformed messages do not crash receiver

### RT-02 — Discrete event integrity
Send at least 100 trigger events manually or automatically.

Pass when:
- no duplicate events are observed
- no obvious lost events in normal local-network conditions
- event identity and timestamp are preserved

### RT-03 — Disconnect / reconnect
Disconnect the client or network, then reconnect.

Pass when:
- system exposes disconnected state
- stale continuous controls are not treated as fresh input
- reconnect does not require restarting the whole performance stack unless explicitly documented

### RT-04 — Safe state
Trigger or simulate transport failure.

Pass when:
- sound/visual layer has a defined safe behavior
- state does not remain indefinitely in an uncontrolled high-energy/fill/break condition

## Evidence naming

Use:

`YYYY-MM-DD_TASKID_TESTID_description.ext`

Example:
`2026-10-26_SPI-001_RT-01_visionpro-mac-10min.log`
