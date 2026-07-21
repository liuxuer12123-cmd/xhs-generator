# 小书匠（XHS Generator）技术文档

> **版本**：v1.0.0 ｜ **更新日期**：2026-07-20
>
> **项目仓库**：xhs-generator ｜ **运行环境**：Node.js v22 + Next.js 14

---

## 1. 项目结构

```
xhs-generator/
├── app/                          # Next.js App Router 目录
│   ├── (auth)/                   # 认证路由组（不计入 URL）
│   │   ├── login/page.tsx        # 登录页
│   │   └── register/page.tsx     # 注册页
│   ├── api/                      # API Routes
│   │   ├── auth/
│   │   │   ├── [...nextauth]/route.ts   # NextAuth 认证入口
│   │   │   └── register/route.ts        # 用户注册接口
│   │   ├── generate/
│   │   │   ├── route.ts                 # 主生成接口
│   │   │   ├── optimize-card/route.ts   # 图文优化接口
│   │   │   ├── optimize-body/route.ts   # 正文优化接口
│   │   │   └── regenerate-titles/route.ts # 标题重生成接口
│   │   ├── history/
│   │   │   ├── route.ts                 # 历史列表接口
│   │   │   └── [id]/route.ts            # 历史详情接口
│   │   ├── settings/
│   │   │   └── llm/route.ts             # LLM 配置 CRUD
│   │   └── usage/route.ts               # 使用次数查询
│   ├── history/page.tsx          # 历史记录页面
│   ├── layout.tsx                # 根布局（SessionProvider）
│   └── page.tsx                  # 主页（核心功能页）
├── components/                   # React 组件
│   ├── CardSection.tsx           # 图文卡片区（iframe 预览 + 版本历史）
│   ├── TitlesSection.tsx         # 标题区（5 选 1 + 复制）
│   ├── BodySection.tsx           # 正文区（展示 + 优化）
│   └── Navbar.tsx                # 导航栏
├── lib/                          # 工具函数
│   ├── llm.ts                    # Prompt 构建 + LLM 调用封装
│   ├── templates.ts              # 4 种模板定义
│   ├── prisma.ts                 # Prisma 单例（防止 dev 模式多实例）
│   └── auth.ts                   # NextAuth 配置
├── prisma/
│   ├── schema.prisma             # 数据库模型定义
│   └── migrations/               # 迁移历史
├── scripts/
│   └── create-admin.js           # 初始化 admin 账号脚本
├── public/                       # 静态资源（模板封面图）
├── next.config.js                # Next.js 配置
├── ecosystem.config.json         # PM2 启动配置
├── nginx.conf                    # Nginx 反向代理配置
├── .env                          # 环境变量（本地）
└── .env.production               # 生产环境变量
```

---

## 2. 技术栈详解

### 2.1 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 14.2.5 | App Router + SSR/CSR |
| React | 18 | UI 框架 |
| Tailwind CSS | 3.4 | 样式（brand: #ff4757） |
| TypeScript | 5.0 | 类型安全 |
| html2canvas | 1.4.1 | 卡片导出 PNG |

### 2.2 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js API Routes | 14.2.5 | RESTful API |
| Prisma ORM | 5.16 | 数据库访问层 |
| SQLite | — | 本地文件数据库 |
| NextAuth.js | 4.x | 认证（JWT 策略） |
| bcryptjs | 2.4 | 密码哈希 |

### 2.3 AI / LLM

- 默认使用 **DeepSeek API**（`sk-your-deepseek-api-key-here`）
- API 格式：OpenAI 兼容（`POST /v1/chat/completions`）
- 支持用户自定义 Base URL + API Key + 模型名称
- 请求超时：60s，流式响应暂不启用

---

## 3. 数据库设计

### 3.1 Schema（prisma/schema.prisma）

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id          String      @id @default(cuid())
  username    String      @unique
  password    String
  email       String?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  llmConfig   LlmConfig?
  generations Generation[]
}

