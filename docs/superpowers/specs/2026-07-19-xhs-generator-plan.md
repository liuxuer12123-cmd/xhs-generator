# 小红书图文帖子生成器 — 实现计划

**设计文档：** `docs/superpowers/specs/2026-07-19-xhs-generator-design.md`  
**项目目录：** `/Users/liuxinyi18/.codeflicker/workshop/twyn5weozaemltb8il9b-xhs-generator`  
**部署目标：** 腾讯云 `124.220.46.239`，PM2 + Nginx

---

## Phase 0: 项目脚手架与基础配置

**目标：** 初始化 Next.js 项目，配置 Tailwind、Prisma、NextAuth，建立目录结构。

### 任务清单

1. 在项目目录下创建 Next.js 14 应用（App Router）
   ```bash
   npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
   ```

2. 安装依赖
   ```bash
   npm install prisma @prisma/client next-auth bcryptjs html2canvas
   npm install -D @types/bcryptjs
   npx prisma init --datasource-provider sqlite
   ```

3. 配置 Prisma Schema（`prisma/schema.prisma`），包含 User、LlmConfig、Generation 三张表（见设计文档第 7 节）

4. 创建 `.env.local`，填入：
   ```
   DATABASE_URL="file:./data/db.sqlite"
   NEXTAUTH_SECRET="<随机字符串>"
   NEXTAUTH_URL="http://localhost:3000"
   DEEPSEEK_API_KEY="sk-your-deepseek-api-key-here"
   DEEPSEEK_BASE_URL="https://api.deepseek.com"
   DEEPSEEK_MODEL="deepseek-chat"
   ```

5. 执行初始迁移
   ```bash
   npx prisma migrate dev --name init
   ```

6. 把 4 张模板图存入 `public/templates/`：
   - `template-recipe.jpg`（清新食谱风）
   - `template-collection.jpg`（干货合集风）
   - `template-science.jpg`（科普知识风）
   - `template-diary.jpg`（日记分享风）

### 验证
- `npx prisma studio` 能打开且三张表存在
- `npm run dev` 能正常启动，访问 `localhost:3000` 无报错

---

## Phase 1: 认证系统（注册 / 登录 / Session）

**目标：** 实现邮箱+密码注册登录，NextAuth Credentials Provider。

### 任务清单

1. 创建 `app/api/auth/register/route.ts`
   - POST 接收 `{email, password}`
   - bcrypt hash 密码，写入 User 表
   - 返回 201 或错误

2. 创建 `app/api/auth/[...nextauth]/route.ts`
   - Credentials Provider：查 User 表，bcrypt compare 密码
   - session strategy: "jwt"
   - 在 session 回调中携带 `userId`

3. 创建 `lib/auth.ts` 导出 `authOptions`（供服务端组件 `getServerSession` 使用）

4. 实现登录/注册页面 `app/(auth)/login/page.tsx` 和 `app/(auth)/register/page.tsx`
   - 简洁表单，Tailwind 样式
   - 登录成功跳转首页，注册成功跳转登录页

5. 在顶部导航栏显示登录状态：已登录显示头像+邮箱首字母，未登录显示「登录」按钮

### 验证
- 注册一个账号，能在 Prisma Studio 看到 User 记录
- 用该账号登录，`getServerSession` 能获取到 userId

---

## Phase 2: 主页面 UI（配置栏 + 结果区骨架）

**目标：** 实现主页面的完整 UI 结构，包含配置栏和结果区骨架（无 LLM 调用）。

### 任务清单

1. 实现顶部导航栏组件 `components/Navbar.tsx`
   - Logo（产品名：「小书匠」或类似）
   - 历史记录入口（图标按钮）
   - 用户状态区域
   - ⚙️ 设置图标（点击触发 LLM 配置 Modal）

2. 实现配置栏组件 `components/ConfigBar.tsx`
   - 帖子主题输入框（必填）
   - 补充内容文本区域（选填，可折叠/展开）
   - 模板选择区：横向滚动缩略图，读取 `public/templates/` 下 4 张图
   - 点选高亮（红色边框），记录 `selectedTemplate` 状态
   - 「✨ 生成帖子」按钮（loading 状态支持）

