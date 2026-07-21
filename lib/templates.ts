export interface Template {
  id: string
  name: string
  image: string
  description: string
}

export const TEMPLATES: Template[] = [
  {
    id: 'template-recipe',
    name: '清新食谱风',
    image: '/templates/template-recipe.png',
    description: `清新食谱风 — 暖橙米白手作感，生成多张连续卡片（共3-5张，包含封面卡+食材卡+步骤卡+成品/总结卡）垂直排列在一个 HTML 文件中。

【整体 HTML 结构】
- body: display:flex; flex-direction:column; align-items:center; gap:30px; padding:30px; background:#f0e8d8
- 每张卡片: width:1080px; height:1440px; position:relative; overflow:hidden; background:#fef3e2（暖米白）
- 卡片顶部和底部可用暖橙色横幅装饰（background:#f97316; height:60px）

【内容区设计】
- 内容区圆角卡片：background:#fff; border-radius:24px; box-shadow:0 4px 20px rgba(249,115,22,0.10); margin:40px 60px; padding:40px
- 顶部账号名小字（如「@健康食谱」）：font-size:28px; color:#f97316
- 主标题：font-size:78~96px; font-weight:900; color:#1a1a1a，重点词用暖橙色 #f97316
- 副标题/说明行：font-size:32px; color:#888
- 食材行格式：大号 emoji（44px）+ 食材名（34px #333）+ 用量（30px #f97316），左对齐，行高2.0
- 步骤编号：圆形底色 background:#f97316; color:#fff; border-radius:50%; width:52px; height:52px; 内文字36px; 行内居中
- 步骤文字：font-size:30~32px; color:#333; line-height:1.7，含「动词+食材+时间/状态」
- 营养/热量框：background:#fff8f0; border-left:6px solid #f97316; border-radius:12px; padding:20px; font-size:28px; color:#c2410c，数值前加「约」
- Tag 胶囊：background:#f97316; color:#fff; border-radius:20px; padding:8px 20px; font-size:26px
- 底部 footer：font-size:26px; color:#f97316; text-align:center; border-top:1px solid #fde8d0; padding-top:24px

【卡片结构（必须生成多张）】
- 第1张（封面卡）：超大标题 + 副标题介绍 + 核心亮点3条（✅标注）+ 热量/营养标签 + tag胶囊 + footer
- 第2张（食材卡）：食材清单，每行 emoji+食材名+用量，分「主料」「调料」两组
- 第3~N-1张（步骤卡）：分步骤，每张5-6步，步骤编号圆圈+文字，含小贴士（💡）
- 最后1张（成品/总结卡）：成品大 emoji 展示 + 营养总结框 + 小贴士 + 话题标签 + footer

【字体】font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif`,
  },
  {
    id: 'template-collection',
    name: '干货合集风',
    image: '/templates/template-collection.png',
    description: `干货合集风 — 棕黄暖色，信息密度高，生成多张连续卡片（共4-6张，包含封面卡+内容卡+总结卡）垂直排列在一个 HTML 文件中。

【整体 HTML 结构】
- body: display:flex; flex-direction:column; align-items:center; gap:30px; padding:30px; background:#e8d5b0
- 每张卡片: width:1080px; height:1440px; position:relative; overflow:hidden; background:#f5e6c8（棕黄）
- 卡片顶部标语横幅：background:#5c3d1e; color:#fff; border-radius:12px; margin:30px 60px 0; padding:14px 28px; font-size:28px

【内容区设计】
- 内容区：margin:20px 60px; background:#fff8ee; border-radius:20px; padding:36px; box-shadow:0 4px 16px rgba(92,61,30,0.10)
- 顶部账号名小字：font-size:28px; color:#8b5e3c
- 主标题：font-size:88~108px; font-weight:900; color:#3d2008，数字/关键词用 #c0392b 红色
- 副标题 tag 行：display:flex; gap:12px；每个 tag：background:#5c3d1e; color:#fff; border-radius:20px; padding:8px 20px; font-size:26px
- 宫格卡片区：display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin:24px 0
  - 每格：background:#fff; border-radius:20px; overflow:hidden
  - 格内图示区：height:160px; background:linear-gradient(135deg,#f5e6c8,#e8c87a); display:flex; align-items:center; justify-content:center; font-size:64px（用emoji）
  - 格内标题：font-size:30px; font-weight:700; color:#3d2008; padding:10px 14px 4px
  - 格内描述：font-size:24px; color:#666; padding:0 14px 14px; line-height:1.5
- 步骤/通用说明区：background:#e8c87a; border-radius:14px; padding:16px 24px; margin:16px 0
  - 步骤行：圆形编号（background:#5c3d1e; color:#fff; border-radius:50%; width:48px; height:48px）+ 文字（font-size:28px; color:#3d2008）
- 底部 footer：font-size:26px; color:#8b5e3c; text-align:center; border-top:1px solid #d4a373; padding-top:24px

【卡片结构（必须生成多张）】
- 第1张（封面卡）：顶部标语 + 超大标题（含数字，如「6款」「10个」）+ 副标题 tag 行 + 亮点3条（✅）+ footer
- 第2~N-1张（内容卡）：每张展示3-6个宫格条目，含图示emoji+标题+描述+食材/调料列表
- 最后1张（总结/步骤卡）：通用步骤横幅 + 4步骤说明 + 💡 贴士 + 话题标签 + footer

【字体】font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif`,
  },
  {
    id: 'template-science',
    name: '科普知识风',
    image: '/templates/template-science.png',
    description: `科普知识风 — 浅绿背景，红蓝双色冲击大标题，条目清晰，生成多张连续卡片（共4-6张，包含封面卡+内容卡+总结卡）垂直排列在一个 HTML 文件中。

【整体 HTML 结构】
- body: display:flex; flex-direction:column; align-items:center; gap:30px; padding:30px; background:#d0e8c8
- 每张卡片: width:1080px; height:1440px; position:relative; overflow:hidden; background:#e8f5e0（浅绿）
- 卡片可加绿色边框装饰：border:4px solid #81c784; border-radius:24px

【内容区设计】
- 内容区：margin:40px 60px; background:#fff; border-radius:20px; padding:40px; box-shadow:0 4px 20px rgba(76,175,80,0.12)
- 顶部账号名小字：font-size:28px; color:#4caf50
- 主标题第一行：font-size:96~108px; font-weight:900; color:#cc0000（鲜红）
- 主标题第二行：font-size:88~96px; font-weight:900; color:#1a56db（深蓝）
- 两行叠加形成强烈视觉冲击，下方 28px 灰色副标题说明
- 分节标签：background:#f97316; color:#fff; border-radius:20px; padding:8px 24px; font-size:30px; font-weight:700（如「1.李子(含糖量约8.7g/100g)」）
- 条目内容区：display:flex; align-items:flex-start; gap:20px; margin:16px 0; padding:16px; background:#f9fbe7; border-radius:12px
  - 右侧大 emoji：font-size:80~100px; flex-shrink:0（作为水彩风格图示）
  - 左侧文字列表（4行）：font-size:28px; color:#333; line-height:1.8
    - •升糖指数：低（约XX）
    - •特点：...
    - •建议：每日X个，...
    - •营养亮点：...
- 条目分割线：border-bottom:1px solid #c8e6c9; margin:20px 0
- 底部绿色横幅：background:#4caf50; color:#fff; padding:20px; text-align:center; font-size:26px; border-radius:0 0 20px 20px

【卡片结构（必须生成多张）】
- 第1张（封面卡）：红蓝双色大标题 + 副标题 + 内容概览3条（✅）+ 数据来源说明 + footer
- 第2~N-1张（内容卡）：每张展示3-4个条目，含橙色标签+emoji图示+4行说明文字
- 最后1张（总结卡）：汇总表格或对比列表 + 💡 贴士 + 话题标签 + 绿色底部横幅

【字体】font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif`,
  },
  {
    id: 'template-diary',
    name: '日记分享风',
    image: '/templates/template-diary.png',
    description: `日记分享风 — 仿照小红书真实日记帖风格，生成多张连续卡片（共4-6张，包含封面卡+内容卡+总结卡）垂直排列在一个 HTML 文件中。

【整体 HTML 结构】
- body: display:flex; flex-direction:column; align-items:center; gap:30px; padding:30px; background:#e8e8e8
- 每张卡片: width:1080px; height:1440px; position:relative; overflow:hidden; background:#f7ede0（暖米色）
- 卡片两侧必须有斜纹装饰条（用 ::before/::after 或绝对定位div实现），宽度80px，图案：45° repeating-linear-gradient，颜色 #d4a373 和 #e9c9a0 交替

【内容区设计】可参考如下阑尾炎保守治疗帖子的格式，如果是其他主题可以相应泛化：
- 内容区圆角卡片：background:#fbeee6; border-radius:24px; box-shadow:0 4px 20px rgba(0,0,0,0.08); margin:40px 100px; padding:40px
- 顶部账号名小字（如「@治疗日记」）：font-size:28px; color:#999
- 主标题：font-size:78~96px; font-weight:900; color:#1a1a1a，重点词用红色 #c0392b
- 副标题/说明行：font-size:32px; color:#666
- 正文内容文字：font-size:30~34px; color:#333; line-height:1.7
- emoji 装饰行：font-size:40~44px，✅ 标可食用/推荐，❌ 标禁忌/注意，3-5个并排
- 警示/免责框：background:#fff3cd; border-left:6px solid #e6a23c; border-radius:12px; padding:20px; font-size:28px; color:#856404
- Tag 胶囊：display:inline-block; background:#c0392b; color:#fff; border-radius:20px; padding:8px 20px; font-size:26px，或 border:2px solid #c0392b; color:#c0392b; background:transparent
- 底部 footer 标语：font-size:28px; color:#888; text-align:center; border-top:1px solid #e0c9b3; padding-top:24px; font-style:italic

【卡片结构（必须生成多张）】
- 第1张（封面卡）：超大主标题 + 3行副标题概括全文 + 3-4个 tag 胶囊 + 警示/免责框 + footer
- 第2~N-1张（内容卡）：按时间线/阶段拆分，每张5行内容，含 emoji 行 + 正文 + footer
- 最后1张（总结卡）：总结要点、emoji 推荐/禁忌列表 + 鼓励语 + footer

【字体】font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif`,
  },
]

export function getTemplateById(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id)
}
