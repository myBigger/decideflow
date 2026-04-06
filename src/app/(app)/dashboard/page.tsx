'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Settings, LogOut, ChevronDown } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import TeamSwitcher from '@/components/TeamSwitcher'
import DashboardHome from '@/components/DashboardHome'
import CreateDecisionModal from '@/components/CreateDecisionModal'
import type { Decision } from '@/types/database'

export default function DashboardPage() {
  const { isAuthenticated, isLoading, user, currentTeam, logout } = useAuth()
  const router = useRouter()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null)
  const [sidebarFilter, setSidebarFilter] = useState<'all' | 'voting' | 'passed' | 'draft'>('all')

  // 认证保护：等待加载完成后重定向
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isLoading, isAuthenticated, router])

  const handleLogout = async () => {
    await logout()
    router.push('/auth/login')
  }

  const handleDecisionCreated = useCallback((decision: Decision) => {
    setShowCreateModal(false)
    // 触发刷新：简单刷新页面
    window.location.reload()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/30">
            <svg width="28" height="28" viewBox="0 0 20 20" fill="none">
              <path d="M4 10L8 14L16 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400 mt-4">Dec ideFlow</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo + Team Switcher */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm shadow-primary-500/30 shrink-0">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10L8 14L16 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="hidden sm:block h-6 w-px bg-slate-200" />
              <TeamSwitcher />

              {/* Quick stats */}
              <div className="hidden lg:flex items-center gap-4 ml-4 text-sm">
                <QuickStat label="进行中" value="3" color="text-primary-600 bg-primary-50" />
                <QuickStat label="已通过" value="12" color="text-green-600 bg-green-50" />
                <QuickStat label="本月" value="5" color="text-purple-600 bg-purple-50" />
              </div>
            </div>

            {/* Right: User */}
            <div className="flex items-center gap-2">
              <button className="btn btn-ghost relative">
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <button
                onClick={handleLogout}
                className="btn btn-ghost text-sm text-slate-500"
                title="退出登录"
              >
                <LogOut size={16} />
              </button>
              <div className="h-8 w-px bg-slate-200 mx-1" />
              <div className="flex items-center gap-2">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-semibold text-slate-800 leading-tight">
                    {user?.full_name || '用户'}
                  </p>
                  <p className="text-xs text-slate-400 leading-tight">
                    {currentTeam?.role === 'owner' ? '团队所有者' :
                     currentTeam?.role === 'admin' ? '管理员' : '成员'}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-sm font-semibold text-slate-600">
                  {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 gap-6">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 hidden lg:block">
          <div className="sticky top-24">
            {/* Navigation */}
            <nav className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm mb-4">
              <SidebarFilter label="全部" icon="📋" count={5} active={sidebarFilter === 'all'} onClick={() => setSidebarFilter('all')} />
              <SidebarFilter label="进行中" icon="⏱" count={3} active={sidebarFilter === 'voting'} onClick={() => setSidebarFilter('voting')} badge="pulse" />
              <SidebarFilter label="已结束" icon="✅" count={2} active={sidebarFilter === 'passed'} onClick={() => setSidebarFilter('passed')} />
              <SidebarFilter label="草稿" icon="📝" count={1} active={sidebarFilter === 'draft'} onClick={() => setSidebarFilter('draft')} />
            </nav>

            {/* Team Info */}
            {currentTeam && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm mb-4">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold">
                    {currentTeam.teams.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{currentTeam.teams.name}</p>
                    <p className="text-xs text-slate-400">{currentTeam.weight} 票权重</p>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">决策参与率</span>
                    <span className="font-semibold text-slate-700">87%</span>
                  </div>
                  <div className="mt-2 progress-bar">
                    <div className="progress-fill" style={{ width: '87%' }} />
                  </div>
                </div>
              </div>
            )}

            {/* AI Insight Summary */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">🤖</span>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">AI 洞察</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                本月已生成 <span className="text-primary-400 font-semibold">23条</span> 决策辅助建议，帮你避免了
                <span className="text-amber-400 font-semibold"> 2次</span> 潜在翻案风险
              </p>
              <div className="mt-3 flex gap-1">
                {['🎯', '📊', '⚠️', '💡'].map((e, i) => (
                  <div key={i} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-sm">
                    {e}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          <DashboardHome
            teamId={currentTeam?.teams?.id}
            onSelectDecision={setSelectedDecision}
            onCreateClick={() => setShowCreateModal(true)}
          />
        </main>
      </div>

      {/* Modals */}
      {showCreateModal && currentTeam && (
        <CreateDecisionModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleDecisionCreated}
          teamId={currentTeam.teams.id}
        />
      )}
    </div>
  )
}

// ──────────────────────────────────────────────
// Sub Components
// ──────────────────────────────────────────────

function QuickStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-lg font-bold ${color.split(' ')[0]}`}>{value}</span>
      <span className={`text-xs px-2 py-0.5 rounded-full ${color.split(' ')[1]}`}>{label}</span>
    </div>
  )
}

function SidebarFilter({
  label, icon, count, active, onClick, badge
}: {
  label: string
  icon: string
  count: number
  active: boolean
  onClick: () => void
  badge?: 'pulse'
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
        active
          ? 'bg-primary-50 text-primary-700 shadow-sm'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <span>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
        active ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-500'
      }`}>
        {badge === 'pulse' && (
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary-500"></span>
          </span>
        )}
        {count}
      </span>
    </button>
  )
}