3. 实现结果区骨架 `components/ResultArea.tsx`
   - 默认隐藏，生成后展开
   - 三个子区块：`CardSection`、`TitlesSection`、`BodySection`
   - 每个区块包含：内容展示区 + 修改建议输入框 + 操作按钮

4. 首次使用引导横幅 `components/SetupBanner.tsx`
   - 检测用户是否已配置自定义 LLM（或 session 存在），无配置时显示顶部黄色横幅
   - 点击「立即配置」触发设置 Modal，点击 ✕ 关闭

5. LLM 配置 Modal `components/LlmConfigModal.tsx`
   - 三个字段：Base URL、API Key、Model Name
   - 保存后写入 `/api/settings/llm`
   - 首次进入时如果无 session 也允许临时本地存储（localStorage）

### 验证
- 主页面各组件正常渲染，无控制台错误
- 模板缩略图点选高亮状态正常切换
- Modal 打开/关闭流畅

---

## Phase 3: LLM 生成 API

**目标：** 实现调用大模型的后端 API Routes，生成图文卡片 HTML、标题列表、正文。

### 任务清单

1. 创建 `lib/llm.ts`：封装 OpenAI 兼容 fetch 调用
   - 优先使用用户数据库中的 LlmConfig，否则 fallback 到 `.env` 默认 DeepSeek 配置
   - 支持传入 `userId` 查询用户配置

2. 创建 `lib/templates.ts`：维护 4 个模板的风格描述（用于 prompt）
   ```ts
   export const TEMPLATES = {
     'template-recipe': { name: '清新食谱风', description: '...' },
     'template-collection': { name: '干货合集风', description: '...' },
     'template-science': { name: '科普知识风', description: '...' },
     'template-diary': { name: '日记分享风', description: '...' },
   }
   ```

3. 实现 `app/api/generate/route.ts`（POST）
   - 接收 `{topic, extraContent, templateId, userId?}`
   - 并行调用 LLM 3 次：图文卡片 HTML + 标题数组 + 正文
   - 如用户已登录，将结果写入 Generation 表
   - 返回 `{cardHtml, titles, body}`

4. 实现 `app/api/generate/optimize-card/route.ts`（POST）
   - 接收 `{originalHtml, suggestion, templateId}`
   - 携带原 HTML 和修改建议重新生成图文卡片

5. 实现 `app/api/generate/optimize-body/route.ts`（POST）
   - 接收 `{originalBody, suggestion, topic}`
   - 优化正文

6. 实现 `app/api/generate/regenerate-titles/route.ts`（POST）
   - 接收 `{topic, suggestion?}`
   - 重新生成 5 个标题

7. 实现 LLM 配置 CRUD：
   - `app/api/settings/llm/route.ts`（GET + PUT）

### Prompt 模板（参考设计文档第 9 节）
- 图文卡片：输出纯 HTML+CSS，375px 宽，3:4 比例，内联样式
- 标题：输出 JSON 数组 `["标题1",...]`
- 正文：口语化，500字内，带emoji

### 验证
- 用 curl 或 Postman 调用 `/api/generate`，能返回合法的 `{cardHtml, titles, body}`
- `cardHtml` 为有效 HTML，能在浏览器渲染

---

## Phase 4: 前端生成流程对接

**目标：** 打通前端与 API，实现完整生成、展示、优化交互。

### 任务清单

1. 在主页面 `app/page.tsx` 中实现生成流程
   - 点击「生成帖子」→ 调用 `/api/generate` → 展示加载动画 → 渲染结果区

2. 完善 `CardSection` 组件
   - 用 `<iframe srcdoc={cardHtml}>` 渲染 HTML 信息图
   - 「优化」按钮调用 `/api/generate/optimize-card`，替换当前 HTML
   - 「📥 导出图片」按钮：使用 `html2canvas` 将 iframe 内容截图为 PNG 下载
     > 注：html2canvas 对 iframe 有限制，需改为将 HTML 渲染为隐藏 div 再截图

3. 完善 `TitlesSection` 组件
   - 5 个标题卡片，点击选中（高亮），再次点击取消
   - 「重新生成」调用 `/api/generate/regenerate-titles`

