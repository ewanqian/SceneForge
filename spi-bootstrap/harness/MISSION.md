# Mission Control

Mission Control is the agent-facing control surface for the Spatial Performance Instrument project.

## Primary question

What is the smallest next mission that most reduces risk on the path to a reproducible live performance?

## Startup sequence

1. Read `../STATE.md`.
2. Read `STATUS.json`.
3. Read `TASKS.md`.
4. Read `CRITIC.md`.
5. Read the newest experiment/performance logs.
6. Compare repository evidence against the current objective.
7. Issue exactly one primary mission unless parallel work is genuinely independent.

## Mission response format

### CURRENT OBJECTIVE
One sentence.

### CURRENT BOTTLENECK
One concrete bottleneck, backed by repository evidence.

### NEXT MISSION
- ID
- goal
- why now
- constraints
- acceptance criteria
- evidence required
- non-goals

### CRITIC CHECK
State whether the task advances performance capability, reliability, artistic causality or reproducibility. Reject tasks that mainly increase novelty without reducing a known risk.

## State update rule

After a mission:
- update `STATUS.json`
- mark task status in `TASKS.md`
- append evidence/reference to an experiment or performance log
- record architectural decisions if one was made
- do not erase failed experiments; preserve them with conclusions
