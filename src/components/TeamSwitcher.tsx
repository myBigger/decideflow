'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Plus, Users, Check, Settings } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { teamsAPI } from '@/lib/api/teams'
import type { TeamMembership } from '@/contexts/AuthContext'

interface TeamSwitcherProps {
  onTeamChange?: (teamId: string) => void
}

export default function TeamSwitcher({ onTeamChange }: TeamSwitcherProps) {
  const { teams, currentTeam, setCurrentTeam } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleTeamSelect = (team: TeamMembership) => {
    setCurrentTeam(team.teams.id)
    onTeamChange?.(team.teams.id)
    setIsOpen(false)
  }

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return
    setIsLoading(true)
    setError(null)

    try {
      const result = await teamsAPI.create(newTeamName.trim())
      if (result.success) {
        // 重新获取团队列表
        window.location.reload()
      }
    } catch (err: any) {
      setError(err.message || '创建失败')
    } finally {
      setIsLoading(false)
    }
  }

  const currentTeamData = currentTeam?.teams

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200',
          'hover:bg-slate-100',
          isOpen && 'bg-slate-100'
        )}
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {currentTeamData?.name?.[0] || 'T'}
        </div>
        <div className="text-left hidden sm:block">
          <p className="text-sm font-semibold text-slate-800 max-w-[120px] truncate">
            {currentTeamData?.name || '选择团队'}
          </p>
          <p className="text-xs text-slate-400">{teams.length} 个团队</p>
        </div>
        <ChevronDown
          size={14}
          className={clsx(
            'text-slate-400 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-scale-in">
          {/* Team list */}
          <div className="p-2">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide px-3 py-1">
              切换团队
            </p>

            {teams.map(team => {
              const isSelected = currentTeam?.teams?.id === team.teams.id
              return (
                <button
                  key={team.teams.id}
                  onClick={() => handleTeamSelect(team)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all',
                    isSelected
                      ? 'bg-primary-50'
                      : 'hover:bg-slate-50'
                  )}
                >
                  <div className={clsx(
                    'w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0',
                    isSelected
                      ? 'bg-primary-500'
                      : 'bg-gradient-to-br from-slate-300 to-slate-400'
                  )}>
                    {team.teams.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={clsx(
                      'text-sm font-medium truncate',
                      isSelected ? 'text-primary-700' : 'text-slate-700'
                    )}>
                      {team.teams.name}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Users size={10} />
                      <span>
                        {team.role === 'owner' ? '所有者' :
                         team.role === 'admin' ? '管理员' : '成员'}
                      </span>
                    </div>
                  </div>
                  {isSelected && (
                    <Check size={14} className="text-primary-500 shrink-0" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Create new team */}
          <div className="border-t border-slate-100 p-2">
            {isCreating ? (
              <div className="p-2 space-y-2">
                <input
                  type="text"
                  value={newTeamName}
                  onChange={e => setNewTeamName(e.target.value)}
                  placeholder="团队名称"
                  className="input text-sm"
                  autoFocus
                  maxLength={30}
                  onKeyDown={e => e.key === 'Enter' && handleCreateTeam()}
                />
                {error && (
                  <p className="text-xs text-red-500 px-1">{error}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setIsCreating(false); setError(null) }}
                    className="btn btn-ghost text-xs flex-1"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreateTeam}
                    disabled={isLoading || !newTeamName.trim()}
                    className="btn btn-primary text-xs flex-1"
                  >
                    {isLoading ? '创建中...' : '创建'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-slate-50 transition-all text-slate-600"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Plus size={14} className="text-slate-500" />
                </div>
                <span className="text-sm font-medium">创建新团队</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