model LlmConfig {
  id        String   @id @default(cuid())
  userId    String   @unique
  baseUrl   String
  apiKey    String
  model     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Generation {
  id        String   @id @default(cuid())
  userId    String
  topic     String
  template  String
  cardHtml  String
  titles    String   // JSON 数组字符串
  body      String
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model GuestUsage {
  ip        String   @id
  count     Int      @default(0)
  updatedAt DateTime @updatedAt
}
```

### 3.2 迁移记录

| 迁移名称 | 内容 |
|---------|------|
| 20240101000000_init | 初始化 User、LlmConfig、Generation 表 |
| 20260720065150_add_usage_limits | 新增 GuestUsage 表 |

### 3.3 Prisma 客户端单例（lib/prisma.ts）

开发模式下 Next.js Hot Reload 会导致 Prisma 客户端多次实例化，通过全局单例避免：

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

> ⚠️ **注意**：迁移（migrate dev）后必须执行 `npx prisma generate` 并重启 dev server，否则新增模型无法访问。

---

## 4. 认证系统

### 4.1 NextAuth 配置（lib/auth.ts）

```typescript
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: '账号', type: 'text' },  // type="text"，非 email
        password: { label: '密码', type: 'password' },
      },
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: { username: credentials.username }
        })
        if (!user) return null
        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null
        return { id: user.id, name: user.username }
      }
    })
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  }
}
```

> ⚠️ **关键点**：登录/注册页的账号输入框必须使用 `type="text"` 而非 `type="email"`，否则浏览器原生校验会拒绝 `admin` 这类无 `@` 的用户名。

---

## 5. AI 生成模块（lib/llm.ts）

### 5.1 调用流程

```
page.tsx（用户点击生成）
  └─ POST /api/generate
       └─ 读取用户 LlmConfig（有则用自定义 API，无则用默认 DeepSeek）
       └─ 检查使用量限制
       └─ 并发调用三个 Prompt Builder
            ├─ buildCardPrompt  → LLM → 返回完整 HTML
            ├─ buildTitlesPrompt → LLM → 返回 JSON 数组 → 解析为 string[]
            └─ buildBodyPrompt  → LLM → 返回纯文本正文
       └─ 保存 Generation 记录
       └─ 返回 { cardHtml, titles, body }
```

### 5.2 LLM 请求封装

```typescript
async function callLLM(prompt: string, config?: LlmConfig): Promise<string> {
  const baseUrl = config?.baseUrl || 'https://api.deepseek.com'
  const apiKey  = config?.apiKey  || process.env.DEFAULT_API_KEY
  const model   = config?.model   || 'deepseek-chat'

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
    }),
  })
  const data = await res.json()
  return data.choices[0].message.content
}
```

### 5.3 图文卡片 Prompt 核心规范

```
【⚠️ 关键尺寸要求 — 必须严格执行】
- 每一张卡片必须固定为：width:1080px; height:1440px; overflow:hidden
- 不允许内容撑高卡片，超出部分自动裁切（overflow:hidden）
- 多张卡片时，所有卡片高度统一为 1440px，在 body 内垂直排列

【字号排版规范】
- 封面大字/主标题：72~88px，bold/900
- 分节标题：44~52px，bold
- 正文/步骤文字：30~34px，行高 1.7
- 注释/标签小字：24~26px

【内容创作规范】
- 补充内容仅作为素材参考，需提炼语言、优化表达
- 不要直接复制原文，用小红书风格重新组织

【视觉规范】
- body: display:flex; flex-direction:column; align-items:center; gap:30px;
         padding:30px; background:#e8e8e8
```

---

## 6. 图文卡片渲染（CardSection.tsx）

### 6.1 iframe 渲染方案

卡片使用 **iframe + document.write()** 渲染，原因：
- LLM 输出的 HTML 包含完整 `<style>` 标签
- 直接插入 DOM 会导致样式污染全局
- iframe 天然隔离 CSS 作用域

```typescript
useEffect(() => {
  if (!iframeRef.current || !cardHtml) return
  const doc = iframeRef.current.contentDocument
  doc.open()
  doc.write(cardHtml)
  doc.close()
  // 等待渲染完成后测量实际高度
  setTimeout(() => {
    const body = doc.body
    setIframeHeight(body.scrollHeight)
  }, 100)
}, [cardHtml])
```

### 6.2 响应式缩放

卡片原始宽度固定 1080px，通过 CSS `transform: scale()` 缩放以适配容器：

```typescript
const CARD_WIDTH = 1080

useEffect(() => {
  if (!containerRef.current) return
  const observer = new ResizeObserver(entries => {
    const containerWidth = entries[0].contentRect.width
    setScale(containerWidth / CARD_WIDTH)
  })
  observer.observe(containerRef.current)
  return () => observer.disconnect()
}, [])

// 容器高度 = iframe 实际高度 × 缩放比例
const containerHeight = iframeHeight * scale
```

### 6.3 PNG 导出

```typescript
const handleExport = async () => {
  const iframe = iframeRef.current
  const iframeDoc = iframe.contentDocument
  const canvas = await html2canvas(iframeDoc.body, {
    width: CARD_WIDTH,
    scale: 2,             // 2x 高清，实际输出 2160px
    useCORS: true,
    backgroundColor: '#e8e8e8',
  })
  const url = canvas.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = url
  a.download = `xhs-card-${Date.now()}.png`
  a.click()
}
```

### 6.4 版本历史

版本历史存于本地 React state（仅登录用户可见），刷新后丢失：

```typescript
const [history, setHistory] = useState<string[]>([])

