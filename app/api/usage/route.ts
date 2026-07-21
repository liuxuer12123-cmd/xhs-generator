import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { headers } from 'next/headers'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const GUEST_LIMIT = 3
const USER_FREE_LIMIT = 10
const ADMIN_EMAIL = 'admin'

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id || null
  const userEmail = (session?.user as { email?: string })?.email || null

  if (!userId) {
    const headersList = await headers()
    const ip =
      headersList.get('x-forwarded-for')?.split(',')[0].trim() ||
      headersList.get('x-real-ip') ||
      'unknown'
    const guestUsage = await prisma.guestUsage.findUnique({ where: { ip } })
    const used = guestUsage?.count ?? 0
    return NextResponse.json({
      type: 'guest',
      used,
      limit: GUEST_LIMIT,
      remaining: Math.max(0, GUEST_LIMIT - used),
      unlimited: false,
    })
  }

  if (userEmail === ADMIN_EMAIL) {
    return NextResponse.json({ type: 'admin', unlimited: true })
  }

  const llmConfig = await prisma.llmConfig.findUnique({ where: { userId } })
  if (llmConfig) {
    return NextResponse.json({ type: 'custom_api', unlimited: true })
  }

  const used = await prisma.generation.count({ where: { userId } })
  return NextResponse.json({
    type: 'user_free',
    used,
    limit: USER_FREE_LIMIT,
    remaining: Math.max(0, USER_FREE_LIMIT - used),
    unlimited: false,
  })
}
