# 小书匠 · XHS Generator

> 🎨 小红书图文一键生成工具 — 用 AI 帮你快速创作符合小红书平台规范的精美图文帖子

**在线访问**：http://124.220.46.239

---

## ✨ 功能亮点

- **4 种精美模板**：清新食谱风 / 干货合集风 / 科普知识风 / 日记分享风
- **AI 一键生成**：图文卡片 + 5 个候选标题 + 精美正文，同步生成
- **严格图文规范**：1080×1440px（3:4 黄金比例），多张卡片自动裁切
- **独立优化**：图文/标题/正文可单独优化，支持输入修改建议
- **版本历史**：登录用户可随时回退到历史版本的图文卡片
- **一键导出**：导出原始 1080px 宽度的高清 PNG 图片
- **次数管控**：游客 3 次 / 免费用户 10 次 / 自定义 API 无限制
- **自定义 LLM**：支持配置自己的 OpenAI 兼容 API Key

## 🖼️ 界面预览

```
┌──────────────────┬──────────────────────────────────────────────┐
│   左侧输入区       │         右侧输出区                             │
│   ─────────────  │  ┌─────────────────────┬───────────────────┐ │
│   📌 帖子主题     │  │                     │  ✏️ 标题（5选1）  │ │
│   📝 补充内容     │  │   🖼️ 图文卡片       │  ─────────────── │ │
│   🎨 模板选择     │  │   （iframe 渲染）   │  📝 正文          │ │
│   ✨ 生成按钮     │  │                     │                   │ │
│                  │  └─────────────────────┴───────────────────┘ │
└──────────────────┴──────────────────────────────────────────────┘
```

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Next.js 14 App Router + TypeScript |
| UI 样式 | Tailwind CSS |
| 数据库 | SQLite + Prisma ORM |
| 认证 | NextAuth.js（JWT 策略） |
| AI | DeepSeek API（OpenAI 兼容格式） |
| 图片导出 | html2canvas |
| 卡片预览 | iframe + CSS transform 响应式缩放 |
| 部署 | PM2 + Nginx on 腾讯云 Ubuntu |

## 🚀 本地运行

### 前提条件

- Node.js >= 18
- npm / pnpm

### 安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/你的用户名/xhs-generator.git
cd xhs-generator

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env，填入你的 NEXTAUTH_SECRET 和 DEEPSEEK_API_KEY

# 4. 初始化数据库
mkdir -p data
npx prisma migrate dev
npx prisma generate

# 5. 创建 admin 账号（可选）
DATABASE_URL="file:./data/db.sqlite" node scripts/create-admin.js

# 6. 启动开发服务器
npm run dev
```

访问 http://localhost:3000

### 环境变量说明

复制 `.env.example` 为 `.env` 并填写：

```env
DATABASE_URL="file:./data/db.sqlite"
NEXTAUTH_SECRET="任意随机字符串"
NEXTAUTH_URL="http://localhost:3000"
DEEPSEEK_API_KEY="sk-your-api-key"  # 从 platform.deepseek.com 获取
DEEPSEEK_BASE_URL="https://api.deepseek.com"
DEEPSEEK_MODEL="deepseek-chat"
```

## 📋 使用限制

| 用户类型 | 生成次数 | 每帖优化次数（每板块）|
|---------|---------|---------------------|
| 游客（未登录） | 3 次 | 3 次 |
| 注册用户 | 10 次 | 5 次 |
| 配置自定义 API | 无限 | 无限 |
| admin 账号 | 无限 | 无限 |

## 📦 部署

详见 [技术文档](docs/TECH.md) 第 9 章「部署流程」。

## 📄 文档

- [产品需求文档（PRD）](docs/PRD.md)
- [技术文档](docs/TECH.md)

## 📝 License

MIT
