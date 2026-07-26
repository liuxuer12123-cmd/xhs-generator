'use client'

import { useState } from 'react'

interface TitlesSectionProps {
  titles: string[]
  topic: string
  body?: string
  onUpdate: (titles: string[]) => void
  versions: string[][]
  onRevert: (idx: number) => void
  optimizeCount: number
  optimizeLimit: number
  onOptimize: () => void
}

export function TitlesSection({ titles, topic, body, onUpdate, versions, onRevert, optimizeCount, optimizeLimit, onOptimize }: TitlesSectionProps) {
  const [selected, setSelected] = useState<number | null>(0)
  const [suggestion, setSuggestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  const handleRegenerate = async () => {
    const isLimited = optimizeLimit !== Infinity && optimizeCount >= optimizeLimit
    if (isLimited) return
    setLoading(true)
    try {
      const res = await fetch('/api/generate/regenerate-titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, suggestion, bodyContent: body }),
      })
      const data = await res.json()
      if (data.titles) {
        onOptimize()
        onUpdate(data.titles)
        setSelected(0)
        setSuggestion('')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (title: string, idx: number) => {
    navigator.clipboard.writeText(title)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <span className="text-lg">✏️</span> 标题
          <span className="text-xs text-gray-400 font-normal">（点击选择，右侧复制）</span>
        </h2>
        {versions.length > 0 && (
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 px-2.5 py-1.5 border border-gray-200 rounded-full hover:border-gray-300 transition-colors"
          >
            🕐 历史版本 ({versions.length})
          </button>
        )}
      </div>

      {/* Version history panel */}
      {showHistory && versions.length > 0 && (
        <div className="mb-3 border border-amber-100 rounded-xl bg-amber-50 p-3">
          <p className="text-xs font-medium text-amber-700 mb-2">📋 历史版本（点击回退）</p>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {versions.map((v, idx) => (
              <button
                key={idx}
                onClick={() => { onRevert(idx); setShowHistory(false); setSelected(0) }}
                className="w-full text-left px-3 py-2 bg-white hover:bg-amber-100 border border-amber-100 rounded-lg text-xs text-amber-800 transition-colors"
              >
                版本 {idx + 1}：{v[0]?.slice(0, 20)}...
                <span className="text-amber-400 ml-2">← 回退</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2 mb-4">
        {titles.map((title, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm transition-all ${
              selected === i
                ? 'border-brand bg-red-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <button
              onClick={() => setSelected(selected === i ? null : i)}
              className="flex items-center gap-2 flex-1 text-left min-w-0"
            >
              <span className="text-gray-300 text-xs flex-shrink-0">#{i + 1}</span>
              <span className={`flex-1 ${selected === i ? 'text-brand font-medium' : 'text-gray-700'}`}>
                {title}
              </span>
              {selected === i && (
                <span className="text-brand text-xs flex-shrink-0">✓ 已选</span>
              )}
            </button>
            <button
              onClick={() => handleCopy(title, i)}
              className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                copiedIdx === i
                  ? 'bg-green-100 text-green-600'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
              }`}
            >
              {copiedIdx === i ? '✓ 已复制' : '复制'}
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={suggestion}
          onChange={(e) => setSuggestion(e.target.value)}
          placeholder="输入修改建议，如：更有吸引力、加 emoji、突出功效..."
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-colors"
          onKeyDown={(e) => e.key === 'Enter' && handleRegenerate()}
        />
        <button
          onClick={handleRegenerate}
          disabled={loading || (optimizeLimit !== Infinity && optimizeCount >= optimizeLimit)}
          className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-xl hover:bg-brand-dark disabled:bg-gray-200 disabled:text-gray-400 transition-colors whitespace-nowrap"
        >
          {loading ? '生成中...' : '重新生成'}
        </button>
      </div>
      {optimizeLimit !== Infinity && (
        <div className={`mt-2 text-xs text-center ${optimizeCount >= optimizeLimit ? 'text-red-400' : 'text-gray-400'}`}>
          {optimizeCount >= optimizeLimit
            ? '🚫 标题重生成次数已用完（重新生成帖子可重置）'
            : `标题重生成次数：${optimizeCount}/${optimizeLimit}`
          }
        </div>
      )}
    </div>
  )
}
