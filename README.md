# 小书匠 · XHS Generator

> 🎨 小红书图文一键生成工具 — 用 AI 帮你快速创作符合小红书平台规范的精美图文帖子

**在线访问**：https://xiaoshujiang.online

---

## 📖 目录

- [产品介绍](#-产品介绍)
- [功能亮点](#-功能亮点)
- [技术栈](#️-技术栈)
- [项目结构](#-项目结构)
- [本地开发](#-本地开发)
- [生产部署](#-生产部署)
- [使用限制规则](#-使用限制规则)
- [项目开发流程记录](#-项目开发流程记录)
- [踩坑与解决方案](#-踩坑与解决方案)

---

## 🌟 产品介绍

小书匠是一款面向小红书内容创作者的 AI 辅助工具。用户输入帖子主题，选择风格模板，一键生成符合小红书规范（1080×1440px）的图文卡片、5 个候选标题和配套正文。

每个板块均支持独立优化，登录用户可保存版本历史，支持自定义 LLM API Key 实现无限制使用。

---

## ✨ 功能亮点

| 功能 | 说明 |
|------|------|
| 🎨 4 种模板 | 清新食谱风 / 干货合集风 / 科普知识风 / 日记分享风 |
| ⚡ AI 一键生成 | 图文卡片 + 5 个标题 + 正文，三路并发同步生成 |
| 📐 规范图文 | 1080×1440px（3:4），多卡片自动裁切，严格内联样式 |
| ✏️ 独立优化 | 图文/标题/正文可单独输入建议进行优化 |
| 🕐 版本历史 | 登录用户每次优化前自动保存，可随时回退 |
| 📥 PNG 导出 | 导出原始 1080px 宽高清图片（html2canvas） |
| 🔢 次数管控 | 游客生成 3 次 / 登录用户 10 次 / 配置自己的 API 则无限制 |
| 🔑 自定义 LLM | 支持在设置中填入 OpenAI 兼容格式的 API Key |
| 📚 历史记录 | 登录用户可查看并加载历史生成的帖子 |

---

## 🛠️ 技术栈

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| 框架 | Next.js 14 App Router + TypeScript | 全栈一体，Server Components + API Routes |
| 样式 | Tailwind CSS | 原子类，快速搭建 UI |
| 数据库 | SQLite + Prisma ORM | 轻量单文件数据库，适合单机部署 |
| 认证 | NextAuth.js（JWT 策略） | credentials provider，用户名密码登录 |
| AI | DeepSeek API（OpenAI 兼容格式） | 支持替换为任意 OpenAI 兼容接口 |
| 图片导出 | html2canvas | 将 iframe 内的 HTML 渲染为 PNG |
| 卡片预览 | iframe + CSS transform | 隔离样式，响应式 scale 适配容器宽度 |
| 进程管理 | PM2 | 生产环境守护进程，自动重启 |
| 反向代理 | Nginx | 80→443 重定向，SSL 终止，反代到 3000 端口 |
| SSL | Let's Encrypt（Certbot） | 免费证书，自动续期 |
| 部署平台 | 腾讯云 CVM（Ubuntu 22.04） | 2核2G，公网 IP `124.220.46.239` |
| 域名 | xiaoshujiang.online | 腾讯云购买，DNSPod A 记录解析 |

---

## 📁 项目结构

```
xhs-generator/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          # 登录页
│   │   └── register/page.tsx       # 注册页
│   ├── api/
│   │   ├── auth/                   # NextAuth 路由
│   │   ├── generate/
│   │   │   ├── route.ts            # 主生成接口（图文+标题+正文）
│   │   │   ├── optimize-card/      # 图文优化接口
│   │   │   ├── optimize-body/      # 正文优化接口
│   │   │   └── regenerate-titles/  # 标题重生成接口
│   │   ├── history/                # 历史记录接口
│   │   ├── settings/llm/           # LLM 配置接口
│   │   └── usage/                  # 使用次数查询接口
│   ├── globals.css
│   ├── layout.tsx                  # 根布局（SessionProvider）
│   ├── page.tsx                    # 主页面
│   └── providers.tsx
├── components/
│   ├── CardSection.tsx             # 图文卡片区（iframe 预览 + 优化）
│   ├── TitlesSection.tsx           # 标题区（5选1 + 重生成）
│   ├── BodySection.tsx             # 正文区（展示 + 优化）
│   ├── Navbar.tsx                  # 顶部导航（历史记录入口）
│   └── LlmConfigModal.tsx          # LLM 配置弹窗
├── lib/
│   ├── auth.ts                     # NextAuth 配置
│   ├── llm.ts                      # LLM 调用封装 + Prompt 模板
│   ├── prisma.ts                   # Prisma 单例（防 HMR 多实例）
│   └── templates.ts                # 4 种模板定义
├── prisma/
│   ├── schema.prisma               # 数据模型
│   └── migrations/                 # 迁移文件
├── scripts/
│   └── create-admin.js             # 创建管理员账号脚本
├── public/templates/               # 模板预览图
├── docs/
│   ├── PRD.md                      # 产品需求文档
│   └── TECH.md                     # 技术文档
├── deploy.sh                       # 一键部署脚本
├── ecosystem.config.json           # PM2 配置
├── nginx.conf                      # Nginx 配置模板
├── .env.example                    # 环境变量模板
└── next.config.js
```

---

## 🚀 本地开发

### 前置要求

- Node.js >= 18
- npm 或 pnpm

### 启动步骤

```bash
# 1. 克隆仓库
git clone https://github.com/liuxuer12123-cmd/xhs-generator.git
cd xhs-generator

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入 NEXTAUTH_SECRET 和 DEEPSEEK_API_KEY
```

`.env.local` 内容：

```env
DATABASE_URL="file:./data/db.sqlite"
NEXTAUTH_SECRET="任意随机字符串，如：openssl rand -base64 32 的输出"
NEXTAUTH_URL="http://localhost:3000"
DEEPSEEK_API_KEY="sk-your-api-key"       # 从 platform.deepseek.com 获取
DEEPSEEK_BASE_URL="https://api.deepseek.com"
DEEPSEEK_MODEL="deepseek-chat"
```

```bash
# 4. 初始化数据库
mkdir -p data
npx prisma migrate dev --name init
npx prisma generate

# 5. 创建 admin 账号（可选，admin 无使用次数限制）
node scripts/create-admin.js

# 6. 启动开发服务器
npm run dev
```

访问 http://localhost:3000

---

## 🖥️ 生产部署

### 服务器环境准备

```bash
# Ubuntu 22.04 LTS
# 安装 Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 pnpm（推荐，避免 npm 的 exit handler 已知 bug）
npm install -g pnpm --registry=https://registry.npmmirror.com

# 安装 PM2
npm install -g pm2 --registry=https://registry.npmmirror.com

# 安装 Nginx
sudo apt-get install -y nginx
```

### 部署流程

```bash
# 1. 上传代码到服务器
git clone https://github.com/liuxuer12123-cmd/xhs-generator.git /var/www/xhs-generator
cd /var/www/xhs-generator

# 2. 配置环境变量
cp .env.example .env.local
vim .env.local   # 填入真实的 API Key 和密钥

# 3. 安装依赖（使用 pnpm 避免 npm 的 bug）
# 先创建 pnpm-workspace.yaml 允许 Prisma 构建脚本
cat > pnpm-workspace.yaml << 'EOF'
onlyBuiltDependencies:
  - '@prisma/client'
  - '@prisma/engines'
  - 'prisma'
EOF

pnpm install --registry=https://registry.npmmirror.com

# 4. 手动运行 Prisma 构建（pnpm 默认忽略 postinstall 脚本）
node ./node_modules/prisma/build/index.js generate

# 5. 初始化数据库
mkdir -p data
node ./node_modules/prisma/build/index.js migrate deploy

# 6. 构建 Next.js（忽略 TS 报错）
npm run build

# 7. 启动 PM2
pm2 start ecosystem.config.json
pm2 save
pm2 startup   # 设置开机自启
```

### PM2 配置（ecosystem.config.json）

```json
{
  "name": "xhs-generator",
  "script": "node_modules/next/dist/bin/next",
  "args": "start",
  "cwd": "/var/www/xhs-generator",
  "interpreter": "node",
  "instances": 1,
  "exec_mode": "fork",
  "autorestart": true,
  "max_memory_restart": "500M",
  "env": {
    "NODE_ENV": "production",
    "PORT": "3000"
  }
}
```

> ⚠️ **注意**：`script` 必须写 `node_modules/next/dist/bin/next`，不能写 `node_modules/.bin/next`。
> 后者是 Shell 包装脚本，PM2 会尝试用 Node.js 解析 Shell 语法，导致 `SyntaxError`。

### Nginx 配置（含 SSL）

```nginx
# /etc/nginx/sites-available/xhs-generator

server {
    listen 80;
    server_name xiaoshujiang.online www.xiaoshujiang.online;

    # 强制跳转 HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name xiaoshujiang.online www.xiaoshujiang.online;

    ssl_certificate     /etc/letsencrypt/live/xiaoshujiang.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/xiaoshujiang.online/privkey.pem;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 申请 SSL 证书（Let's Encrypt）

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx \
    -d xiaoshujiang.online \
    -d www.xiaoshujiang.online \
    --non-interactive --agree-tos \
    --email your@email.com --redirect

# 证书有效期 90 天，Certbot 已自动配置 crontab 续期
```

### 腾讯云安全组必须开放的端口

| 端口 | 协议 | 用途 |
|------|------|------|
| 22 | TCP | SSH |
| 80 | TCP | HTTP（跳转 HTTPS） |
| 443 | TCP | HTTPS |

---

## 📋 使用限制规则

| 用户类型 | 生成次数 | 每帖优化次数（每板块独立计算）|
|---------|---------|--------------------------|
| 游客（未登录） | 3 次 | 每板块 3 次 |
| 注册用户（无自定义 API） | 10 次 | 每板块 5 次 |
| 注册用户（已配置自定义 API） | 无限 | 无限 |
| admin 账号 | 无限 | 无限 |

- **生成次数**：游客按 IP 计算，登录用户按 `Generation` 表记录数计算
- **优化次数**：纯前端计数，每次重新生成帖子时重置
- **自定义 API**：在设置页面填入 OpenAI 兼容格式的 Base URL + API Key，立即切换为无限制

---

## 📝 项目开发流程记录

> 完整记录从零到上线的开发全流程，供参考复现。

### Phase 0：项目初始化

```bash
npx create-next-app@latest xhs-generator \
  --typescript --tailwind --app --no-eslint --no-src-dir
cd xhs-generator
npm install prisma @prisma/client next-auth bcryptjs
npm install -D @types/bcryptjs
```

初始化 Prisma：

```bash
npx prisma init --datasource-provider sqlite
```

### Phase 1：数据模型设计

4 张核心表：

```prisma
model User {
  id           String       @id @default(cuid())
  username     String       @unique
  passwordHash String
  createdAt    DateTime     @default(now())
  generations  Generation[]
  llmConfig    LlmConfig?
}

model Generation {
  id           String   @id @default(cuid())
  userId       String
  topic        String
  extraContent String?
  templateId   String
  cardHtml     String
  titles       String   // JSON 字符串
  body         String
  createdAt    DateTime @default(now())
  user         User     @relation(fields: [userId], references: [id])
}

model LlmConfig {
  id        String   @id @default(cuid())
  userId    String   @unique
  baseUrl   String
  apiKey    String
  model     String
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id])
}

model GuestUsage {
  ip        String   @id
  count     Int      @default(0)
  updatedAt DateTime @updatedAt
}
```

### Phase 2：UI 设计

双栏布局：
- **左栏（480px）**：主题输入 + 补充内容 + 模板选择 + 生成按钮
- **右栏（flex-1）**：左侧图文卡片 + 右侧标题/正文（嵌套双栏）

图文卡片预览方案：
- 用 `<iframe>` 渲染 HTML，彻底隔离全局 CSS 污染
- `ResizeObserver` 监听容器宽度变化，动态计算 `scale = 容器宽 / 1080`
- `transform: scale()` + `transform-origin: top left` 实现等比缩放

### Phase 3：LLM Prompt 工程

**图文 Prompt 关键规范**（`lib/llm.ts`）：
```
【⚠️ 关键尺寸要求】每张卡片固定 width:1080px; height:1440px; overflow:hidden，不允许内容撑高
【字号规范】主标题 72~88px，分节标题 44~52px，正文 30~34px（行高1.7），小字 24~26px
【内容符号】✅ 标注亮点，💡 标注贴士，🔥 标注重点
【输出规范】只输出完整 HTML 文档，所有样式内联，不要任何解释，不要 ``` 标记
```

三路并发生成（`Promise.all`）：
```typescript
const [cardHtml, titlesRaw, body] = await Promise.all([
  callLlm(buildCardPrompt(...), userId),
  callLlm(buildTitlesPrompt(...), userId),
  callLlm(buildBodyPrompt(...), userId),
])
```

### Phase 4：认证系统

NextAuth credentials provider，密码用 bcryptjs 哈希存储：

```typescript
// lib/auth.ts
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: { username: credentials.username }
        })
        if (!user) return null
        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        return valid ? { id: user.id, name: user.username } : null
      }
    })
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.id as string
      return session
    }
  }
}
```

### Phase 5：使用次数限制

```typescript
// 游客：按 IP 限制
const guestUsage = await prisma.guestUsage.upsert({
  where: { ip },
  update: {},
  create: { ip, count: 0 },
})
if (guestUsage.count >= GUEST_LIMIT) {
  return NextResponse.json({ error: '免费次数已用完', limitReached: true }, { status: 403 })
}

// 登录用户：按生成记录数限制（有自定义 API 则跳过）
const llmConfig = await prisma.llmConfig.findUnique({ where: { userId } })
if (!llmConfig) {
  const usageCount = await prisma.generation.count({ where: { userId } })
  if (usageCount >= USER_FREE_LIMIT) { /* 拒绝 */ }
}
```

优化次数限制（纯前端，`page.tsx`）：

```typescript
const [optimizeCounts, setOptimizeCounts] = useState({ card: 0, titles: 0, body: 0 })
const optimizeLimit = session ? 5 : 3  // 登录5次，游客3次

// 生成新帖子时重置
setOptimizeCounts({ card: 0, titles: 0, body: 0 })

// 传给子组件
<CardSection
  optimizeCount={optimizeCounts.card}
  optimizeLimit={optimizeUnlimited ? Infinity : optimizeLimit}
  onOptimize={() => setOptimizeCounts(prev => ({ ...prev, card: prev.card + 1 }))}
/>
```

---

## 🐛 踩坑与解决方案

> 部署过程中遇到的 10 个典型问题，排查思路与修复方案。

### 1. npm install 报 `Exit handler never called!`

**原因**：npm v10.9.8 已知 bug，结合 Kuaishou 内网 registry（`npm.corp.kuaishou.com`）在外网不可达时触发。

**解决**：
```bash
# 方法一：切换 registry
npm config set registry https://registry.npmmirror.com

# 方法二（推荐）：改用 pnpm
npm install -g pnpm --registry=https://registry.npmmirror.com
pnpm install --registry=https://registry.npmmirror.com
```

### 2. pnpm 提示 `[ERR_PNPM_IGNORED_BUILDS]`，Prisma 未生成

**原因**：pnpm 默认出于安全考虑忽略 postinstall 构建脚本。

**解决**：
```bash
# 创建 pnpm-workspace.yaml
cat > pnpm-workspace.yaml << 'EOF'
onlyBuiltDependencies:
  - '@prisma/client'
  - '@prisma/engines'
  - 'prisma'
EOF

# 然后手动运行 Prisma generate
node ./node_modules/prisma/build/index.js generate
node ./node_modules/prisma/build/index.js migrate deploy
```

### 3. Next.js build 报 `Cannot find type definition file for 'json5'`

**原因**：服务器上 node_modules 不完整，部分类型包未安装。

**解决**：在 `next.config.js` 跳过 TS 和 ESLint 检查：
```javascript
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
}
module.exports = nextConfig
```

### 4. PM2 启动报 `SyntaxError: missing ) after argument list`

**原因**：`node_modules/.bin/next` 是 Shell 包装脚本（`#!/bin/sh`），PM2 默认用 Node.js 解析它，导致语法错误。

