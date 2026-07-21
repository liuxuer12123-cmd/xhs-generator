import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const generations = await prisma.generation.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      topic: true,
      templateId: true,
      createdAt: true,
      titles: true,
    },
  })

  return NextResponse.json(
    generations.map((g) => ({
      ...g,
      titles: JSON.parse(g.titles),
    }))
  )
}
