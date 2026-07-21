import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { callLlm } from '@/lib/llm'
import { getTemplateById } from '@/lib/templates'

export async function POST(req: Request) {
  try {
    const { originalHtml, suggestion, templateId } = await req.json()
    if (!originalHtml || !suggestion) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 })
    }

    const template = getTemplateById(templateId)
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || null

    const prompt = `你是小红书图文内容创作专家，擅长生成精美的小红书竖版信息图。
以下是当前的 HTML 信息图代码，请根据修改建议进行优化，保持原有模板风格。
${template ? `模板风格：${template.description}` : ''}

修改建议：${suggestion}

当前 HTML：
${originalHtml}

【⚠️ 关键尺寸要求】每张卡片固定 width:1080px; height:1440px; overflow:hidden，不允许内容撑高
【字号规范】主标题 72~88px，分节标题 44~52px，正文 30~34px（行高1.7），小字 24~26px
【内容符号】✅ 标注亮点，💡 标注贴士，🔥 标注重点
【输出规范】只输出完整 HTML 文档，所有样式内联，不要任何解释，不要 \`\`\`html 标记`

    const cardHtml = await callLlm(prompt, userId)
    return NextResponse.json({ cardHtml })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '优化失败'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
