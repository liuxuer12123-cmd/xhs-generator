import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { headers } from 'next/headers'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  callLlm,
  buildCardPrompt,
  buildTitlesPrompt,
  buildBodyPrompt,
} from '@/lib/llm'
import { getTemplateById } from '@/lib/templates'

// 允许推理模型（如 deepseek-v4-pro）有足够时间生成内容
export const maxDuration = 300

const GUEST_LIMIT = 3
const USER_FREE_LIMIT = 10
const ADMIN_EMAIL = 'admin'

export async function POST(req: Request) {
  try {
    const { topic, extraContent, templateId } = await req.json()

    if (!topic || !templateId) {
      return NextResponse.json({ error: '请填写主题并选择模板' }, { status: 400 })
    }

    const template = getTemplateById(templateId)
    if (!template) {
      return NextResponse.json({ error: '模板不存在' }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || null
    const userEmail = (session?.user as { email?: string })?.email || null

    // ===== Usage limit checks =====
    if (!userId) {
      // Guest: limit by IP
      const headersList = await headers()
      const ip =
        headersList.get('x-forwarded-for')?.split(',')[0].trim() ||
        headersList.get('x-real-ip') ||
        'unknown'

      const guestUsage = await prisma.guestUsage.upsert({
        where: { ip },
        update: {},
        create: { ip, count: 0 },
      })

      if (guestUsage.count >= GUEST_LIMIT) {
        return NextResponse.json(
          {
            error: `免费体验已用完（限${GUEST_LIMIT}次），请登录后继续使用`,
            limitReached: true,
            type: 'guest',
          },
          { status: 403 }
        )
      }

      // Increment guest count
      await prisma.guestUsage.update({
        where: { ip },
        data: { count: { increment: 1 } },
      })
    } else {
      // Logged-in user
      const isAdmin = userEmail === ADMIN_EMAIL

      if (!isAdmin) {
        // Check if user has custom LLM config
        const llmConfig = await prisma.llmConfig.findUnique({ where: { userId } })
        const hasCustomApi = !!llmConfig

        if (!hasCustomApi) {
          // Count free usages (generations without custom API = all their generations)
          const usageCount = await prisma.generation.count({
            where: { userId },
          })

          if (usageCount >= USER_FREE_LIMIT) {
            return NextResponse.json(
              {
                error: `免费次数已用完（限${USER_FREE_LIMIT}次），请在设置中配置自己的 API Key 以无限使用`,
                limitReached: true,
                type: 'user',
                usageCount,
                limit: USER_FREE_LIMIT,
              },
              { status: 403 }
            )
          }
        }
      }
    }

    // ===== LLM generation =====
    const [cardHtml, titlesRaw, body] = await Promise.all([
      callLlm(buildCardPrompt(topic, extraContent || '', template.description), userId),
      callLlm(buildTitlesPrompt(topic), userId),
      callLlm(buildBodyPrompt(topic, extraContent || ''), userId),
    ])

    // Parse titles JSON
    let titles: string[] = []
    try {
      const match = titlesRaw.match(/\[[\s\S]*\]/)
      titles = match ? JSON.parse(match[0]) : [titlesRaw]
    } catch {
      titles = [titlesRaw]
    }

    // Save to DB if logged in
    if (userId) {
      await prisma.generation.create({
        data: {
          userId,
          topic,
          extraContent: extraContent || null,
          templateId,
          cardHtml,
          titles: JSON.stringify(titles),
          body,
        },
      })
    }

    // Return remaining usage info
    let usageInfo: { remaining?: number; unlimited: boolean } = { unlimited: true }
    if (!userId) {
      const headersList = await headers()
      const ip =
        headersList.get('x-forwarded-for')?.split(',')[0].trim() ||
        headersList.get('x-real-ip') ||
        'unknown'
      const guestUsage = await prisma.guestUsage.findUnique({ where: { ip } })
      const used = guestUsage?.count ?? 1
      usageInfo = { remaining: Math.max(0, GUEST_LIMIT - used), unlimited: false }
    } else if (userEmail !== ADMIN_EMAIL) {
      const llmConfig = await prisma.llmConfig.findUnique({ where: { userId } })
      if (!llmConfig) {
        const usageCount = await prisma.generation.count({ where: { userId } })
        usageInfo = { remaining: Math.max(0, USER_FREE_LIMIT - usageCount), unlimited: false }
      }
    }

    return NextResponse.json({ cardHtml, titles, body, usageInfo })
  } catch (e: unknown) {
    console.error('generate error', e)
    const msg = e instanceof Error ? e.message : '生成失败'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
