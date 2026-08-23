---
name: ui-standard
description: Use when changing any UI in this project — editing index.html styles, writing render functions in app.js, adding a page, tab, card, table, button, badge, or icon. Also use when the result looks generic, "AI-made", childish, or when colors, spacing, or page width look inconsistent.
---

# Amy 英语打卡 · UI 规范

参照 Apple Human Interface Guidelines。目标：**克制、统一、高级**。

核心原则：**减少视觉变量的数量。** 界面显得廉价，通常不是因为缺少装饰，而是因为同时存在太多颜色、太多图形语言、太多容器宽度。

---

## 三条硬规则

1. **不出现 Emoji。** 用图标。
2. **只有三种颜色**：橘黄、黑、白。加上一个中性灰阶。
3. **每一条横向区块共用同一个内容容器宽度。** 背景可以通栏，内容不可以。

违反这三条中的任何一条，改动即为不合格，不看其他部分。

---

## 1. 颜色

### 令牌（唯一允许的调色板）

```css
:root{
  /* 品牌 —— 单一色相，只靠明度分层 */
  --orange:        #F07000;   /* 主色：行动、选中、强调 */
  --orange-press:  #C25A00;   /* 按下 / hover */
  --orange-wash:   #FFF4EA;   /* 极浅底色，仅作背景 */

  /* 中性 —— 承担 90% 的界面 */
  --ink:           #17171A;   /* 主文字、标题 */
  --ink-2:         #5B5B63;   /* 次要文字 */
  --ink-3:         #8E8E97;   /* 提示、占位符、禁用 */
  --line:          #E6E6EA;   /* 分隔线、描边 */
  --surface:       #FFFFFF;   /* 卡片 */
  --canvas:        #FAFAFA;   /* 页面底 */

  /* 唯一的语义色例外 */
  --red:           #D6321F;   /* 仅用于：删除确认、答错 */
}
```

### 规则

- **不得新增色相。** 没有粉、青、蓝、绿、黄。
- 状态**不靠颜色区分**，靠**字重、明度、图标**区分。
  - 正确 → ink + ✓ 图标；错误 → red + ✕ 图标。仅此两种。
  - 已完成 / 进行中 / 未开始 → 实心橘点 / 描边橘点 / 空心灰点。
- 橘色是**稀缺资源**。一屏之内承载主要行动的橘色块不超过一处。表格里整列橘色 badge 是错的。
- 正文永远是 `--ink`，不是橘色。橘色标题只用于页面级 H1/H2。

### 要替换掉的（现状）

`--accent`(粉) `--teal`(青) `--success`(绿) `--warning`(黄) `--info`(蓝) 及其 `-light` 变体，全部删除。现有 8 组色系收敛到上面这一组。

---

## 2. 图标

**全站禁止 Emoji。** 当前 `app.js` 有 171 处、`index.html` 有 6 处，需逐步替换。

### 做法

在 `index.html` 底部放一个内联 SVG sprite，用 `<use>` 引用：

```html
<svg style="display:none" aria-hidden="true">
  <symbol id="i-home" viewBox="0 0 24 24">
    <path d="M3 10.5 12 3l9 7.5V21H3z" fill="none"
          stroke="currentColor" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round"/>
  </symbol>
  <!-- ... -->
</svg>
```

```html
<svg class="icon"><use href="#i-home"/></svg>
```

```css
.icon{width:20px;height:20px;display:inline-block;vertical-align:-4px;
      color:currentColor;flex:none}
.icon-lg{width:24px;height:24px}
```

### 图标规格

| 项 | 值 |
|---|---|
| 画布 | 24×24 |
| 线宽 | 1.5px（统一，不混用） |
| 端点/拐角 | `round` |
| 填充 | 一律 `none`，只用描边 |
| 颜色 | `currentColor`，永不写死 |
| 显示尺寸 | 20px（正文行内）/ 24px（导航、卡头） |

**只用单色线性图标。** 不用多色、不用面性、不用带背景圆底的图标。

### Emoji → 图标对照

