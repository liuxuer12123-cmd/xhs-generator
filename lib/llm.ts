import { prisma } from '@/lib/prisma'

interface LlmConfig {
  baseUrl: string
  apiKey: string
  modelName: string
}

// ===== 平台合规规则（小红书/广告法违禁词）=====
// 注入到所有 prompt，让模型在生成时主动规避
const COMPLIANCE_RULES = `
【⚠️ 平台合规要求 — 以下规则必须严格遵守，否则内容将被平台删除】

🔴 绝对禁止使用的词汇（直接违规）：
- 疾病治疗类：治疗、根治、治愈、疗效、处方、降血糖、降血压、降血脂、抗癌、防癌、增强免疫力、改善睡眠、助眠、增高、治疗便秘
- 减肥塑形类：减肥、燃脂、快速减脂、xx天瘦xx斤、溶脂、吸脂、体重不反弹
- 美容祛斑类：美白（直接宣称）、淡斑、祛斑、去除皱纹、换肤、抑制黑色素
- 排毒养生类：排毒、清热解毒、祛湿（宣称功效）、补肾、活血、补气血
- 极限词：最好、最佳、第一、唯一、顶级、极品、独家、国家认证、专家推荐
- 虚假承诺：100%有效、零风险、特效、神效、永久（效果）

✅ 合规替代策略：
- 用"感受/体验"代替"功效"：如「整个人状态不一样了」替代「增强免疫力」
- 用场景代替疗效：如「睡前放松仪式感」替代「改善睡眠」
- 用用户故事代替量化：如「裤子小了一码」替代「瘦了20斤」
- 减肥→管理体重/低卡轻食，美白→肤色透亮感，排毒→轻盈日常
- 改善睡眠→睡前放松，增强免疫力→日常养护好状态
`

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
    // 推理模型（如 deepseek-v4-pro）需要较长思考时间，设置 5 分钟超时
    signal: AbortSignal.timeout(300000),
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
  templateDescription: string,
  isWeightLoss?: boolean
): string {
  return `你是一个小红书图文内容创作专家，擅长生成精美的小红书竖版信息图。
根据以下信息，生成符合指定模板风格的小红书信息图（HTML+CSS）。

主题：${topic}
补充内容（仅作参考素材，需提炼语言、优化表达，不要直接抄写原文）：${extraContent || '无'}
模板风格：${templateDescription}
${isWeightLoss ? `
【🔥 热量侦探模式 — 减脂/减重主题专属】
本帖主题与管理体重/低卡饮食相关，请在卡片中安排一个「营养参考」区块，展示核心食材的热量估算：
- 列出 3-5 种主要食材，格式：食材名 | 每100g约 XX 大卡 | 蛋白质 Xg / 碳水 Xg / 脂肪 Xg
- 区块标题用：🔥 热量参考（每100g）
- 文字小巧精炼，放在卡片底部或独立一张卡，风格与整体协调
- 热量数据参考：米饭130kcal 鸡胸肉165kcal 鸡蛋155kcal 虾106kcal 青菜20kcal 豆腐80kcal 燕麦389kcal 牛油果160kcal
` : ''}
${COMPLIANCE_RULES}

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

export function buildTitlesPrompt(topic: string, bodyContent?: string, suggestion?: string): string {
  const bodyRef = bodyContent
    ? `\n\n【参考正文内容（标题必须与以下内容高度呼应，提炼核心卖点）】\n${bodyContent.slice(0, 500)}`
    : ''
  return `你是小红书爆款标题专家，深度研究过10万+爆款帖子的标题规律。
根据主题「${topic}」，生成 5 个风格各异、吸引人的小红书标题。
${suggestion ? `优化要求：${suggestion}` : ''}${bodyRef}

【核心公式】emoji(1-2个) + 诉求词 + 核心词 + 效果承诺

【诉求词库】（选最贴合主题的1个）
减脂、瘦身、控糖、高蛋白、懒人、10分钟、低卡、宝藏、超简单、营养满分、超好吃、零失败

【效果承诺词库】（选最贴合主题的1个）
越吃越瘦、营养爆炸、满足感超强、好吃不踩雷、学会了少外卖、超级上头、吃不胖、越做越好吃、越来越健康、绝对回购

【emoji词库】（与食物/健康相关，优先选）
🥗🥑🌾🍳🥦🫐🥕🍲🥣🫚🍱🥘🫕🥙🌮🥤🧃🍵☕🔥✨💪

【5个标题要做到风格差异化，不能全部套同一模式】
- 第1个：用诉求词+效果承诺的标准公式
- 第2个：突出时间效率（如"10分钟""5步"）或简单程度
- 第3个：强调营养/健康卖点，加具体数字或场景
- 第4个：反向/悬念角度（如"没想到XX原来这么好吃""一直吃错了XX"）
- 第5个：情感共鸣角度（如"每周必做""减脂期救星""越来越爱吃"）

【重要：标题必须与参考正文内容高度关联，提炼正文中的具体卖点、步骤亮点或数据】

【强制规范】
- 每个标题必须含 1-2 个 emoji，放在开头
- 标题总字数（含emoji）：20-25字，超出必须截断
- emoji 必须与食物或健康相关，不要用不相关的装饰性 emoji

${COMPLIANCE_RULES}
只输出 JSON 数组格式，例如：["标题1","标题2","标题3","标题4","标题5"]
不要任何解释，只输出 JSON 数组。`
}

export function buildBodyPrompt(
  topic: string,
  extraContent: string,
  suggestion?: string,
  isWeightLoss?: boolean
): string {
  return `你是小红书正文写作专家。
根据主题「${topic}」和补充内容「${extraContent || '无'}」，生成一篇小红书正文。
${suggestion ? `优化要求：${suggestion}` : ''}
${isWeightLoss ? `
【🔥 热量侦探模式 — 减脂主题专属要求】
本帖主题与管理体重/低卡饮食相关，正文中需包含：
1. 核心食材的热量/营养数据小科普（格式：「每100g约XX大卡，蛋白质Xg」），至少提及2-3种主要食材
2. 一个「低卡小技巧」或「减脂替换」的实用建议（如「用鸡胸肉代替五花肉，热量减半」）
3. 参考热量数据：鸡胸肉165kcal 虾106kcal 鸡蛋155kcal 豆腐80kcal 燕麦389kcal 牛油果160kcal 米饭130kcal 番茄18kcal 黄瓜16kcal 西兰花34kcal（每100g）
注意：所有数字前加「约」字，以合规表达呈现（如「低卡配餐」而非「减肥餐」）
` : ''}

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

【话题标签要求】
正文末尾必须另起一行，输出 12-15 个话题标签，三层结构：
- 第一层（必含，3个固定）：#健康饮食 #营养食谱 #[核心主题词]
- 第二层（3-4个，从以下选最匹配的）：减脂餐、低卡料理、家常菜、懒人食谱、健身餐、高蛋白食谱、一日三餐、营养均衡、素食、控糖饮食
- 第三层（4-5个，结合具体内容生成长尾标签）：格式 #[食材/主题]+做法 / #[食材]+减脂 / #[场景]+饮食

示例标签格式：
#健康饮食 #营养食谱 #燕麦 #减脂餐 #低卡料理 #懒人食谱 #燕麦怎么做好吃 #燕麦减脂吃法 #早餐食谱分享 #健康生活方式 #减脂早餐 #控糖饮食 #营养早餐

${COMPLIANCE_RULES}
只输出正文内容（含末尾标签），不要标题，不要任何解释。`
}

// ===== 热量侦探：减脂/减重主题检测 =====
// 检测主题是否与管理体重、低卡饮食相关
export function isWeightLossTopic(topic: string): boolean {
  const keywords = [
    '减脂', '减重', '管理体重', '低卡', '低热量', '卡路里', '热量',
    '瘦身餐', '健身餐', '减脂餐', '控脂', '燃脂', '纤体', '轻食',
    '控糖', '低碳', '生酮', '增肌', '体脂', '塑形',
    '减肥', '减体重', '体重管理', '瘦', '纤细',
  ]
  const lowerTopic = topic.toLowerCase()
  return keywords.some(kw => lowerTopic.includes(kw))
}
