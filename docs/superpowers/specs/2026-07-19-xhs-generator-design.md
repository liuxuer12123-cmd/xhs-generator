# 小红书图文帖子生成器 — 设计文档

**日期：** 2026-07-19  
**状态：** 已确认，待实现

---

## 1. 产品目标

构建一个网站，让用户输入主题和内容，选择图文模板，通过大模型自动生成小红书风格的图文卡片（HTML/CSS 信息图）、多个备选标题、以及正文。用户可对每个输出区块进行修改建议后重新优化，最终导出图片。

---

## 2. 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Next.js 14（App Router） |
| 样式 | Tailwind CSS |
| 数据库 | SQLite + Prisma ORM |
| 认证 | NextAuth.js（Credentials Provider，邮箱+密码） |
| 图片导出 | html2canvas |
| 部署 | PM2 + Nginx，腾讯云 `124.220.46.239` |

---

## 3. 页面结构

### 3.1 整体布局

```
顶部导航栏
  └── Logo/产品名  ·  历史记录入口  ·  用户头像/登录状态  ·  ⚙️ 设置图标

主页面（单页）
  ├── 配置栏（顶部）
  └── 结果区（生成后展开，初始隐藏）
```

### 3.2 配置栏

```
[帖子主题 文本输入框]  [补充内容 文本区域（可选）]

[图文模板 横向图片缩略图选择区]

                                        [✨ 生成帖子 按钮]
```

字段说明：
- **帖子主题**：必填，单行文本，如「木瓜牛奶燕麦奶昔做法」
- **补充内容**：选填，多行文本，补充关键信息/卖点/注意事项
- **图文模板**：横向滚动缩略图，每张为用户上传的模板主图，点选高亮（红色边框），一次只能选一个

### 3.3 图文模板（4 种）

| 模板ID | 名称 | 风格描述（用于 prompt） |
|--------|------|----------------------|
| `template-recipe` | 清新食谱风 | 暖橙米白背景，左大图右清单，自然手作感，柔和圆角，适合食谱、DIY 类内容 |
| `template-collection` | 干货合集风 | 棕黄暖色背景，大粗体标题+数字编号，宫格卡片排列，信息密度高，适合合集、攻略类内容 |
| `template-science` | 科普知识风 | 浅绿背景，红蓝双色大字标题，橙色填充圆角标签做条目，适合科普、知识类内容 |
| `template-diary` | 日记分享风 | 米黄系背景，超大字竖排标题，emoji 点缀，tag 胶囊，温馨告白风，适合个人经历分享 |

### 3.4 结果区

三个独立区块，竖向排列：

#### 3.4.1 图文卡片区
- 展示 LLM 生成的 HTML/CSS 信息图（iframe 渲染，小红书标准比例 3:4）
- **「优化建议」输入框**：用户输入修改意见（如「换成绿色主题」「加一个步骤」）
- **「优化」按钮**：携带原图 HTML + 修改建议重新生成
- **「📥 导出图片」按钮**：使用 html2canvas 将卡片截图为 PNG 下载

#### 3.4.2 标题区
- 展示 3-5 个备选标题，每个标题为可点击卡片，点选后高亮标记为「已选」
- **「修改建议」输入框**：输入意见（如「更有吸引力一些」「加 emoji」）
- **「重新生成」按钮**：重新生成一组标题

#### 3.4.3 正文区
- 展示生成的正文内容（富文本展示）
- **「修改建议」输入框**：输入意见（如「更口语化」「加上具体步骤」）
- **「优化」按钮**：携带原正文 + 修改建议重新生成

---

## 4. 大模型配置

### 4.1 默认模型
- **Provider：** DeepSeek
- **Base URL：** `https://api.deepseek.com`
- **Model：** `deepseek-chat`
- **API Key：** 存储在服务器 `.env` 文件（`DEEPSEEK_API_KEY`），**不暴露给前端**
- 用户未配置时自动使用默认模型，开箱即用

### 4.2 用户自定义配置
- 入口：右上角 ⚙️ 图标 → Modal 弹窗
- 字段：`Base URL` + `API Key` + `Model Name`
- 存储：写入数据库，与账号绑定，优先级高于默认配置
- **首次使用引导**：检测到用户未设置自定义配置时，主页面顶部显示引导横幅，点击跳转设置 Modal（可关闭，关闭后继续使用默认模型）

---

## 5. 用户认证

