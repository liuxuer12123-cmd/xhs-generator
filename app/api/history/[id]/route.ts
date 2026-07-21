import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const gen = await prisma.generation.findFirst({
    where: { id: params.id, userId: session.user.id },
  })
  if (!gen) {
    return NextResponse.json({ error: '记录不存在' }, { status: 404 })
  }

  return NextResponse.json({ ...gen, titles: JSON.parse(gen.titles) })
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  await prisma.generation.deleteMany({
    where: { id: params.id, userId: session.user.id },
  })

  return NextResponse.json({ message: '已删除' })
}
