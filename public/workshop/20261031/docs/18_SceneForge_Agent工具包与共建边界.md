# SceneForge：Agent 屏幕工具包

核对日期：2026-10-31。仓库：[github.com/ewanqian/SceneForge](https://github.com/ewanqian/SceneForge)。本地 `origin` 即此地址，已用 `git ls-remote origin HEAD` 确认远端可达；本轮课堂改动尚未由本说明声明已推送。

## 现在可以用什么

| 层次 | 已有能力 | 不能据此推断 |
|---|---|---|
| 课堂页 `?classroom=1` | 双场地、观看机位、三段Cue、单主屏尺寸、画面适配/翻转、V1/V2、独立四角输出 | 不是任意多屏三维编辑器 |
| 空间页 `?lab=1` | 固定几何预设、观看位置、连续/重复内容、文件/摄像头/程序窗口输入、V1/V2 | 不是全场硬件mapping或多机同步 |
| 浏览器Agent API | 读取、校验并写入配置；实验室可读媒体状态并停止媒体 | 不能绕过屏幕/摄像头选择授权，不能把JSON当视频文件 |
| Package v1 | 米制、坐标系、屏幕、机位、资产、Cue、质量档的严格数据契约与校验器 | 当前课堂/实验室配置不能直接换成Package JSON |
| RuntimeAdapter | 加载场景、选机位、应用Cue、绑定媒体面的TypeScript边界 | R3F参考适配器委托注入的port，不代表通用导入界面已完成 |

## 课堂演示：把正在运行的画面放进固定屏幕

1. 先打开要展示的网页/Processing/其他实时视觉程序，让它确实运行。
2. 打开 `?lab=1`，选屏幕预设。几何位置保持固定；接下来改变的是媒体来源与观看位置。
3. 点击“分享程序窗口”，在系统选择器中亲自选择那个窗口。避免选择本实验室窗口造成递归。
4. 回到原程序操作参数，再回实验室观察屏幕纹理是否更新。
5. 比较中心、侧面与总览。连续跨屏与每屏重复是不同的内容分配方式。
6. 点击停止输入，确认流已释放；文件视频可作为不依赖实时授权的独立演示方式。

这是本机捕获并作为纹理显示，不是网页直接读取其他应用内部的GPU纹理，不是跨设备WebRTC广播。浏览器权限、受保护内容和捕获可用性由实际系统决定。

## Agent：读状态，再做一项可检查的改动

以下代码运行于已打开实验室页面的浏览器上下文。`setState` 接收完整配置，不是任意的局部补丁。

```js
const api = window.sceneForgeLab;
if (!api) throw new Error('先打开 ?lab=1');
const before = api.getState();
const after = api.setState({ ...before, viewId: 'side', gridOverlay: true });
console.log(after, api.getMediaState());
// 复查实际画面；需要撤销时：
// api.setState(before);
// 结束实时输入：api.stopMedia();
```

课堂页的API不同：

```js
const api = window.sceneForgeClassroom;
if (!api) throw new Error('先打开 ?classroom=1');
const before = api.getState();
api.setState({ ...before, mapping: { ...before.mapping, fit: 'contain' } });
```

`getState()` 返回克隆；非法字段/值会被拒绝。以 `src/domain/lab-config.ts` 与 `src/domain/classroom-config.ts` 为准。新增预设会扩展实验室枚举，Agent应先读当前源码或页面选项，不把旧枚举硬编码成永远有效。

## 怎么描述一块固定屏幕

先区分三件事：物理/虚拟表面的几何；画面到表面的对应；输出设备的校准。移动观众不能冒充改变屏幕几何。

- 给每块屏幕稳定 `id` 和名字。记录实际来源，教学假设不能标成实测场地。
- 单位用米；右手坐标、Y向上、-Z为前。旋转为XYZ欧拉弧度，机位FOV用度。
- 平面记录宽高、位置、旋转。六面拼接是六个面，不是一个带“六边形”名字的普通平面。
- 曲面另记半径/弧长/角度和朝向。`curvature` 是归一化契约字段，不应拿它替代精确测量。
- UV决定源图的哪一块落在表面哪里。连续跨屏要明确各面分片；重复播放给每面完整0—1。
- 顶屏/地屏还要核对正反面、画面上下方向、与主屏的接缝。
- 至少定义正面观众、明显偏侧观众、空间总览。总览是制作视图，不是所有真实观众都能站到的位置。
- 记录内容画布分辨率、帧率、时长、方向与素材路径。媒体文件需要单独随工程带走。

当前几何实现位置：`src/lab/LabScene.tsx`；预设说明：`src/data/spatial-lab.ts`；画布绘制：`src/lab/lab-painter.ts`。新增任意屏幕布局需要修改这些源代码与schema，或实现将Package接到运行时的独立功能。仅向课堂JSON加一个`screens`数组不会生效。

## Blender 环节怎样衔接

用同一个问题比较网页草稿与Blender工程：屏幕位置、人物比例、观察机位、UV。展示屏幕对象与UV展开，说明何时需要实际建模/精细几何。导出GLB时使用米制、应用缩放、保留材质槽名并核对坐标转换。已有Package v1可记录资产引用，但课堂页面目前不提供“任意GLB一键变可播放屏幕”的完整导入流程。

## 屏幕网络：已具备基础，上传站仍是计划

可以这样向参与者说：

> 我想把这些场景继续做成一个可以共建的库。你有真实项目的屏幕规格、特别的观看关系，或者已经消失的演出空间，都可以给它起一个名字。未来希望每个场景有自己的页面，别人能理解它、放入内容，再继续发展。

现在已有：版本化Package schema、屏幕/机位/资产ID、扩展命名空间、导出配置与本地预览。当前没有：公开项目接收地址、上传表单/服务、账号权限、审核、持久化资产托管、每项目独立站点自动生成、多人在线同步。不能把仓库地址称为已上线的上传窗口。

共建第一批场景时可先按以下目录交付，经人工审查后入库，不必先承诺平台：

```text
my-stage/
  README.md                    # 名字、来源、作者、日期、实测/估计、用途
  sceneforge.package.json      # 遵循Package v1；不是lab配置
  assets/models/stage.glb      # 可选；核对UV与材质槽
  assets/posters/overview.jpg  # 自制示意或有权提供的图片
  assets/metadata/screen-notes.md  # 每面编号、像素、尺寸、朝向、接缝、未知项
```

建议接收前逐项确认：来源与使用范围、尺寸可信度、UV是否对应、素材可移植性、低配可运行性、至少两个有效机位。对真实舞台生产参数仍需现场人员复核，预演不替代工程验收。

## 验收与边界

源代码验证：`npm run verify`。媒体演示还需用真实浏览器手动选择输入；模型输出“完成”、schema通过和渲染截图，都不能替代这一授权路径的实测。NDI只定义了本地桥接契约，浏览器不能直接枚举NDI设备。
