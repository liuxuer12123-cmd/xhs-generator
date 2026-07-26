'use client'

import { useState } from 'react'

interface BodySectionProps {
  body: string
  topic: string
  extraContent?: string
  onUpdate: (body: string) => void
  versions: string[]
  onRevert: (idx: number) => void
  optimizeCount: number
  optimizeLimit: number
  onOptimize: () => void
}

export function BodySection({ body, topic, extraContent, onUpdate, versions, onRevert, optimizeCount, optimizeLimit, onOptimize }: BodySectionProps) {
  const [suggestion, setSuggestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const handleOptimize = async () => {
    if (!suggestion.trim()) return
    const isLimited = optimizeLimit !== Infinity && optimizeCount >= optimizeLimit
    if (isLimited) return
    setLoading(true)
    try {
      const res = await fetch('/api/generate/optimize-body', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalBody: body, suggestion, topic, extraContent }),
      })
      const data = await res.json()
      if (data.body) {
        onOptimize()
        onUpdate(data.body)
        setSuggestion('')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(body)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <span className="text-lg">📝</span> 正文
        </h2>
        <div className="flex items-center gap-2">
          {versions.length > 0 && (
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 px-2.5 py-1.5 border border-gray-200 rounded-full hover:border-gray-300 transition-colors"
            >
              🕐 历史版本 ({versions.length})
            </button>
          )}
          <button
            onClick={handleCopy}
            className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 border border-gray-200 rounded-full hover:border-gray-300 transition-colors"
          >
            {copied ? '✓ 已复制' : '复制正文'}
          </button>
        </div>
      </div>

      {/* Version history panel */}
      {showHistory && versions.length > 0 && (
        <div className="mb-3 border border-amber-100 rounded-xl bg-amber-50 p-3">
          <p className="text-xs font-medium text-amber-700 mb-2">📋 历史版本（点击回退）</p>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {versions.map((v, idx) => (
              <button
                key={idx}
                onClick={() => { onRevert(idx); setShowHistory(false) }}
                className="w-full text-left px-3 py-2 bg-white hover:bg-amber-100 border border-amber-100 rounded-lg text-xs text-amber-800 transition-colors"
              >
                版本 {idx + 1}：{v.slice(0, 30)}...
                <span className="text-amber-400 ml-2">← 回退</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap min-h-[120px] mb-4">
        {body}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={suggestion}
          onChange={(e) => setSuggestion(e.target.value)}
          placeholder="输入修改建议，如：更口语化、加具体步骤、语气更活泼..."
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-colors"
          onKeyDown={(e) => e.key === 'Enter' && handleOptimize()}
        />
        <button
          onClick={handleOptimize}
          disabled={!suggestion.trim() || loading || (optimizeLimit !== Infinity && optimizeCount >= optimizeLimit)}
          className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-xl hover:bg-brand-dark disabled:bg-gray-200 disabled:text-gray-400 transition-colors whitespace-nowrap"
        >
          {loading ? '优化中...' : '优化'}
        </button>
      </div>
      {optimizeLimit !== Infinity && (
        <div className={`mt-2 text-xs text-center ${optimizeCount >= optimizeLimit ? 'text-red-400' : 'text-gray-400'}`}>
          {optimizeCount >= optimizeLimit
            ? '🚫 正文优化次数已用完（重新生成帖子可重置）'
            : `正文优化次数：${optimizeCount}/${optimizeLimit}`
          }
        </div>
      )}
    </div>
  )
}
