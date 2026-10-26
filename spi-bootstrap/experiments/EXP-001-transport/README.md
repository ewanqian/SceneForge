# EXP-001 — Browser / Vision Pro → Mac Transport Probe

Task: `SPI-001`

## Question

Can a browser client on Apple Vision Pro or another device send a continuous semantic control and a discrete performance event to a Mac over the local network reliably enough to become the first transport layer of Spatial Performance Instrument?

This experiment intentionally does **not** test WebXR hand tracking yet. It isolates transport reliability first.

## Run on Mac

```bash
cd spi-bootstrap/experiments/EXP-001-transport
npm install
npm start
```

The server listens on port `8787` on all interfaces.

Find the Mac LAN IP, then open from Vision Pro / phone / second computer:

```text
http://<MAC-LAN-IP>:8787
```

## Test sequence

1. Confirm page says `connected`.
2. Move the energy slider and verify JSON messages appear in the Mac terminal.
3. Press `Send FILL event` at least 10 times and verify each event arrives once.
4. Start `30 Hz auto stream` and run for 10 minutes.
5. Save terminal output to a log file.
6. During a second run, temporarily close/reopen the page or disable/re-enable network and record reconnect behavior.

Suggested logging:

```bash
npm start 2>&1 | tee 2026-10-26_SPI-001_RT-01_transport.log
```

## What the server records

- connection open/close
- receive timestamp
- client timestamp
- sequence number
- sequence gaps
- message type/control/event
- approximate `ageMs` using client/server wall clocks

`ageMs` is only a rough observation unless device clocks are synchronized. It is not a rigorous one-way latency measurement.

## Acceptance for SPI-001

- continuous stream sustains approximately 30 Hz for 10 minutes
- no progressive lag
- no obvious event duplication in normal local-network use
- connection loss is visible
- reconnect occurs without restarting the Mac receiver
- evidence is committed or referenced in a test log

## After this passes

Do **not** add visual polish. Move to the next transport-specific experiment: replace the slider with real Vision Pro/WebXR gesture-derived values while keeping the same message semantics.