4. 完善 `BodySection` 组件
   - 正文以可复制的文本块展示
   - 「优化」调用 `/api/generate/optimize-body`，替换当前正文

5. 整体状态管理：使用 React `useState` / `useReducer`，或引入 `zustand`（推荐后者以降低 prop drilling）

### 验证
- 完整走通一次生成流程：输入主题 → 选模板 → 点生成 → 看到图文/标题/正文
- 图文卡片「导出图片」能下载到 PNG 文件
- 优化/重新生成功能正常工作

---

## Phase 5: 历史记录功能

**目标：** 实现历史记录的存储、展示和重新编辑。

### 任务清单

1. 实现 `app/api/history/route.ts`（GET）：返回当前用户的历史列表（按时间倒序）
2. 实现 `app/api/history/[id]/route.ts`（GET + DELETE）
3. 实现历史记录侧边抽屉 `components/HistoryDrawer.tsx`
   - 点击导航栏「历史记录」图标触发
   - 列表展示：主题 + 模板名 + 创建时间
   - 点击条目：加载该历史数据到主编辑区
   - 删除按钮：调用 DELETE API

4. 未登录用户：点击历史记录入口提示「登录后可查看历史记录」

### 验证
- 登录状态下生成后，历史记录列表能看到该条目
- 点击历史条目，主页面恢复为历史数据

---

## Phase 6: 部署到腾讯云

**目标：** 将项目部署到 `124.220.46.239`，通过 Nginx + PM2 对外服务。

### 任务清单

1. **服务器环境准备**（SSH 连接服务器执行）
   ```bash
   # 安装 Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   # 安装 PM2
   npm install -g pm2
   # 安装 Nginx
   sudo apt-get install -y nginx
   ```

2. **项目部署**
   ```bash
   # 克隆代码到服务器
   git clone <repo> /app/xhs-generator
   cd /app/xhs-generator
   npm install
   # 创建生产环境变量
   cp .env.example .env.production.local
   # 编辑填入真实值（DEEPSEEK_API_KEY、NEXTAUTH_SECRET 等）
   # 创建数据库目录
   mkdir -p data
   npx prisma migrate deploy
   npm run build
   pm2 start npm --name "xhs-gen" -- start
   pm2 save && pm2 startup
   ```

3. **Nginx 配置** `/etc/nginx/sites-available/xhs-gen`
   ```nginx
   server {
     listen 80;
     server_name 124.220.46.239;
     location / {
       proxy_pass http://localhost:3000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
     }
   }
   ```
   ```bash
   sudo ln -s /etc/nginx/sites-available/xhs-gen /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

4. 访问 `http://124.220.46.239` 验证上线

### 验证
- 浏览器访问 `http://124.220.46.239` 能看到首页
- 走通注册 → 登录 → 生成 → 历史记录完整流程

---

## 附：文件结构预览

```
xhs-generator/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── auth/register/route.ts
│   │   ├── generate/route.ts
│   │   ├── generate/optimize-card/route.ts
│   │   ├── generate/optimize-body/route.ts
│   │   ├── generate/regenerate-titles/route.ts
│   │   ├── history/route.ts
│   │   ├── history/[id]/route.ts
│   │   └── settings/llm/route.ts
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── Navbar.tsx
│   ├── ConfigBar.tsx
│   ├── ResultArea.tsx
│   ├── CardSection.tsx
│   ├── TitlesSection.tsx
│   ├── BodySection.tsx
│   ├── HistoryDrawer.tsx
│   ├── LlmConfigModal.tsx
│   └── SetupBanner.tsx
├── lib/
│   ├── auth.ts
│   ├── llm.ts
│   ├── prisma.ts
│   └── templates.ts
├── prisma/
│   └── schema.prisma
├── public/
│   └── templates/
│       ├── template-recipe.jpg
│       ├── template-collection.jpg
│       ├── template-science.jpg
│       └── template-diary.jpg
├── data/          # SQLite 数据库（.gitignore）
├── .env.local
└── docs/
    └── superpowers/specs/
        └── 2026-07-19-xhs-generator-design.md
```
