'use client'

import { Plus, Bell, Settings, User } from 'lucide-react'

interface NavbarProps {
  onCreateClick: () => void
}

export default function Navbar({ onCreateClick }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm shadow-primary-500/30">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10L8 14L16 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 tracking-tight">DecideFlow</span>
              <span className="hidden sm:inline ml-1.5 text-xs text-slate-400 font-normal">· 团队决策工具</span>
            </div>
          </div>

          {/* Center — Quick Stats */}
          <div className="hidden md:flex items-center gap-6">
            <QuickStat label="进行中" value="3" color="blue" />
            <QuickStat label="已通过" value="12" color="green" />
            <QuickStat label="本月" value="5" color="purple" />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost relative">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <button className="btn btn-ghost hidden sm:flex">
              <Settings size={18} />
            </button>
            <button
              onClick={onCreateClick}
              className="btn btn-primary shadow-sm shadow-primary-500/25 hover:shadow-md hover:shadow-primary-500/30"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">新建决策</span>
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center ml-1">
              <User size={16} className="text-slate-600" />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

function QuickStat({ label, value, color }: { label: string; value: string; color: 'blue' | 'green' | 'purple' }) {
  const colors = {
    blue: 'text-primary-600 bg-primary-50',
    green: 'text-green-600 bg-green-50',
    purple: 'text-purple-600 bg-purple-50',
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-lg font-bold ${colors[color].split(' ')[0]}`}>{value}</span>
      <span className={`text-xs px-2 py-0.5 rounded-full ${colors[color].split(' ')[1]}`}>{label}</span>
    </div>
  )
}