**解决**：`ecosystem.config.json` 中 `script` 指向真实 JS 入口：
```json
{
  "script": "node_modules/next/dist/bin/next",  // ✅ 真实 JS 文件
  "interpreter": "node"
}
```

### 5. 公网 IP 访问超时（HTTP 000）

**原因**：腾讯云 CVM 有两层防火墙：服务器内的 `ufw` + **云控制台的安全组**。只开了 ufw 不够。

**解决**：在腾讯云控制台 → 安全组 → 入站规则，手动添加 TCP 80 和 TCP 443。

### 6. `ENOTEMPTY: directory not empty` on npm install

**原因**：上次 npm install 中途失败，遗留了损坏的 node_modules。

**解决**：
```bash
rm -rf node_modules .next package-lock.json
npm install  # 或 pnpm install
```

### 7. 图文卡片在不同屏幕宽度下显示不全

**原因**：固定 `width: 1080px` 的 iframe 超出容器，用 `overflow: hidden` 截断。

**解决**：用 `ResizeObserver` 监听容器宽度，动态计算缩放比：
```typescript
const updateScale = () => {
  const w = wrapperRef.current?.offsetWidth || 540
  setScale(w / CARD_WIDTH)  // CARD_WIDTH = 1080
}
const observer = new ResizeObserver(updateScale)
observer.observe(wrapperRef.current)
```