// 每次更新卡片前，将旧版本推入历史
const updateCard = useCallback((newHtml: string) => {
  if (session) {
    setHistory(prev => [...prev, cardHtml])
  }
  onUpdate(newHtml)
}, [cardHtml, onUpdate, session])

// 回退到指定版本
const revertTo = (html: string, idx: number) => {
  onUpdate(html)
  setHistory(prev => prev.slice(0, idx))
}
```

---

## 7. 使用量管控（api/generate/route.ts）

```typescript
const GUEST_LIMIT = 3
const USER_FREE_LIMIT = 10
const ADMIN_USERNAME = 'admin'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const ip = req.headers.get('x-forwarded-for') || 'unknown'

  // 1. 管理员：不限制
  if (session?.user?.name === ADMIN_USERNAME) {
    // 直接生成
  }
  // 2. 已登录用户
  else if (session?.user) {
    const llmConfig = await prisma.llmConfig.findUnique({
      where: { userId: session.user.id }
    })
    // 有自定义 API：不限制
    if (!llmConfig) {
      const count = await prisma.generation.count({
        where: { userId: session.user.id }
      })
      if (count >= USER_FREE_LIMIT) {
        return NextResponse.json({ error: '免费次数已用完' }, { status: 429 })
      }
    }
  }
  // 3. 游客：按 IP 限制
  else {
    const usage = await prisma.guestUsage.upsert({
      where: { ip },
      update: {},
      create: { ip, count: 0 },
    })
    if (usage.count >= GUEST_LIMIT) {
      return NextResponse.json({ error: '游客次数已用完' }, { status: 429 })
    }
    await prisma.guestUsage.update({
      where: { ip },
      data: { count: { increment: 1 } },
    })
  }
  // ... 执行生成逻辑
}
```

---

## 8. 环境变量

### 8.1 开发环境（.env）

```env
DATABASE_URL="file:./data/db.sqlite"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
DEFAULT_API_KEY="sk-your-deepseek-api-key-here"
DEFAULT_BASE_URL="https://api.deepseek.com"
DEFAULT_MODEL="deepseek-chat"
```

### 8.2 生产环境（.env.production）

```env
DATABASE_URL="file:./data/db.sqlite"
NEXTAUTH_URL="http://124.220.46.239"
NEXTAUTH_SECRET="<生产密钥>"
DEFAULT_API_KEY="sk-your-deepseek-api-key-here"
DEFAULT_BASE_URL="https://api.deepseek.com"
DEFAULT_MODEL="deepseek-chat"
```

---

## 9. 部署流程

### 9.1 服务器环境

| 项目 | 值 |
|------|-----|
| 系统 | Ubuntu 22.04 LTS |
| IP | 124.220.46.239 |
| Node.js | v22.23.1 |
| npm | v10.9.8（内网 registry 污染，改用 pnpm） |
| pnpm | v11.15.1 |
| PM2 | v7.0.3 |
| Nginx | 1.24.0 |

### 9.2 部署步骤

```bash
# 1. 打包项目（本地）
tar --exclude=node_modules --exclude=.next --exclude=data \
    -czf xhs-generator.tar.gz .

# 2. 上传到服务器
scp xhs-generator.tar.gz ubuntu@124.220.46.239:/var/www/

# 3. 服务器上解压部署
ssh ubuntu@124.220.46.239 << 'EOF'
cd /var/www
tar -xzf xhs-generator.tar.gz -C xhs-generator/

cd xhs-generator

# 切换为公共 npm 镜像（避免内网 registry 污染）
npm config set registry https://registry.npmmirror.com

# 用 pnpm 安装依赖（npm v10 有已知 bug）
sudo npm install -g pnpm
pnpm install

# 允许 Prisma 运行 build scripts
cat > pnpm-workspace.yaml << 'YAML'
onlyBuiltDependencies:
  - '@prisma/client'
  - '@prisma/engines'
  - 'prisma'
YAML

# 生成 Prisma Client
DATABASE_URL="file:./data/db.sqlite" node ./node_modules/prisma/build/index.js generate

# 执行数据库迁移
mkdir -p data
DATABASE_URL="file:./data/db.sqlite" node ./node_modules/prisma/build/index.js migrate deploy

# 初始化 admin 账号
DATABASE_URL="file:./data/db.sqlite" node scripts/create-admin.js

# Build
npm run build

# 启动 PM2
pm2 start ecosystem.config.json
pm2 save

