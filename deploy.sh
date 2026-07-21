#!/bin/bash
# 腾讯云部署脚本 — 在服务器上执行
# 用法：bash deploy.sh

set -e

APP_DIR="/var/www/xhs-generator"
echo "=== 开始部署小书匠 ==="

# 1. 安装 Node.js (如果没有)
if ! command -v node &> /dev/null; then
    echo "安装 Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 2. 安装 PM2 (如果没有)
if ! command -v pm2 &> /dev/null; then
    echo "安装 PM2..."
    sudo npm install -g pm2
fi

# 3. 安装 Nginx (如果没有)
if ! command -v nginx &> /dev/null; then
    echo "安装 Nginx..."
    sudo apt-get update
    sudo apt-get install -y nginx
fi

# 4. 创建应用目录
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR

# 5. 进入应用目录
cd $APP_DIR

# 6. 安装依赖
echo "安装 npm 依赖..."
npm install --production=false

# 7. 生成 Prisma Client
echo "生成 Prisma Client..."
DATABASE_URL="file:./data/db.sqlite" npx prisma generate

# 8. 创建 data 目录
mkdir -p data

# 9. 运行数据库迁移
echo "运行数据库迁移..."
DATABASE_URL="file:./data/db.sqlite" npx prisma migrate deploy

# 10. Build
echo "构建项目..."
npm run build

# 11. 创建 admin 账号
echo "初始化 admin 账号..."
DATABASE_URL="file:./data/db.sqlite" node scripts/create-admin.js || true

# 12. 配置环境变量
if [ ! -f ".env.local" ]; then
    echo "创建 .env.local..."
    cat > .env.local << 'EOF'
DATABASE_URL="file:./data/db.sqlite"
NEXTAUTH_SECRET="CHANGE_THIS_TO_A_RANDOM_SECRET"
NEXTAUTH_URL="http://YOUR_SERVER_IP"
DEEPSEEK_API_KEY="sk-your-deepseek-api-key-here"
DEEPSEEK_BASE_URL="https://api.deepseek.com"
DEEPSEEK_MODEL="deepseek-chat"
EOF
fi

# 13. 启动/重启 PM2
echo "启动 PM2..."
pm2 delete xhs-generator 2>/dev/null || true
pm2 start ecosystem.config.json
pm2 save
pm2 startup 2>/dev/null || true

# 14. 配置 Nginx
echo "配置 Nginx..."
sudo cp nginx.conf /etc/nginx/sites-available/xhs-generator
sudo ln -sf /etc/nginx/sites-available/xhs-generator /etc/nginx/sites-enabled/xhs-generator
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "=== 部署完成！==="
echo "访问地址：http://124.220.46.239"
echo "管理员账号：admin / 1234"
