# 音频离线预分析系统

> 最小可用版本：离线预分析 + OSC 回放

---

## 设计原则

故意收窄：先做**离线预分析**和**OSC 回放**，不把 ComfyUI、生成画面、实时麦克风全塞进第一版。

## 目录结构

```
SceneForgeAudio/
  input/               ← 放待分析的音频文件（MP3/WAV）
  output/              ← 生成的 track_profile.json 和 stems
  analyze_track.py     ← 预分析脚本：生成 track_profile.json
  osc_bridge.py       ← 回放脚本：按时间发 OSC
  analyze_drums.py     ← 分轨后对 drums stem 做 kick/snare 检测
```

## 安装

```bash
conda create -n sceneforge-audio python=3.10 -y
conda activate sceneforge-audio

conda install -c conda-forge aubio librosa ffmpeg soundfile numpy scipy -y

pip install python-osc
pip install basic-pitch
pip install demucs
```

## 使用流程

### 第一步：生成 track_profile.json

```bash
python analyze_track.py input/track.mp3 --output output/track_profile.json
```

### 第二步：OSC 回放

```bash
python osc_bridge.py output/track_profile.json --ip 127.0.0.1 --port 9000
```

### 第三步（可选）：分轨并分析鼓组

```bash
demucs input/track.mp3 -o output/stems
```

然后对 `output/stems/htdemucs/track/drums.wav` 运行 `analyze_drums.py`：

```bash
python analyze_drums.py output/stems/htdemucs/track/drums.wav --output output/drums_profile.json
python osc_bridge_drums.py output/drums_profile.json --ip 127.0.0.1 --port 9001
```

## OSC 地址表（第一版）

```
/audio/time_sec     float   当前播放时间（秒）
/audio/bpm          float   曲目标记 BPM
/audio/rms          float   当前 RMS 能量（0-1）
/audio/energy/low  float   低频能量（0-1）
/audio/energy/mid  float   中频能量（0-1）
/audio/energy/high float   高频能量（0-1）
/audio/beat        float   节拍触发（1 = 触发，0 = 默认）
```

第二版（鼓组分轨）：

```
/drums/kick    float   kick 触发（1 = 触发）
/drums/snare   float   snare 触发（1 = 触发）
/drums/hihat   float   hi-hat 触发（1 = 触发）
```

## 接收端建议

| 宿主 | 可接收的内容 |
|---|---|
| Blender | 低频驱动缩放/震动、中频驱动几何变化 |
| openFrameworks | 跟拍闪动、beat 触发 |
| Pure Data / plugdata | 状态切换、参数调制 |
| SceneForge viewer | 视觉预设切换、镜头调度 |
| TouchDesigner | 综合音画映射 |

## ComfyUI 的定位

适合：
- 预演实验：读取 JSON / stems 测试音画关系
- 生成画面：接收 OSC 后做 AI 生成式视觉

不适合：
- 充当整套演出的核心分析中枢

## 技术选型说明

| 工具 | 用途 | 说明 |
|---|---|---|
| librosa | BPM / beat / onset / RMS / band energy | 离线预分析首选 |
| demucs | stems 分离 | 最稳的 kick/snare 方案：分轨再测 |
| aubio | 备用实时分析 | conda-forge 预编译，Windows 最顺 |
| python-osc | OSC 发送 | 纯 Python，无外部依赖 |
| madmom | downbeat/bar（第二步） | 依赖 cython，第二步再加 |

## 相关文档

- [AI 模块路线图](../../docs/ai-modules-roadmap.md)
- [AI 研究报告（Research Laboratory）](https://github.com/ewanqian/VIRTURA-SpacePort/blob/main/stations/research-laboratory/ai-live-performance/research/ai-modules-research.md)