# 配置 Nginx
sudo cp nginx.conf /etc/nginx/sites-available/xhs-generator
sudo ln -sf /etc/nginx/sites-available/xhs-generator /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
EOF
```

### 9.3 PM2 配置（ecosystem.config.json）

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
  "watch": false,
  "max_memory_restart": "500M",
  "env": {
    "NODE_ENV": "production",
    "PORT": "3000"
  }
}
```

> ⚠️ **关键**：`script` 必须指向 `node_modules/next/dist/bin/next`（真实 JS 入口），不能使用 `node_modules/.bin/next`（shell wrapper，PM2 会用 node 执行 shell 脚本导致语法错误）。

### 9.4 Nginx 配置（nginx.conf）

```nginx
server {
    listen 80;
    server_name 124.220.46.239;

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

> ⚠️ **腾讯云安全组**：除服务器内 ufw 开放端口外，还需在腾讯云控制台 → 安全组 → 入站规则手动添加 HTTP(80) 规则，否则外网无法访问。

---

## 10. 常见问题与排查

### Q1：Prisma 迁移后报 `Cannot read properties of undefined`

**原因**：dev server 缓存了旧 Prisma Client 实例。

**解决**：
```bash
npx prisma generate  # 重新生成 Client
# 然后重启 dev server（Ctrl+C 后重新 npm run dev）
```

### Q2：npm install 报 `Exit handler never called!`

**原因**：npm registry 指向快手内网私有仓库（`npm.corp.kuaishou.com`），外网服务器无法访问。

**解决**：
```bash
npm config set registry https://registry.npmmirror.com
# 或改用 pnpm
sudo npm install -g pnpm && pnpm install
```

### Q3：PM2 启动报 `SyntaxError: missing ) after argument list`

**原因**：`ecosystem.config.json` 的 `script` 字段设为了 `node_modules/.bin/next`（shell 脚本），PM2 用 node 解释器执行导致语法错误。

**解决**：改为 `"script": "node_modules/next/dist/bin/next"`

### Q4：build 报 `Cannot find type definition file for 'json5'`

**原因**：服务器环境与本地不一致，某 optional type 包未安装。

**解决**：在 `next.config.js` 跳过 TS 检查：
```javascript
typescript: { ignoreBuildErrors: true },
eslint: { ignoreDuringBuilds: true },
```

### Q5：`admin` 账号登录被浏览器阻止

**原因**：登录输入框 `type="email"`，浏览器校验 `admin` 缺少 `@` 符号。

**解决**：改为 `type="text"`

### Q6：服务器内 curl 200 但外网访问超时

**原因**：腾讯云安全组（云层防火墙）未开放 80 端口，仅 ufw（系统防火墙）开放是不够的。

**解决**：登录腾讯云控制台 → 安全组 → 入站规则 → 添加 HTTP(80) 规则，来源 `0.0.0.0/0`

---

## 11. 本地开发

```bash
# 安装依赖
npm install

# 数据库初始化
npx prisma migrate dev
npx prisma generate

# 创建 admin 账号
DATABASE_URL="file:./data/db.sqlite" node scripts/create-admin.js

# 启动开发服务器
npm run dev
# 访问 http://localhost:3000
```

### 初次运行检查清单

- [ ] `.env` 文件已配置 `DATABASE_URL` 和 `NEXTAUTH_SECRET`
- [ ] `data/` 目录已创建（`mkdir -p data`）
- [ ] Prisma 迁移已执行（`npx prisma migrate dev`）
- [ ] admin 账号已创建（`node scripts/create-admin.js`）

---

## 12. 模板系统（lib/templates.ts）

每个模板包含 `id`、`name`、`previewImage`、`description` 四个字段，`description` 是传给 LLM 的完整 CSS/HTML 规范描述。

| 模板 | 主色 | 特色视觉元素 | 卡片数 |
|------|------|------------|--------|
| template-recipe | #f97316 暖橙 | 橙色渐变背景，食材网格布局 | 3-5 |
| template-collection | #f5e6c8 棕黄 | 棕黄卡片背景，3 列 icon 网格 | 4-6 |
| template-science | #e8f5e0 浅绿 | 红蓝双色标题，知识点卡片 | 4-6 |
| template-diary | #f7ede0 暖米色 | 左右斜纹装饰条，手写风格 | 4-6 |

模板 description 的关键规范（以日记风为例，其他类似）：

```
背景色：#f7ede0（暖米色）
装饰元素：左侧橙粉竖条（position:absolute; left:0; top:0; width:12px; height:100%；
          background: linear-gradient(to bottom,#FF8C69,#FFB347)）
          右侧对称竖条同款
字体：仿手写风格，圆角元素（border-radius:12px）
每张卡片：width:1080px; height:1440px; overflow:hidden
```