- **方式：** 邮箱 + 密码（NextAuth.js Credentials Provider）
- **注册：** 邮箱 + 密码，bcrypt 加密存储
- **登录：** 邮箱 + 密码，返回 session
- **未登录状态：** 可使用生成功能，但历史记录不保存，顶部提示登录

---

## 6. 历史记录

- **存储：** 数据库 `generations` 表，字段：id、userId、主题、补充内容、模板ID、图文HTML、标题列表（JSON）、正文、创建时间
- **入口：** 顶部导航栏「历史记录」→ 侧边抽屉或独立页面，展示时间线列表
- **操作：** 点击历史条目可重新载入至主编辑区继续编辑；支持删除

---

## 7. 数据模型（Prisma Schema）

```prisma
model User {
  id           String       @id @default(cuid())
  email        String       @unique
  password     String
  llmConfig    LlmConfig?
  generations  Generation[]
  createdAt    DateTime     @default(now())
}

model LlmConfig {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id])
  baseUrl   String
  apiKey    String
  modelName String
  updatedAt DateTime @updatedAt
}

model Generation {
  id          String   @id @default(cuid())
  userId      String?
  user        User?    @relation(fields: [userId], references: [id])
  topic       String
  extraContent String?
  templateId  String
  cardHtml    String
  titles      String   // JSON array
  body        String
  createdAt   DateTime @default(now())
}
```

---

## 8. API Routes（Next.js）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/[...nextauth]` | NextAuth 登录/登出 |
| POST | `/api/generate` | 调用 LLM 生成图文/标题/正文 |
| POST | `/api/generate/optimize-card` | 优化图文卡片 |
| POST | `/api/generate/optimize-body` | 优化正文 |
| POST | `/api/generate/regenerate-titles` | 重新生成标题 |
| GET  | `/api/history` | 获取历史记录列表 |
| GET  | `/api/history/:id` | 获取单条历史 |
| DELETE | `/api/history/:id` | 删除历史记录 |
| GET  | `/api/settings/llm` | 获取 LLM 配置 |
| PUT  | `/api/settings/llm` | 保存 LLM 配置 |

---

## 9. LLM Prompt 设计

### 9.1 主生成 Prompt（图文卡片）

```
你是一个小红书图文内容创作专家。
根据以下信息，生成一张符合指定模板风格的小红书信息图卡片（HTML/CSS）。

主题：{topic}
补充内容：{extraContent}
模板风格：{templateDescription}

要求：
- 输出完整的 HTML+CSS（内联样式），宽度 375px，符合小红书 3:4 竖版比例
- 严格遵循模板风格描述（颜色、布局、字体风格）
- 内容精准、视觉美观，适合截图直接发布
- 只输出 HTML 代码，不要任何解释文字
```

### 9.2 标题生成 Prompt

```
你是小红书爆款标题专家。
根据主题「{topic}」，生成 5 个吸引人的小红书标题。
要求：每个标题控制在 20 字以内，带emoji，风格活泼，突出价值点。
以 JSON 数组格式输出：["标题1","标题2","标题3","标题4","标题5"]
```

### 9.3 正文生成 Prompt

```
你是小红书正文写作专家。
根据主题「{topic}」和补充内容「{extraContent}」，生成一篇小红书正文。
要求：口语化、有温度、500字以内、适当使用emoji分段、结尾引导互动。
```

---

## 10. 部署方案

```
腾讯云 Ubuntu（124.220.46.239）
├── Nginx（80/443 端口，反向代理到 3000）
├── PM2 管理 Next.js 进程（端口 3000）
├── SQLite 数据库文件（/app/data/db.sqlite）
└── .env（DEEPSEEK_API_KEY, NEXTAUTH_SECRET 等）
```

部署步骤概要：
1. `git clone` 项目到服务器
2. `npm install && npx prisma migrate deploy`
3. `npm run build`
4. `pm2 start npm --name xhs-gen -- start`
5. Nginx 配置反向代理

---

## 11. 模板图片资源

以下 4 张图片需存储在 `public/templates/` 目录：

| 文件名 | 对应模板 |
|--------|---------|
| `template-recipe.jpg` | 清新食谱风（暖橙米白，奶昔食谱图） |
| `template-collection.jpg` | 干货合集风（棕黄，6款焖饭合集图） |
| `template-science.jpg` | 科普知识风（浅绿，不升糖水果科普图） |
| `template-diary.jpg` | 日记分享风（米黄，阑尾炎治疗日记图） |
