'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

const CARD_WIDTH = 1080

interface CardSectionProps {
  cardHtml: string
  templateId: string
  onUpdate: (html: string) => void
  optimizeCount: number
  optimizeLimit: number
  onOptimize: () => void
}

export function CardSection({ cardHtml, templateId, onUpdate, optimizeCount, optimizeLimit, onOptimize }: CardSectionProps) {
  const { data: session } = useSession()
  const [suggestion, setSuggestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [iframeHeight, setIframeHeight] = useState(1440)
  const [scale, setScale] = useState(0.5)

  // Version history (only for logged-in users)
  const [history, setHistory] = useState<string[]>([])
  const [showHistory, setShowHistory] = useState(false)

  // When cardHtml changes from outside (new generation), reset history
  const prevCardRef = useRef<string>('')
  useEffect(() => {
    if (cardHtml !== prevCardRef.current) {
      prevCardRef.current = cardHtml
      setHistory([]) // new generation resets history
    }
  }, [cardHtml])

  const updateCard = useCallback((newHtml: string) => {
    if (session) {
      setHistory((prev) => [...prev, cardHtml]) // save current to history before update
    }
    prevCardRef.current = newHtml
    onUpdate(newHtml)
  }, [cardHtml, onUpdate, session])

  const revertTo = (html: string, idx: number) => {
    prevCardRef.current = html
    onUpdate(html)
    setHistory((prev) => prev.slice(0, idx))
    setShowHistory(false)
  }

  // Scale
  const updateScale = useCallback(() => {
    if (wrapperRef.current) {
      const w = wrapperRef.current.offsetWidth
      setScale(w / CARD_WIDTH)
    }
  }, [])

  useEffect(() => {
    updateScale()
    const observer = new ResizeObserver(updateScale)
    if (wrapperRef.current) observer.observe(wrapperRef.current)
    return () => observer.disconnect()
  }, [updateScale])

  // Render HTML into iframe
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) return

    const cleaned = cardHtml
      .replace(/^```html\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()

    doc.open()
    doc.write(cleaned)
    doc.close()

    const resize = () => {
      const h = doc.documentElement?.scrollHeight || doc.body?.scrollHeight || 1440
      setIframeHeight(Math.max(h + 4, 400))
    }
    setTimeout(resize, 400)
    iframe.onload = resize
  }, [cardHtml])

  const handleOptimize = async () => {
    if (!suggestion.trim()) return
    const isLimited = optimizeLimit !== Infinity && optimizeCount >= optimizeLimit
    if (isLimited) return
    setLoading(true)
    try {
      const res = await fetch('/api/generate/optimize-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalHtml: cardHtml, suggestion, templateId }),
      })
      const data = await res.json()
      if (data.cardHtml) {
        onOptimize()  // increment count in parent
        updateCard(data.cardHtml)
        setSuggestion('')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    const iframe = iframeRef.current
    if (!iframe?.contentDocument?.body) return
    setExporting(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(iframe.contentDocument.body, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        width: CARD_WIDTH,
        scrollX: 0,
        scrollY: 0,
        windowWidth: CARD_WIDTH,
      })
      const link = document.createElement('a')
      link.download = `xhs-card-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally {
      setExporting(false)
    }
  }

  const scaledHeight = Math.round(iframeHeight * scale)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2 text-sm">
          <span>🖼️</span> 图文卡片
          <span className="text-xs text-gray-400 font-normal">（1080px 原尺寸，预览已缩放）</span>
        </h2>
        <div className="flex items-center gap-2">
          {/* Version history button — logged in only */}
          {session && history.length > 0 && (
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 px-2.5 py-1.5 border border-gray-200 rounded-full hover:border-gray-300 transition-colors"
            >
              🕐 历史版本 ({history.length})
            </button>
          )}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 px-2.5 py-1.5 border border-gray-200 rounded-full hover:border-gray-300 transition-colors"
          >
            {exporting ? '导出中...' : '📥 导出图片'}
          </button>
        </div>
      </div>

      {/* Version history panel */}
      {showHistory && session && history.length > 0 && (
        <div className="mb-3 border border-amber-100 rounded-xl bg-amber-50 p-3">
          <p className="text-xs font-medium text-amber-700 mb-2">📋 历史版本（点击回退）</p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {history.map((_, idx) => (
              <button
                key={idx}
                onClick={() => revertTo(history[idx], idx)}
                className="w-full text-left px-3 py-2 bg-white hover:bg-amber-100 border border-amber-100 rounded-lg text-xs text-amber-800 transition-colors"
              >
                版本 {idx + 1}
                <span className="text-amber-400 ml-2">← 回退到此版本</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Scaled preview */}
      <div
        ref={wrapperRef}
        className="rounded-xl bg-gray-50 border border-gray-100 overflow-hidden mb-3"
        style={{ height: `${scaledHeight}px`, position: 'relative' }}
      >
        <div
          style={{
            width: `${CARD_WIDTH}px`,
            height: `${iframeHeight}px`,
            transformOrigin: 'top left',
            transform: `scale(${scale})`,
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          <iframe
            ref={iframeRef}
            title="图文卡片预览"
            scrolling="no"
            style={{
              width: `${CARD_WIDTH}px`,
              height: `${iframeHeight}px`,
              border: 'none',
              display: 'block',
            }}
          />
        </div>
      </div>

      {/* Optimize */}
      <div className="flex gap-2">
        <input
          type="text"
          value={suggestion}
          onChange={(e) => setSuggestion(e.target.value)}
          placeholder="输入修改建议，如：换成绿色主题..."
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition-colors"
          onKeyDown={(e) => e.key === 'Enter' && handleOptimize()}
        />
        <button
          onClick={handleOptimize}
          disabled={!suggestion.trim() || loading || (optimizeLimit !== Infinity && optimizeCount >= optimizeLimit)}
          className="px-3 py-2 bg-brand text-white text-sm font-medium rounded-xl hover:bg-brand-dark disabled:bg-gray-200 disabled:text-gray-400 transition-colors whitespace-nowrap"
        >
          {loading ? '优化中...' : '优化'}
        </button>
      </div>
      {/* Optimize limit indicator */}
      {optimizeLimit !== Infinity && (
        <div className={`mt-2 text-xs text-center ${optimizeCount >= optimizeLimit ? 'text-red-400' : 'text-gray-400'}`}>
          {optimizeCount >= optimizeLimit
            ? '🚫 图文优化次数已用完（重新生成可重置）'
            : `图文优化次数：${optimizeCount}/${optimizeLimit}`
          }
        </div>
      )}

      {/* Login hint */}
      {!session && (
        <p className="mt-2 text-xs text-gray-400 text-center">
          <a href="/login" className="text-brand hover:underline">登录</a>后可保存版本历史，随时回退
        </p>
      )}
    </div>
  )
}
