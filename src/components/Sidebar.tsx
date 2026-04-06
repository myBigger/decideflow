'use client'

import { Inbox, CheckCircle2, Clock, FileText, Users, BarChart3 } from 'lucide-react'
import clsx from 'clsx'

type FilterType = 'all' | 'voting' | 'passed' | 'draft'

interface SidebarProps {
  filter: FilterType
  onFilterChange: (f: FilterType) => void
  counts: { all: number; voting: number; passed: number; draft: number }
}

const NAV_ITEMS: Array<{
  key: FilterType
  label: string
  icon: React.ReactNode
  description: string
}> = [
  {
    key: 'all',
    label: '全部决策',
    icon: <Inbox size={18} />,
    description: '查看所有决策记录',
  },
  {
    key: 'voting',
    label: '进行中',
    icon: <Clock size={18} />,
    description: '正在投票的议题',
  },
  {
    key: 'passed',
    label: '已结束',
    icon: <CheckCircle2 size={18} />,
    description: '已通过的决策',
  },
  {
    key: 'draft',
    label: '草稿',
    icon: <FileText size={18} />,
    description: '尚未发起的决策',
  },
]

export default function Sidebar({ filter, onFilterChange, counts }: SidebarProps) {
  return (
    <aside className="w-56 shrink-0 hidden lg:block">
      <div className="sticky top-24">
        {/* Navigation */}
        <nav className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm mb-4">
          {NAV_ITEMS.map(item => {
            const active = filter === item.key
            return (
              <button
                key={item.key}
                onClick={() => onFilterChange(item.key)}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  active
                    ? 'bg-primary-50 text-primary-700 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <span className={active ? 'text-primary-600' : 'text-slate-400'}>{item.icon}</span>
                <span className="flex-1 text-left">{item.label}</span>
                <span
                  className={clsx(
                    'text-xs px-2 py-0.5 rounded-full font-medium',
                    active ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-500'
                  )}
                >
                  {counts[item.key]}
                </span>
              </button>
            )
          })}
        </nav>

        {/* Quick Info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} className="text-slate-400" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">团队</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold">
              DF
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">产品团队</p>
              <p className="text-xs text-slate-400">8 位成员</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">决策参与率</span>
              <span className="font-semibold text-slate-700">87%</span>
            </div>
            <div className="mt-2 progress-bar">
              <div className="progress-fill" style={{ width: '87%' }} />
            </div>
          </div>
        </div>

        {/* AI Stats */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={14} className="text-primary-400" />
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">AI 洞察</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            本月已生成 <span className="text-primary-400 font-semibold">23条</span> 决策辅助建议，帮你避免了
            <span className="text-amber-400 font-semibold"> 2次</span> 潜在翻案风险
          </p>
          <div className="mt-3 flex gap-1">
            {['🎯', '📊', '⚠️', '💡'].map((emoji, i) => (
              <div key={i} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-sm">
                {emoji}
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}