| 现有 | 语义 | 图标 id |
|---|---|---|
| 📝 今日作业 | 作业 | `i-doc` |
| 📊 打卡 / 监控 | 数据 | `i-chart` |
| 🏆 完成率对比 | 排名 | `i-trophy`（线性奖杯） |
| ❌ 错题 | 错误 | `i-close` |
| 📋 周计划 | 列表 | `i-list` |
| 📅 每日详情 | 日期 | `i-calendar` |
| ✏️ 作业编辑 | 编辑 | `i-pencil` |
| 📈 成绩分析 | 趋势 | `i-trend` |
| 🖨️ 打印 | 打印 | `i-printer` |
| 🎤 口语记录 | 录音 | `i-mic` |
| 👥 学生管理 | 用户 | `i-users` |
| 🏫 班级管理 | 班级 | `i-layers` |
| 🔊 听发音 / 重新听 | 播放音频 | `i-sound` |
| ✅ 正确 | 通过 | `i-check` |
| 📖 📄 阅读材料 | 文本 | `i-text` |
| 🎮 词汇游戏 | 词汇 | `i-cards` |
| 🔗 完形填空 | 填空 | `i-blank` |

---

## 3. 布局与容器

### 当前的问题

`index.html` 里 header 和 `.tab-bar` 是通栏，而 `.content-area` 是 `max-width:1200px;margin:0 auto`。宽屏下导航一路顶到边、内容却居中收窄 —— 这就是「两侧不明留白」的来源。

### 规则

**背景通栏，内容对齐。** 每一条横向区块（header / tab-bar / content）内部都套同一个容器：

```css
:root{ --container: 1080px; --gutter: 24px; }

.bleed{ width:100%; }                       /* 背景铺满 */
.container{                                  /* 内容对齐 */
  max-width: var(--container);
  margin-inline: auto;
  padding-inline: var(--gutter);
}
```

```html
<header class="app-header bleed">
  <div class="container header-inner"> ... </div>
</header>
<nav class="tab-bar bleed">
  <div class="container tab-inner"> ... </div>
</nav>
<main class="content-area">
  <div class="container"> ... </div>
</main>
```

- header 的**底色**通栏，其中的 logo 与按钮和正文左右对齐。
- tab-bar 的**底边线**通栏，其中的标签和正文左右对齐。
- 三者的左边缘必须在同一条垂直线上。改完在 1440px 宽度下截图检查这条线。

### 断点

| 宽度 | 处理 |
|---|---|
| ≥1080px | 容器定宽 1080，两侧留白是**有意**的对称留白 |
| 768–1080px | 容器流动，`--gutter: 24px` |
| <768px | `--gutter: 16px`，tab-bar 横向滚动 |

---

## 4. 排版

```css
--font: -apple-system, BlinkMacSystemFont, "SF Pro Text",
        "PingFang SC", "Microsoft YaHei", sans-serif;
```

| 角色 | 字号 | 字重 | 字距 |
|---|---|---|---|
| 页面标题 | 24px | 600 | -0.02em |
| 区块标题 | 17px | 600 | -0.01em |
| 正文 | 15px | 400 | 0 |
| 次要 / 表格 | 13px | 400 | 0 |
| 标注 | 12px | 400 | 0 |

