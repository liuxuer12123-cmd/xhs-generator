'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface LlmConfigModalProps {
  open: boolean
  onClose: () => void
}

export function LlmConfigModal({ open, onClose }: LlmConfigModalProps) {
  const { data: session } = useSession()
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [modelName, setModelName] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (open && session) {
      fetch('/api/settings/llm')
        .then((r) => r.json())
        .then((data) => {
          if (data) {
            setBaseUrl(data.baseUrl || '')
            setApiKey(data.apiKey || '')
            setModelName(data.modelName || '')
          }
        })
        .catch(() => {})
    }
  }, [open, session])

  const handleSave = async () => {
    if (!session) return
    setLoading(true)
    try {
      await fetch('/api/settings/llm', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl, apiKey, modelName }),
      })
      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        onClose()
      }, 1200)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900 text-lg">⚙️ 模型设置</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-sm text-amber-700">
          <strong>默认使用 DeepSeek</strong>，无需配置即可使用。填写自定义配置后优先使用你的设置。
        </div>

        {!session && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-5 text-sm text-blue-700">
            请先登录以保存自定义配置。
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Base URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.deepseek.com"
              disabled={!session}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              disabled={!session}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Model Name</label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="deepseek-chat / gpt-4o / ..."
              disabled={!session}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 transition-colors">
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!session || loading || !baseUrl || !apiKey || !modelName}
            className="flex-1 py-2.5 bg-brand text-white text-sm font-medium rounded-xl hover:bg-brand-dark disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
          >
            {saved ? '✓ 已保存' : loading ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
