/**
 * 初始化脚本：创建 admin 账号
 * 运行：node scripts/create-admin.js
 */
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const email = 'admin'
  const password = '1234'

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log('✅ admin 账号已存在，无需重复创建')
    return
  }

  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { email, password: hashed },
  })
  console.log('✅ admin 账号创建成功，id:', user.id)
}

main()
  .catch((e) => { console.error('❌ 创建失败:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