- 字重只用 **400 / 500 / 600**。不用 700 及以上。
- 字号越大字距越紧（Apple 的光学补偿），小字不加负字距。
- 行高：正文 1.6，标题 1.25。
- **不用纯黑做大面积文字**，用 `--ink` (#17171A)。

---

## 5. 渐变

允许，但**只允许中心/径向渐变**，且只作氛围底，不作控件填充。

```css
/* 页面氛围底 —— 极低对比 */
body{
  background:
    radial-gradient(120% 80% at 50% 0%,
      var(--orange-wash) 0%, var(--canvas) 55%)
    no-repeat, var(--canvas);
}
```

```css
/* 允许：卡片顶部的一层极淡中心光 */
.hero{
  background: radial-gradient(80% 120% at 50% 0%,
    rgba(240,112,0,.08), transparent 70%);
}
```

**禁止**：
- 线性渐变按钮（`linear-gradient(135deg,#FF8C42,#FF6B35)` 这类，现有 header 和 tab 按钮都要改成实色）
- 双色相渐变（橘→粉、橘→红）
- 渐变文字
- 任何超过 12% 不透明度的装饰渐变

判断标准：渐变应当**察觉不到是渐变**，只让人觉得那块区域"透气"。

---

## 6. 层级与描边

Apple 的做法是**少用阴影，多用发丝线**。

```css
--radius:   12px;   /* 卡片、输入框、模态 */
--radius-s:  8px;   /* 按钮、badge、小控件 */
--radius-pill: 999px; /* 仅用于 tab 选中态和头像 */

--shadow-1: 0 1px 2px rgba(0,0,0,.04);
--shadow-2: 0 4px 16px rgba(0,0,0,.06);   /* 仅浮层：模态、toast、下拉 */
```

- 卡片：`background:var(--surface); border:1px solid var(--line);` **不带阴影**。
- 只有**浮在页面之上**的东西才有阴影（模态、toast）。
- 阴影一律中性黑，**不带橘色色调**（现有 `rgba(255,140,66,.12)` 要去掉）。
- 圆角只用上面三档，不再出现 14/20/24 等散值。

---

## 7. 间距

4px 基数栅格，只用这些值：

```
4  8  12  16  24  32  48
```

- 卡片内边距 `20px`（窄屏 `16px`）
- 卡片之间 `12px`
- 区块之间 `32px`
- 图标与相邻文字 `8px`

---

## 8. 控件

**按钮**

| 类型 | 样式 |
|---|---|
| 主要 | 实心 `--orange`，白字，`--radius-s`，高 44px |
| 次要 | 白底，`1px solid var(--line)`，`--ink` 字 |
| 文字型 | 无底无框，`--orange` 字 |
| 危险 | 实心 `--red`，白字，仅用于删除 |

一个视图内**只有一个主要按钮**。

**表格**

- 无竖线，行间只用 `1px solid var(--line)`。
- 表头：13px / 500 / `--ink-2`，无底色（去掉现有的橘色表头底）。
- 数字列右对齐并用等宽数字：`font-variant-numeric: tabular-nums`。

**状态点**（打卡监控）

```
已完成  ●  实心 --orange
进行中  ◐  描边 --orange
未开始  ○  描边 --line
```

**空状态**

图标（32px，`--ink-3`）+ 一行说明（13px，`--ink-2`）。不用插画、不用感叹号、不用鼓励语。

**触控目标**：任何可点区域最小 44×44px。

---

## 9. 动效

```css
--ease: cubic-bezier(.4, 0, .2, 1);
--fast: .18s;  --base: .24s;
```

只对 `opacity` 和 `transform` 做动画。不做颜色补间、不做弹跳、不做旋转。尊重 `prefers-reduced-motion`。

---

## 改动前自查

- [ ] 没有新增 Emoji；碰到的 Emoji 已换成 `<svg class="icon">`
- [ ] 没有引入调色板之外的颜色值（搜一遍 `#`，只应命中令牌定义处）
- [ ] 新增区块套了 `.container`，左边缘与 header、正文对齐
- [ ] 圆角、间距取自既定档位，没有散值
- [ ] 渐变是径向且不透明度 ≤12%
- [ ] 卡片用描边不用阴影
- [ ] 该视图只有一个主要按钮
- [ ] 1440px 与 375px 两个宽度各截一张图看过

---

## 常见错误

| 做法 | 为什么错 | 改成 |
|---|---|---|
| 用绿/黄/红三色表示成绩档位 | 引入三个色相，页面立刻变廉价 | 统一 `--ink`，只有不及格用 `--red` |
| 给 badge 都加浅色底 | 满屏色块，层级消失 | 只用文字 + 字重，必要时加描边 |
| 用 Emoji 当图标"先顶上" | 会留在代码里 | 缺图标就先用 `i-dot` 占位，别用 Emoji |
| header 通栏、内容居中 | 左边缘错位，这是"AI 感"的主要来源 | 两者都套 `.container` |
| 线性渐变按钮 | 2018 年的审美 | 实色 `--orange` |
| 卡片阴影 + 描边 + 圆角一起上 | 三重强调，显得浮 | 只用描边 |
| 文字用 700/800 字重 | 中文粗体在小字号下糊 | 最高 600 |

---

## 落地顺序

改造量大，按这个顺序推进，每步都能单独验收：

1. **令牌层**：替换 `:root` 调色板，删掉 5 组多余色相 —— 一次性、影响全局
2. **容器层**：引入 `.container`，修 header / tab-bar / content 的对齐
3. **图标层**：建 SVG sprite，先换导航 12 个，再换正文
4. **控件层**：按钮、表格、badge、状态点
5. **氛围层**：径向渐变底、阴影改描边

---

*本文档是规范，不是一次性任务。任何触及 UI 的改动都按此执行。*
