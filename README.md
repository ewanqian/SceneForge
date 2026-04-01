# SceneForge

中文 | [English](./README-en.md)

SceneForge 是当前唯一核心产品仓。

它的目标不是再讲“生态中台”，而是做一个明确、可验证、可发布的工具：

- 网页端场景查看器
- 舞台预演器
- cue / event-based 触发与编排工具
- 轻量网页发布与分享入口

## First Read

如果你是第一次进入这个仓库，建议按下面顺序阅读:

1. 先看“当前产品边界”
2. 再看“当前首个落地用例”
3. 最后看“近期路线”和“文档计划”

## 当前定位

一句话：

SceneForge 用来把演出空间、装置场景和空间流程，做成可在网页中查看、预演和沟通的轻量工具。

## 不再承担什么

SceneForge 不再承担这些模糊定位：

- “沉浸式网页发布生态中台”
- “全场景内容母体”
- “技术平台总控层”

这些说法会让产品边界失焦。

## 当前产品边界

当前只聚焦四件事：

1. 场景查看
2. 舞台预演
3. cue / event-based 编排
4. 网页分享与协作预览

## 当前状态

截至 2026-03-16，SceneForge 仍处于产品定义收束与原型目标对齐阶段。

当前公开仓的主要作用是明确产品边界与推进方向，而不是假装已经完成一个庞大的平台。现阶段最重要的不是继续扩概念，而是先跑通一个真正可用的最小工作流。

这个最小工作流已经被收敛为：

- 载入一个实际项目场景
- 在网页中完成查看与预演
- 支持 event / cue 触发切换
- 能作为沟通和确认材料被快速分享

## 当前进展

最近沉淀下来的判断和进展主要有这些：

- 当前首个明确落地目标，是把“滴流”做成一个可查看、可切换版本的演出场景查看器
- 当前优先验证的是 `viewer` 逻辑，而不是完整控制台逻辑
- 当前先做 cue / event-based 触发，不优先回到复杂 timecode 体系
- PlayCanvas 仍然是网页端候选方案，但选择要服从交付速度，而不是服从概念完整性
- Unity 侧已经形成了一份很明确的两日最小交付约束，用来反推 SceneForge 真正需要承接的能力边界
- **AI 模块路线图**已建立，定位为分析层、识别层和辅助决策层；完整技术研究存于 [VIRTURA Research Laboratory](https://github.com/ewanqian/VIRTURA-SpacePort/blob/main/stations/research-laboratory/ai-live-performance/README.md)

## 当前首个落地用例

当前最具体、最值得优先推进的用例是：

**滴流演出场景查看器**

它不是一个抽象 Demo，而是一个非常具体的验证对象。这个用例要求 SceneForge 至少能承接下面这些需求：

- 一个统一的场景入口
- 至少两个版本内容的切换能力
- 基本镜头浏览或自动巡游
- 清晰的全屏、返回与退出路径
- 可用于演出前确认与远程沟通的轻量分享能力

如果这个用例都跑不通，后面再谈“产品平台化”意义不大。

如果你只是想判断这个仓库现在值不值得继续关注，这一节就是当前最重要的答案。

## 为什么是它

当前的主线判断已经很明确：

- 不再优先做重型独立软件
- 更偏网页端小实验
- 更偏舞台查看器与软件连接层
- 当前先做 cue / event-based，不先重做 timecode
- PlayCanvas 值得作为候选方案

因此，SceneForge 是最适合作为未来 2 到 4 周核心推进对象的仓库。

## How SceneForge Fits into the Ecosystem

SceneForge 不是整个 VIRTURA 公开系统的大脑，也不是公共前厅、研究档案或发布出口。  
它的角色更明确：它是产品主线中的一个工具仓，用来处理 scene viewing、stage preview、cue / event-based coordination 与轻量化的场景分享。

如果说：

- `portfolio` 负责作品与个人入口
- `VIRTURA-Collective` 负责团队入口
- `VIRTURA-SpacePort` 负责导览、档案与 stations
- `VIRTURA-Newsroom` 负责发布与复盘
- `RepoForge` 负责治理与自动化说明

那么 `SceneForge` 负责的，是**场景工具本身**。

它不替代整个系统，只承担产品层中最清楚、最可验证的部分。

SceneForge is not the brain of the entire VIRTURA public ecosystem.  
It is not the public front hall, not the research archive, and not the publishing layer.

Its role is more specific: it is the product line for scene viewing, stage preview, cue / event-based coordination, and lightweight scene sharing.

## 与其他仓库的关系

| 仓库 | 关系 |
|---|---|
| [VIRTURA-SpacePort](https://github.com/ewanqian/VIRTURA-SpacePort) | 团队公开入口与档案层，不承担产品主线 |
| [VIRTURA-SpacePort / Research Laboratory](https://github.com/ewanqian/VIRTURA-SpacePort/blob/main/stations/research-laboratory/ai-live-performance/README.md) | AI 实时演出研究层（SceneForge 引用） |
| [LiveForge](https://github.com/ewanqian/LiveForge) | 原有重复概念，后续内容将视情况并入这里 |
| [RepoForge](https://github.com/ewanqian/RepoForge) | 治理工具，不是产品功能层 |

## 接下来优先做什么

建议按最小路线推进：

1. 载入一个基础场景
2. 支持 event / cue 触发
3. 支持网页预览
4. 支持简单分享
5. 再决定是否扩展更重的控制能力

## 近期路线

按 2026 年 3 月中旬的判断，近期路线可以直接收敛为四步：

1. 用一个真实项目场景验证查看器入口
2. 跑通版本切换与 cue 触发
3. 输出一个可给团队和合作方观看的网页预览版本
4. 再决定是否继续往更重的编排、联动和控制能力推进

## 暂不优先做什么

当前明确不优先做这些方向：

- 不先做“大而全”的生态平台叙事
- 不先重建完整 timecode 中控体系
- 不先扩成重型独立软件
- 不在没有最小交付案例前，过早承诺多端全能发布

## 文档计划

这个仓库接下来至少还需要补三类文档：

- 一个面向首次访问者的产品概览
- 一个围绕"滴流演出场景查看器"的用例说明
- 一个最小技术路线文档，解释为什么当前先做 viewer、cue 和网页预览
- AI 模块路线图：[docs/ai-modules-roadmap.md](https://github.com/ewanqian/SceneForge/blob/main/docs/ai-modules-roadmap.md)（技术研究详见 [Research Laboratory](https://github.com/ewanqian/VIRTURA-SpacePort/blob/main/stations/research-laboratory/ai-live-performance/research/ai-modules-research.md)）

在这些文档补齐之前，README 先承担产品边界说明与阶段性进展入口。

## 开发原则

- 先做最小可用，不做空平台
- 先验证工作流，不先扩概念层
- 所有新增能力都要能落到实际演出或空间沟通场景
- 保持仓库边界清晰，不相互污染

## 开源协议

MIT
