import { prisma } from '@/lib/prisma'

interface LlmConfig {
  baseUrl: string
  apiKey: string
  modelName: string
}

async function getLlmConfig(userId?: string | null): Promise<LlmConfig> {
  // Try user's custom config first
  if (userId) {
    const userConfig = await prisma.llmConfig.findUnique({
      where: { userId },
    })
    if (userConfig) {
      return {
        baseUrl: userConfig.baseUrl,
        apiKey: userConfig.apiKey,
        modelName: userConfig.modelName,
      }
    }
  }
  // Fallback to default DeepSeek config
  return {
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    modelName: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
  }
}

export async function callLlm(
  prompt: string,
  userId?: string | null,
  systemPrompt?: string
): Promise<string> {
  const config = await getLlmConfig(userId)

  const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.modelName,
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`LLM API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

// ===== Prompt builders =====

export function buildCardPrompt(
  topic: string,
  extraContent: string,
  templateDescription: string
): string {
  return `你是一个小红书图文内容创作专家，擅长生成精美的小红书竖版信息图。
根据以下信息，生成符合指定模板风格的小红书信息图（HTML+CSS）。

主题：${topic}
补充内容（仅作参考素材，需提炼语言、优化表达，不要直接抄写原文）：${extraContent || '无'}
模板风格：${templateDescription}

【⚠️ 关键尺寸要求 — 必须严格执行】
- 每一张卡片必须固定为：width:1080px; height:1440px; overflow:hidden
- 不允许内容撑高卡片，超出部分自动裁切（overflow:hidden）
- 多张卡片时，所有卡片高度统一为 1440px，在 body 内垂直排列
- 卡片内部内容区需预留足够上下间距（padding 60px 以上），让内容自然填满但不超出

【字号排版规范】
- 封面大字/主标题：72~88px，粗体（bold/900）
- 分节标题：44~52px，粗体
- 正文/步骤文字：30~34px，行高 1.7
- 注释/标签小字：24~26px
- emoji 装饰与同行文字字号一致，不要单独放大
- 每张卡片内内容量控制好，宁可少不要撑破卡片高度

【内容创作规范】
- 补充内容仅作为素材参考，需要你提炼核心要点、优化语言、做到精炼有力
- 不要直接复制粘贴补充内容的原文，要用小红书风格重新组织表达
- 内容结构按模板风格描述执行

【视觉规范】
- 严格遵循模板风格描述的颜色、布局、字体风格
- 不要使用任何外部图片链接，装饰元素一律用 CSS 色块/形状或 emoji 代替
- body: display:flex; flex-direction:column; align-items:center; gap:30px; padding:30px; background:#e8e8e8（卡片间灰色间隔）

【输出规范】
- 输出完整的 HTML 文档（包含 <!DOCTYPE html><html><head><body>），所有样式用内联 style 属性
- 只输出 HTML 代码，不要任何解释文字，不要 markdown 代码块标记（不要 \`\`\`html）`
}

export function buildTitlesPrompt(topic: string, suggestion?: string): string {
  return `你是小红书爆款标题专家。
根据主题「${topic}」，按以下公式生成 5 个吸引人的小红书标题。
${suggestion ? `优化要求：${suggestion}` : ''}

【标题公式】emoji(1-2个) + 诉求词 + 核心词 + 效果承诺
【诉求词词库】减脂、瘦身、控糖、高蛋白、懒人、10分钟、低卡、宝藏、超简单、营养满分（选最匹配的1个）
【效果承诺词库】越吃越瘦、营养爆炸、满足感超强、好吃不踩雷、学会了少外卖、吃不胖、越来越健康（选最匹配的1个）
【强制规范】每个标题含emoji，总字数（含emoji）20-25字，emoji 必须与内容相关

只输出 JSON 数组格式，例如：["标题1","标题2","标题3","标题4","标题5"]
不要任何解释，只输出 JSON 数组。`
}

export function buildBodyPrompt(
  topic: string,
  extraContent: string,
  suggestion?: string
): string {
  return `你是小红书正文写作专家。
根据主题「${topic}」和补充内容「${extraContent || '无'}」，生成一篇小红书正文。
${suggestion ? `优化要求：${suggestion}` : ''}

【内容规范】
- 字数：300-500字（食谱/教程类）或 400-600字（科普/分享类）
- 步骤类内容：每步格式「动词 + 食材 + 时间/状态」，如「中火翻炒约3分钟至金黄」
- 营养/数据：所有数值前加「约」字，禁止精确声称
- 排版符号：用 ✅ 标注亮点/卖点，💡 标注贴士，🔥 标注重点
- 结尾：引导互动（如「你们试过这个方法吗？评论区告诉我～」）

【风格要求】
- 口语化、有温度，像朋友分享而非说明书
- 适当使用 emoji 分段，增加可读性
- 避免绝对化表达（如「最好」「第一」）

只输出正文内容，不要标题，不要任何解释。`
}