### 8. 多次 HMR 热更新后 Prisma 报 `Too many clients` 错误

**原因**：Next.js 开发模式下每次热更新都重新 `require` 模块，导致创建多个 PrismaClient 实例。

**解决**：用全局单例模式（`lib/prisma.ts`）：
```typescript
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### 9. NextAuth 登录成功但 session 里没有 `user.id`

**原因**：默认 session 只包含 email/name/image，需要通过 callbacks 把 id 注入到 JWT 和 session。

**解决**：
```typescript
callbacks: {
  jwt({ token, user }) {
    if (user) token.id = user.id  // 登录时把 id 写入 token
    return token
  },
  session({ session, token }) {
    if (session.user) session.user.id = token.id as string  // 每次请求带上 id
    return session
  }
}
```

### 10. GitHub push 被拒绝：Secret Scanning 检测到 API Key

**原因**：`deploy.sh` 和设计文档里硬编码了 DeepSeek API Key。

**解决**：
```bash
# 用 filter-branch 改写所有历史 commit
git filter-branch --tree-filter \
  "find . -type f \( -name '*.md' -o -name '*.sh' \) \
   -exec sed -i '' 's/sk-实际key/sk-your-api-key-here/g' {} \;" \
  -- --all

# 强制推送
git push origin main --force
```

---

## 📄 文档

- [产品需求文档（PRD）](docs/PRD.md)
- [技术文档](docs/TECH.md)

---

## 🌐 在线地址

**https://xiaoshujiang.online**

---

## 📝 License

MIT
