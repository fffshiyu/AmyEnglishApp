# AmyEnglishApp

Amy老师英语打卡平台 —— 面向儿童的 AI 英语学习与打卡平台（PWA）。

## 功能

### 学生端
- 每日作业打卡（自动定位到今天的作业）
- TTS 句子朗读（有道 → 百度 → speechSynthesis 多源回退）
- 听力练习（每题自动播放 audio_text，可重听）
- 口语跟读与录音评分
- 分班实时同步（老师分班后约 15 秒内生效）

### 老师端
- 布置本周 / 下周每日作业（按模块：单词、句型、听力、阅读等）
- 打卡监控、完成率统计、口语记录查看
- 学生分班管理，云端实时同步

## 技术栈

- 纯前端 PWA（HTML + JS，无构建步骤）
- Service Worker 网络优先缓存策略（自动版本更新）
- 云端同步：textdb.dev（双存储互为备份）
- TTS：有道 / 百度语音 + Web Speech API

## 文件结构

```
index.html    主页面（学生端 + 老师端）
app.js        核心逻辑（渲染、TTS、同步、打卡）
data.js       作业数据（每日模块与题目）
cloud.js      云端同步（textdb.dev 双存储）
sw.js         Service Worker
manifest.json PWA 清单
server.js     本地预览服务器（可选）
desktop.html  桌面启动页
icon.svg      应用图标
```

## 本地运行

```bash
node server.js
# 打开 http://localhost:8765
```

或用任意静态服务器托管本目录即可。
