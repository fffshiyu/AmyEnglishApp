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
public/           发布内容——只有这个目录会上公网
  index.html      主页面（学生端 + 老师端）
  app.js          核心逻辑（渲染、TTS、打卡、跟读）
  api.js          存储与后端接缝（localStorage / IndexedDB / Worker）
  recorder.js     麦克风采集，直出 16kHz 单声道 WAV
  data.js         作业数据（每日模块与题目）
  cloud.js        云端同步（textdb.dev，待迁 D1）
  sw.js           Service Worker
  manifest.json   PWA 清单
worker/           Cloudflare Worker：/api/* 与静态资源托管
  src/index.js    Workers AI Whisper 转写接口
  wrangler.jsonc  部署配置
desktop.html      桌面启动页（不发布）
```

## 本地运行

```bash
cd public && python3 -m http.server 8765
# 打开 http://localhost:8765
```

本地不带 /api/*，跟读会走「识别不可用 → 自评」这条降级路径，
录音与打卡照常工作。要联调识别用 `cd worker && npx wrangler dev`。

## 部署

```bash
export CLOUDFLARE_API_TOKEN=...   # 权限：Workers Scripts 编辑 + Workers AI 编辑
cd worker && npx wrangler deploy
```

页面与 /api/* 同源发布在 amyeng.top，一次部署。
注意 *.workers.dev 在大陆是 DNS 污染状态，只能用自有域名。
