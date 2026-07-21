'use client'

import Image from 'next/image'
import { TEMPLATES } from '@/lib/templates'

interface ConfigBarProps {
  topic: string
  extraContent: string
  selectedTemplate: string
  loading: boolean
  onTopicChange: (v: string) => void
  onExtraChange: (v: string) => void
  onTemplateChange: (id: string) => void
  onGenerate: () => void
}

export function ConfigBar({
  topic,
  extraContent,
  selectedTemplate,
  loading,
  onTopicChange,
  onExtraChange,
  onTemplateChange,
  onGenerate,
}: ConfigBarProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
      {/* Row 1: Topic + Extra */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">帖子主题 *</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => onTopicChange(e.target.value)}
            placeholder="如：木瓜牛奶燕麦奶昔的做法"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-colors"
          />
        </div>
        <div className="flex-[2]">
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">补充内容（可选）</label>
          <input
            type="text"
            value={extraContent}
            onChange={(e) => onExtraChange(e.target.value)}
            placeholder="补充关键信息、卖点、注意事项..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-colors"
          />
        </div>
      </div>

      {/* Row 2: Templates + Button */}
      <div className="flex items-end gap-4">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-gray-500 mb-2">选择图文模板</label>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => onTemplateChange(t.id)}
                className={`flex-shrink-0 w-[90px] rounded-xl overflow-hidden border-2 transition-all ${
                  selectedTemplate === t.id
                    ? 'border-brand shadow-md shadow-brand/20 scale-105'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="relative w-full h-[120px] bg-gray-100">
                  <Image
                    src={t.image}
                    alt={t.name}
                    fill
                    className="object-cover"
                    sizes="90px"
                  />
                </div>
                <div className="bg-white px-1 py-1 text-center">
                  <span className={`text-[10px] font-medium leading-tight block ${selectedTemplate === t.id ? 'text-brand' : 'text-gray-500'}`}>
                    {t.name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onGenerate}
          disabled={!topic || !selectedTemplate || loading}
          className="flex-shrink-0 flex items-center gap-2 bg-brand hover:bg-brand-dark disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold px-6 py-2.5 rounded-full transition-colors text-sm whitespace-nowrap"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              生成中...
            </>
          ) : (
            <>✨ 生成帖子</>
          )}
        </button>
      </div>
    </div>
  )
}
