# Multi-angle Replay（P1 · V0 · 手工同步）

**对应:** SceneForge Issue #42 §5（P1 — Multi-angle Replay / 饭拍视角）
**在线:** https://ewanqian.github.io/SceneForge/stage-replica/replay/

一个 master timeline 驱动多条**真实录像**。它把 Stage Replica 从"模拟还没发生的演出"扩到
"把已经发生过的演出重新放回空间里看"——**摄像机不一定是一台虚拟机位，也可以是一段录像**；
只要共享同一条时间轴，就能在"舞台空间"和"演出记录"之间切换。

---

## 1｜V0 的验收清单（Issue #42 §5）

| 验收项 | 状态 | 说明 |
|---|---|---|
| 导入 2–4 条同一表演的视频 | ✅ | 内置 3 条；侧栏可用文件选择器导入任意数量的本地视频 |
| 每条记录 `url/file + timeOffset + camera position/name` | ✅ | `session.json` 的每项只有 `src / offsetSec / positionM / label / confidence` |
| 一个 master timeline 控制所有视频 seek / play / pause | ✅ | 底部时间轴；所有素材的本地时间 = `master − offsetSec` |
| 切 Camera 时保持同一时间点 | ✅ | 已实测：`?t=20&cam=CAM_C` 下 master 仍为 20s，三条素材分别在 20.0 / 14.0 / 6.0s |
| Stage Radar 显示机位位置 | ✅ | 平面图用 Stadium 的真实 proxy 尺寸（⌀120m 碗体 / ⌀30m 舞台 / ⌀20m 圆柱） |
| 可切 `DIRECTOR PROGRAM` 与 `FREE VIEW` | ✅ | DIRECTOR 只显示当前机位；FREE 一次看全部（**同一时刻**） |

**内置素材**是同一条 Stadium cue 从三个机位分别录制的，并且**故意让后两条从不同时刻开始**（t=6 / t=14），
用来真实复现"饭拍在不同时间按下录制"的对齐问题。

---

## 2｜实测（`systems/stage-replica/review-tools/replay-probe.mjs`）

```
1) 定位到 master=20s        → CAM_A 20.0 / CAM_B 14.0 / CAM_C 6.0   全部 diff=0.000   PASS
2) 切到 CAM_C（master=20）  → master 不变，三条仍在 20.0/14.0/6.0                     PASS
3) master=3s                → CAM_B / CAM_C 正确报"尚未开始"（本地时间 0）             PASS
4) master=30s               → CAM_C 已到 16.0（其 18.12s 素材的末段）                  PASS
5) 真实播放 7 秒后           → master 11.48s，最大偏差 0.076s                          PASS
```

第 5 项是关键：**播放中**所有已开始的素材都在 0.1 秒内跟随。

---

## 3｜实测中发现并修掉的两个真 bug

这两个都不是"想出来的"，是探针跑出来的：

1. **首帧 seek 会被静默丢弃。** 片段元数据未就绪时 `video.duration` 是 `NaN`，
   `clamp()` 因此返回 `NaN`，给 `currentTime` 赋值 `NaN` 抛错，被 `try/catch` 吞掉——
   于是**没有任何重试**。第一次加载可能对，也可能不对，取决于时序。
   修法：duration 永远解析为有限值，并且**每帧都对账**而不是只在播放时对账。
2. **对账本身会造成 seek 抖动。** 改成每帧对账后，在素材尚未缓冲完时每帧重发 seek，
   会把上一次还没完成的 seek 打断，于是**永远到不了目标时间**。
   修法：`if (... && !video.seeking)`，等上一次 seek 落定再发下一次。

第 2 个 bug 是第 1 个的修法**引入**的——如果只跑一次探针，两个都会漏掉。

---

## 4｜仍未做到 / 已知限制（不掩饰）

1. **没有自动同步。** V0 的 `offsetSec` 完全靠人填。多角度项目里最值钱的部分
   （audio fingerprint / visual flash / GPS / confidence score）**一个都没做**。
   界面上始终显示 `confidence`，且写明"手工 offset，非自动同步"，不假装。
2. **冷启动首次加载在无头环境未通过验证。** 在"磁盘缓存为空 + 页面不被 CDP 唤醒"的无头场景下，
   三个片段都停在 `readyState=1`，pending seek 无法完成，因此首屏会定位失败；
   下一次 CDP 调用唤醒页面后立刻变成 `readyState=4` 且 `buffered:[0,32.02]`。
   证据指向**无头页面的节流**而不是模块逻辑（同一模块在热缓存与播放测试中都通过）。
   **我没有把它标记为已解决**；界面上增加了"缓冲中…"提示，避免在素材未就绪时显示一个错误画面却报 OK。
3. **没有真实饭拍。** 内置素材是我自己从同一 cue 渲染的三个机位，不是观众手机拍摄；
   它能验证"多源 + 偏移 + 同一时间轴"的机制，但**不能**验证真实饭拍的画质差异与手持抖动。
4. **无音频。** 因此音频指纹这条路线连试验都没有做。
5. **机位位置是手填的。** 平面图上的位置来自 `session.json`，没有从视频内容推断。
6. 移动端与 XR 未测试。

---

## 5｜复现

```bash
npm run build
python -m http.server 8123 --bind 127.0.0.1 -d dist
```

```
?t=<秒>             master 时间轴位置
?cam=<CAM_ID>       哪个机位是 program
?mode=director|free DIRECTOR PROGRAM / FREE VIEW
?play=1             自动播放（用于录制与探针）
?probe=1            把机器可读状态写进 DOM，供无头验证
```

播放同步探针（需要先起一个开了 `--remote-debugging-port=9222` 的 Chrome）：

```bash
chrome --headless=new --remote-debugging-port=9222 --autoplay-policy=no-user-gesture-required \
  --user-data-dir=/tmp/probe about:blank &
node systems/stage-replica/review-tools/replay-probe.mjs \
  "http://127.0.0.1:8123/stage-replica/replay/?t=2&play=1&probe=1" 7
```

> 用 `chrome --headless --virtual-time-budget` 测播放会得到**假失败**：虚拟时间不推进媒体时钟，
> 所有 `currentTime` 永远是 0。探针脚本存在的原因就是这个。

---

## 6｜为什么它值得放进工作坊

它把"舞台复刻"从单向的预演，变成双向的：

> **未来的演出可以先预演；已经发生过的演出，也可以重新放回空间里再看一次。**

而且它给出了一个很具体的教学点：**同步是一道算术题，不是感觉题。**
`本地时间 = master − offset` 这一行就是全部；错一点都不行，而对了就能在任意时刻切过去停在同一拍。
