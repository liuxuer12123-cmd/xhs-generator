'use client'

import { useState, useEffect } from 'react'
import { HistoryItem } from './Navbar'
import { TEMPLATES } from '@/lib/templates'

interface HistoryDrawerProps {
  open: boolean
  onClose: () => void
  onLoad: (item: HistoryItem) => void
}

interface HistoryListItem {
  id: string
  topic: string
  templateId: string
  titles: string[]
  createdAt: string
}

export function HistoryDrawer({ open, onClose, onLoad }: HistoryDrawerProps) {
  const [items, setItems] = useState<HistoryListItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setLoading(true)
      fetch('/api/history')
        .then((r) => r.json())
        .then((data) => setItems(Array.isArray(data) ? data : []))
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [open])

  const handleLoad = async (id: string) => {
    const res = await fetch(`/api/history/${id}`)
    const data = await res.json()
    onLoad(data as HistoryItem)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await fetch(`/api/history/${id}`, { method: 'DELETE' })
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-80 bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">历史记录</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center text-gray-400 text-sm py-8">加载中...</div>
          ) : items.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-8">暂无历史记录</div>
          ) : (
            items.map((item) => {
              const template = TEMPLATES.find((t) => t.id === item.templateId)
              return (
                <div
                  key={item.id}
                  onClick={() => handleLoad(item.id)}
                  className="group p-3 border border-gray-100 rounded-xl hover:border-brand/30 hover:bg-red-50/30 cursor-pointer transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.topic}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {template?.name} · {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                      </p>
                      {item.titles?.[0] && (
                        <p className="text-xs text-gray-500 mt-1 truncate">{item.titles[0]}</p>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleDelete(item.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 text-sm transition-all"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
