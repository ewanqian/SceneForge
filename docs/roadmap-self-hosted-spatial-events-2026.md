# SceneForge self-hosted spatial events roadmap

Status: proposed implementation plan, August 2026

Tracking issue: #18

## 1. Product boundary

SceneForge is a self-hostable spatial-event and venue-review platform for performances, exhibitions, meetings, client reviews and online festivals.

It is not intended to reproduce the whole of VRChat, replace Blender, or become a general-purpose game engine. It should combine a portable venue/event package, interchangeable runtimes, controlled networking and media services, and reusable project templates.

SceneForge owns:

- venue, scene, screen, camera, cue and interaction data;
- assets, revisions, permissions and share links;
- room, event and participant roles;
- media-source descriptors and show state;
- deployment configuration and release evidence;
- compatibility contracts for desktop, mobile, Quest and Vision Pro.

Needle Engine may accelerate authoring, WebXR, networking and early screen-sharing prototypes. It must remain a replaceable runtime adapter. Three.js/R3F remains the open reference runtime.

## 2. Target architecture

```text
SceneForge applications
├── viewer and control UI
├── project/revision review UI
├── event host console
└── deployment/preflight tools

SceneForge domain layer
├── SceneForge Package
├── venue and scene revisions
├── screens, cameras and cue sets
├── rooms, roles and permissions
├── events, stages and room shards
└── media-source and device capability contracts

Runtime adapters
├── R3F/WebXR reference adapter
├── Needle Engine adapter
└── future native OpenXR/visionOS adapter

Self-hosted services
├── API and authentication
├── PostgreSQL
├── S3-compatible object storage
├── room-state WebSocket service
├── LiveKit SFU
├── coturn
├── optional NDI-to-WebRTC sidecar
└── monitoring, logs and backups

Delivery
├── domestic object storage/CDN
├── HTTPS web application
├── Quest Browser
├── Vision Pro Safari
└── desktop/mobile browsers
```

## 3. Network model

The browser downloads scene assets and renders them locally. Servers should not stream the full rendered 3D view.

Separate the traffic into three planes:

1. **Asset plane:** GLB, KTX2, USDZ, audio, posters and video proxies over HTTP/CDN.
2. **State plane:** participant transforms, cue state, room state and interactions over WebSocket or equivalent low-bandwidth messaging.
3. **Media plane:** voice, screen share, camera and live stage feeds over LiveKit/WebRTC, with CDN/HLS-compatible broadcast for large passive audiences.

Initial network profiles:

| Profile | Intended environment | Behavior |
|---|---|---|
| Low | approximately 2 Mbps | minimal avatar updates, low media resolution/frame rate, aggressive asset LOD, no optional reflections |
| Balanced | approximately 10 Mbps | normal avatar updates, one adaptive 720p-class screen, progressive high-resolution assets |
| Venue LAN | controlled network | higher media bitrate, denser updates and optional show-network sources |

These are engineering targets. Release claims require the reproducible tests in #16.

## 4. Development phases

### Phase 0 — Runnable foundation

Related work: PR #2.

Deliverables:

- Three.js/R3F viewer;
- portable domain foundations;
- WebGL2/WebXR baseline;
- video texture and cue state;
- CI and deployment foundation.

Exit condition: main builds and passes desktop visual review.

### Phase 1 — End-to-end experience proof

Related issues: #3, #6, #8, #9.

Deliverables:

- SceneForge Package version 1;
- one real optimized venue;
- minimal R3F and Needle adapters;
- two-user room proof;
- desktop screen share received in Quest and Vision Pro;
- synchronized cue/camera state;
- measured comparison of Needle acceleration and lock-in.

Exit condition: one public non-commercial link demonstrates the complete meeting flow while the same venue package still loads in R3F.

### Phase 2 — Self-hosted China MVP

Related issues: #7, #10, #11, #12.

Deliverables:

- self-hosted catalog and review service;
- controlled asset storage/CDN configuration;
- room links and participant roles;
- adaptive multiplayer state;
- self-hosted LiveKit and coturn;
- screen sharing, voice and moderation basics;
- 2 Mbps and 10 Mbps profiles.

Exit condition: a private 25-person session completes through the self-hosted stack, including a TURN-only test.

### Phase 3 — Content factory and release evidence

Related issues: #5, #6, #15, #16.

Deliverables:

