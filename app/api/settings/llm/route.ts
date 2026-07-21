import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const config = await prisma.llmConfig.findUnique({
    where: { userId: session.user.id },
  })

  if (!config) return NextResponse.json(null)

  return NextResponse.json({
    baseUrl: config.baseUrl,
    modelName: config.modelName,
    // Don't return full API key, just mask it
    apiKey: config.apiKey.slice(0, 8) + '****',
  })
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const { baseUrl, apiKey, modelName } = await req.json()
  if (!baseUrl || !apiKey || !modelName) {
    return NextResponse.json({ error: '请填写所有字段' }, { status: 400 })
  }

  await prisma.llmConfig.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, baseUrl, apiKey, modelName },
    update: { baseUrl, apiKey, modelName },
  })

  return NextResponse.json({ message: '保存成功' })
}
