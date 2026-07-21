import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { callLlm, buildBodyPrompt } from '@/lib/llm'

export async function POST(req: Request) {
  try {
    const { originalBody, suggestion, topic, extraContent } = await req.json()
    if (!originalBody || !suggestion) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || null

    const prompt = `${buildBodyPrompt(topic || '', extraContent || '', suggestion)}

当前正文（请在此基础上优化）：
${originalBody}`

    const body = await callLlm(prompt, userId)
    return NextResponse.json({ body })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '优化失败'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
