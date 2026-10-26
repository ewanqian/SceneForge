# MISSION CONTROL COMMANDS

These are human/agent interaction conventions, not shell commands.

## `领取下一任务`

Mission Control must:
1. read `STATUS.json`
2. read `TASKS.md`
3. inspect the active task's execution packet and latest relevant logs
4. return exactly one primary mission unless the active mission is blocked
5. include acceptance criteria and required evidence
6. refuse scope-expanding side quests unless they unblock the current mission

## `检查项目状态`

Return:
- deadline
- phase
- active mission
- current bottleneck
- latest validated evidence
- blocked tasks
- top risk
- next decision required from the user, if any

## `批判这个项目`

Use `CRITIC.md` and evaluate:
- artistic causality
- instrument usefulness
- reliability
- unnecessary complexity
- duplicated tooling
- deadline risk
- whether a prototype is actually reusable

Do not reward novelty by itself.

## `提交测试结果`

The agent must:
1. identify task/test IDs
2. compare evidence with `TEST_PROTOCOL.md`
3. mark pass / partial / fail
4. record missing evidence
5. update task/state only when acceptance is actually met

## `我换电脑了 / 恢复上下文`

Read the authoritative memory listed in `STATUS.json` before asking the user to restate project history.

## `冻结演出版本`

Only valid after integrated reliability testing. Create/finalize the performance snapshot under `performances/2026-12-03/` and stop feature growth except show-stopping fixes.
