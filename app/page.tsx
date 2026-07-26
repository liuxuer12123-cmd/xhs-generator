'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Navbar, HistoryItem } from '@/components/Navbar'
import { CardSection } from '@/components/CardSection'
import { TitlesSection } from '@/components/TitlesSection'
import { BodySection } from '@/components/BodySection'
import { TEMPLATES } from '@/lib/templates'
import Image from 'next/image'

interface GenerationResult {
  cardHtml: string
  titles: string[]
  body: string
  topic: string
  extraContent: string
  templateId: string
}

interface OptimizeCounts {
  card: number
  titles: number
  body: number
}

interface UsageInfo {
  type: string
  unlimited: boolean
  used?: number
  limit?: number
  remaining?: number
}

const STORAGE_KEY = 'xhs-generator-state'

export default function Home() {
  const { data: session } = useSession()
  const [topic, setTopic] = useState('')
  const [extraContent, setExtraContent] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('template-recipe')
  const [loading, setLoading] = useState(false)
  const [loadingSeconds, setLoadingSeconds] = useState(0)
  const loadingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [error, setError] = useState('')
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null)
  const [optimizeCounts, setOptimizeCounts] = useState<OptimizeCounts>({ card: 0, titles: 0, body: 0 })

  // Version histories (persisted to localStorage)
  const [cardVersions, setCardVersions] = useState<string[]>([])
  const [titlesVersions, setTitlesVersions] = useState<string[][]>([])
  const [bodyVersions, setBodyVersions] = useState<string[]>([])

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return
      const state = JSON.parse(saved)
      if (state.result) setResult(state.result)
      if (state.topic) setTopic(state.topic)
      if (state.extraContent) setExtraContent(state.extraContent)
      if (state.selectedTemplate) setSelectedTemplate(state.selectedTemplate)
      if (state.cardVersions) setCardVersions(state.cardVersions)
      if (state.titlesVersions) setTitlesVersions(state.titlesVersions)
      if (state.bodyVersions) setBodyVersions(state.bodyVersions)
    } catch {}
  }, [])

  // Persist to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        result,
        topic,
        extraContent,
        selectedTemplate,
        cardVersions,
        titlesVersions,
        bodyVersions,
      }))
    } catch {}
  }, [result, topic, extraContent, selectedTemplate, cardVersions, titlesVersions, bodyVersions])

  const ADMIN_USERNAME = 'admin'
  const isAdmin = session?.user?.name === ADMIN_USERNAME
  const hasCustomApi = usageInfo?.unlimited && !!session
  const optimizeUnlimited = isAdmin || hasCustomApi
  const optimizeLimit = session ? 5 : 3

  useEffect(() => {
    fetch('/api/usage')
      .then((r) => r.json())
      .then(setUsageInfo)
      .catch(() => {})
  }, [session])

  // ===== Update handlers (save version before update) =====
  const handleCardUpdate = useCallback((html: string) => {
    setResult(prev => {
      if (!prev) return prev
      setCardVersions(v => [...v.slice(-4), prev.cardHtml])
      return { ...prev, cardHtml: html }
    })
  }, [])

  const handleTitlesUpdate = useCallback((titles: string[]) => {
    setResult(prev => {
      if (!prev) return prev
      setTitlesVersions(v => [...v.slice(-4), prev.titles])
      return { ...prev, titles }
    })
  }, [])

  const handleBodyUpdate = useCallback((body: string) => {
    setResult(prev => {
      if (!prev) return prev
      setBodyVersions(v => [...v.slice(-4), prev.body])
      return { ...prev, body }
    })
  }, [])

  // ===== Revert handlers =====
  const handleCardRevert = useCallback((idx: number) => {
    setCardVersions(v => {
      const target = v[idx]
      setResult(prev => prev ? { ...prev, cardHtml: target } : prev)
      return v.slice(0, idx)
    })
  }, [])

  const handleTitlesRevert = useCallback((idx: number) => {
    setTitlesVersions(v => {
      const target = v[idx]
      setResult(prev => prev ? { ...prev, titles: target } : prev)
      return v.slice(0, idx)
    })
  }, [])

  const handleBodyRevert = useCallback((idx: number) => {
    setBodyVersions(v => {
      const target = v[idx]
      setResult(prev => prev ? { ...prev, body: target } : prev)
      return v.slice(0, idx)
    })
  }, [])

  // ===== Generate =====
  const handleGenerate = async () => {
    if (!topic || !selectedTemplate) return
    setLoading(true)
    setLoadingSeconds(0)
    setError('')
    loadingTimerRef.current = setInterval(() => {
      setLoadingSeconds((s) => s + 1)
    }, 1000)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, extraContent, templateId: selectedTemplate }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '生成失败，请重试')
        fetch('/api/usage').then((r) => r.json()).then(setUsageInfo).catch(() => {})
        return
      }
      setResult({ ...data, topic, extraContent, templateId: selectedTemplate })
      setOptimizeCounts({ card: 0, titles: 0, body: 0 })
      setCardVersions([])
      setTitlesVersions([])
      setBodyVersions([])
      fetch('/api/usage').then((r) => r.json()).then(setUsageInfo).catch(() => {})
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
      setLoadingSeconds(0)
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current)
        loadingTimerRef.current = null
      }
    }
  }

  const handleLoadHistory = (item: HistoryItem) => {
    setTopic(item.topic)
    setExtraContent(item.extraContent || '')
    setSelectedTemplate(item.templateId)
    setResult({
      cardHtml: item.cardHtml,
      titles: item.titles,
      body: item.body,
      topic: item.topic,
      extraContent: item.extraContent || '',
      templateId: item.templateId,
    })
    setOptimizeCounts({ card: 0, titles: 0, body: 0 })
    setCardVersions([])
    setTitlesVersions([])
    setBodyVersions([])
  }

  const isLimitReached = usageInfo && !usageInfo.unlimited && (usageInfo.remaining ?? 1) <= 0

  const usageBadge = (() => {
    if (!usageInfo) return null
    if (usageInfo.unlimited) return null
    if (usageInfo.remaining === 0) return { text: '次数已用完', color: 'text-red-500 bg-red-50 border-red-100' }
    if ((usageInfo.remaining ?? 99) <= 2) return { text: `剩余 ${usageInfo.remaining} 次`, color: 'text-orange-500 bg-orange-50 border-orange-100' }
    return { text: `剩余 ${usageInfo.remaining} 次`, color: 'text-gray-400 bg-gray-50 border-gray-100' }
  })()

  return (
    <div className="h-screen bg-[#f5f5f7] flex flex-col overflow-hidden">
      <Navbar onLoadHistory={handleLoadHistory} />

      {!session && (
        <div className="bg-amber-50 border-b border-amber-100 px-6 py-2 text-sm text-amber-700 flex items-center justify-center gap-2">
          <span>📢 <strong>登录后</strong>可保存生成历史</span>
          <a href="/login" className="text-amber-800 font-semibold underline underline-offset-2">去登录</a>
        </div>
      )}

      <div className="flex flex-1 min-h-0" style={{ overflow: 'hidden' }}>

        {/* ===== LEFT PANEL ===== */}
        <div className="w-[480px] flex-shrink-0 bg-white border-r border-gray-100 flex flex-col" style={{ overflowY: 'auto', overflowX: 'hidden' }}>
          <div className="p-7 flex flex-col gap-6 flex-1">

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">帖子主题 *</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="如：木瓜牛奶燕麦奶昔的做法"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">补充内容 <span className="text-gray-300 font-normal normal-case">（可选）</span></label>
              <textarea
                value={extraContent}
                onChange={(e) => setExtraContent(e.target.value)}
                placeholder="补充关键信息、卖点、注意事项..."
                rows={7}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-colors resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">选择模板</label>
              <div className="grid grid-cols-2 gap-3">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t.id)}
                    className={`rounded-xl overflow-hidden border-2 transition-all text-left ${
                      selectedTemplate === t.id
                        ? 'border-brand shadow-lg shadow-brand/20'
                        : 'border-transparent hover:border-gray-200'
                    }`}
                  >
                    <div className="relative w-full aspect-[3/4] bg-gray-100">
                      <Image
                        src={t.image}
                        alt={t.name}
                        fill
                        className="object-cover"
                        sizes="140px"
                      />
                      {selectedTemplate === t.id && (
                        <div className="absolute inset-0 bg-brand/10 flex items-end justify-end p-1.5">
                          <span className="bg-brand text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">✓ 已选</span>
                        </div>
                      )}
                    </div>
                    <div className={`px-2 py-1.5 text-[11px] font-medium text-center ${selectedTemplate === t.id ? 'bg-red-50 text-brand' : 'bg-gray-50 text-gray-600'}`}>
                      {t.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-xs text-red-600">
                ⚠️ {error}
              </div>
            )}

            {usageBadge && (
              <div className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium ${usageBadge.color}`}>
                {usageInfo?.remaining === 0 ? '🚫' : '⚡'} {usageBadge.text}
                {usageInfo?.type === 'guest' && usageInfo.remaining === 0 && (
                  <a href="/login" className="ml-1 underline font-semibold">登录获取更多</a>
                )}
                {usageInfo?.type === 'user_free' && usageInfo.remaining === 0 && (
                  <button
                    onClick={() => document.dispatchEvent(new CustomEvent('open-llm-config'))}
                    className="ml-1 underline font-semibold"
                  >
                    配置 API Key
                  </button>
                )}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={!topic || !selectedTemplate || loading || !!isLimitReached}
              className="w-full py-3 bg-brand hover:bg-brand-dark disabled:bg-gray-100 disabled:text-gray-300 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm mt-auto"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  AI 生成中... {loadingSeconds > 0 && `(${loadingSeconds}s)`}
                </>
              ) : isLimitReached ? '🚫 次数已用完' : '✨ 生成帖子'}
            </button>

          </div>
        </div>

        {/* ===== RIGHT PANEL ===== */}
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
          {!result && !loading ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-8 select-none">
              <div className="text-6xl mb-4 opacity-20">📖</div>
              <p className="text-gray-400 text-sm">填写左侧主题，选择模板</p>
              <p className="text-gray-300 text-xs mt-1">点击「生成帖子」开始创作</p>
            </div>
          ) : loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-3 border-brand border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
              <p className="text-sm text-gray-500 font-medium">AI 正在为你创作中...</p>
              <div className="text-center">
                <p className="text-xs text-gray-400">
                  已等待 <span className="font-semibold text-brand">{loadingSeconds}</span> 秒
                </p>
                <p className="text-xs text-gray-300 mt-1">
                  {loadingSeconds < 30
                    ? '预计需要 30～120 秒，请耐心等待 ☕'
                    : loadingSeconds < 90
                    ? '思考内容中，快好了～'
                    : '内容较复杂，马上就来 🚀'}
                </p>
              </div>
            </div>
          ) : result ? (
            <div className="flex h-full min-h-0">
              {/* Left: Card */}
              <div className="flex-1 min-w-0 overflow-y-auto px-5 py-5">
                <CardSection
                  cardHtml={result.cardHtml}
                  templateId={result.templateId}
                  onUpdate={handleCardUpdate}
                  versions={cardVersions}
                  onRevert={handleCardRevert}
                  optimizeCount={optimizeCounts.card}
                  optimizeLimit={optimizeUnlimited ? Infinity : optimizeLimit}
                  onOptimize={() => setOptimizeCounts((prev) => ({ ...prev, card: prev.card + 1 }))}
                />
              </div>
              {/* Right: Titles + Body */}
              <div className="w-[400px] flex-shrink-0 flex flex-col overflow-y-auto border-l border-gray-100">
                <div className="px-4 py-5 border-b border-gray-100">
                  <TitlesSection
                    titles={result.titles}
                    topic={result.topic}
                    body={result.body}
                    onUpdate={handleTitlesUpdate}
                    versions={titlesVersions}
                    onRevert={handleTitlesRevert}
                    optimizeCount={optimizeCounts.titles}
                    optimizeLimit={optimizeUnlimited ? Infinity : optimizeLimit}
                    onOptimize={() => setOptimizeCounts((prev) => ({ ...prev, titles: prev.titles + 1 }))}
                  />
                </div>
                <div className="px-4 py-5">
                  <BodySection
                    body={result.body}
                    topic={result.topic}
                    extraContent={result.extraContent}
                    onUpdate={handleBodyUpdate}
                    versions={bodyVersions}
                    onRevert={handleBodyRevert}
                    optimizeCount={optimizeCounts.body}
                    optimizeLimit={optimizeUnlimited ? Infinity : optimizeLimit}
                    onOptimize={() => setOptimizeCounts((prev) => ({ ...prev, body: prev.body + 1 }))}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>

      </div>
    </div>
  )
}
