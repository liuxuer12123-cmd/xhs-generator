'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useState } from 'react'
import { LlmConfigModal } from './LlmConfigModal'
import { HistoryDrawer } from './HistoryDrawer'

interface NavbarProps {
  onLoadHistory?: (data: HistoryItem) => void
}

export interface HistoryItem {
  id: string
  topic: string
  templateId: string
  cardHtml: string
  titles: string[]
  body: string
  extraContent?: string
  createdAt: string
}

export function Navbar({ onLoadHistory }: NavbarProps) {
  const { data: session } = useSession()
  const [showLlmModal, setShowLlmModal] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  return (
    <>
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-full mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="text-2xl">📖</span>
            <span className="text-gray-900">小书匠</span>
          </Link>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {session && (
              <button
                onClick={() => setShowHistory(true)}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                历史记录
              </button>
            )}

            <button
              onClick={() => setShowLlmModal(true)}
              className="p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
              title="模型设置"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {session ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white text-sm font-semibold">
                  {session.user?.email?.[0]?.toUpperCase()}
                </div>
                <button
                  onClick={() => signOut()}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  退出
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-sm bg-brand text-white px-4 py-1.5 rounded-full hover:bg-brand-dark transition-colors"
              >
                登录
              </Link>
            )}
          </div>
        </div>
      </nav>

      <LlmConfigModal open={showLlmModal} onClose={() => setShowLlmModal(false)} />
      {session && (
        <HistoryDrawer
          open={showHistory}
          onClose={() => setShowHistory(false)}
          onLoad={(item) => {
            onLoadHistory?.(item)
            setShowHistory(false)
          }}
        />
      )}
    </>
  )
}
