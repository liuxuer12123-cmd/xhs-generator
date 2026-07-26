import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { callLlm, buildTitlesPrompt } from '@/lib/llm'

export async function POST(req: Request) {
  try {
    const { topic, suggestion, bodyContent } = await req.json()
    if (!topic) {
      return NextResponse.json({ error: '缺少主题' }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || null

    const titlesRaw = await callLlm(buildTitlesPrompt(topic, bodyContent, suggestion), userId)

    let titles: string[] = []
    try {
      const match = titlesRaw.match(/\[[\s\S]*\]/)
      titles = match ? JSON.parse(match[0]) : [titlesRaw]
    } catch {
      titles = [titlesRaw]
    }

    return NextResponse.json({ titles })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '生成失败'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