- automated venue validation and optimization;
- device-specific quality packages;
- repeatable desktop, Quest and Vision Pro matrix;
- rendering/network/media budgets;
- load tests, dashboards and release reports;
- measured WebGPU evaluation without replacing the stable WebGL2/WebXR path.

Exit condition: new venues can be packaged reproducibly and releases carry objective evidence.

### Phase 4 — Reusable commercial workflows

Related issues: #4, #14, #17.

Deliverables:

- lightweight avatars and presence;
- moderation and host controls;
- meeting, review, live-house, gallery and launch templates;
- optional trusted NDI-to-WebRTC preview bridge;
- one-click static preview and self-hosted deployment paths.

Exit condition: a client project is mostly package/configuration work rather than a fresh application build.

### Phase 5 — Online festival scale

Related issues: #13 and #16.

Deliverables:

- event/stage/session model;
- 20–25-person social room shards;
- global show clock and cue bus;
- WebRTC presenters plus broadcast delivery for passive audiences;
- 100/500/1000-attendee synthetic tests;
- broadcast-only degradation and failure runbooks.

Exit condition: a 500-person synthetic event and a smaller real pilot complete without one oversized avatar room.

## 5. First 30-day execution plan

### Week 1

- Merge PR #2 after human visual review.
- Start #9 and freeze the first portable package boundary.
- Prepare one real venue asset under #3.
- Create the smallest Needle spike repository/workspace for #8.

### Week 2

- Load the same venue package through R3F and Needle.
- Validate desktop-to-XR link flow.
- Prove two-user presence and one synchronized cue.
- Record initial download, frame pacing and reconnection evidence.

### Week 3

- Prove desktop screen sharing to Quest/Vision Pro.
- Complete the Needle go/no-go report.
- Begin #10 Docker Compose and environment-based endpoint configuration.
- Begin #7 core entities and signed asset flow.

### Week 4

- Begin #11 room state with synthetic clients.
- Deploy coturn and the first self-hosted signaling environment.
- Establish #16 network profiles and baseline benchmark scripts.
- Select the Phase 2 implementation split based on the Needle spike result.

## 6. Workstream ownership

The roadmap supports parallel work, but interfaces must be frozen before implementations diverge.

### Client/runtime workstream

- #3, #5, #6, #8, #9, #14.

### Backend and deployment workstream

- #7, #10, #11.

### Media workstream

- #4, #12.

### Content pipeline workstream

- #3, #15.

### Event product workstream

- #13, #17.

### Quality and operations workstream

- #6, #16.

## 7. AI-agent development protocol

- One issue normally maps to one focused pull request or a documented chain of dependent pull requests.
- Read `AGENTS.md`, architecture documents and the complete issue before editing.
- Preserve the SceneForge Package boundary; runtime adapters may not redefine core entities.
- Include tests, fixtures or a written reason when automated testing is impossible.
- Do not claim device, network, latency or capacity support without attached evidence.
- Preserve original source assets and publish before/after optimization metrics.
- Do not merge networking, media, security or deployment changes without human review.
- Use squash merge for agent-generated implementation branches.
- Keep issue checklists current so another agent can continue the work.
- A show-critical release requires a manual device preflight and rollback artifact.

## 8. Decision gates

### Needle paid license

Do not purchase a paid seat until #8 proves measurable engineering savings, acceptable China-network behavior and a clean adapter boundary.

### Large-event implementation

Do not start the full #13 implementation until a real 25-person session succeeds under #10–#12.

### Native client

Do not begin a separate OpenXR or visionOS native client until the web implementation demonstrates a specific blocker that cannot be addressed through WebXR, USDZ/HTML model delivery, runtime quality profiles or a small native companion.

### WebGPU default

Do not replace the stable WebGL2/WebXR path until #5 and #6 show device-specific improvement without compatibility regression.

## 9. Definition of SceneForge 0.1

The first sellable release must allow a client to:

- select or upload an optimized venue;
- create a private review/event room;
- share one HTTPS link;
- enter through desktop, Quest or Vision Pro;
- view a video or screen share on an in-world screen;
- use basic voice and participant presence;
- switch cameras and cues;
- operate through controlled self-hosted infrastructure;
- receive a documented compatibility and network preflight report;
- reuse the venue package for another project.

This document is subordinate to measured implementation results. Update it when dependencies, device behavior or network evidence changes.
