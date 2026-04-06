'use client'

import { CheckCircle2, TrendingUp, Users, Clock } from 'lucide-react'
import clsx from 'clsx'
import type { Decision, VoteType } from '@/types/database'

interface VoteResultCardProps {
  decision: Decision
  onClick?: () => void
}

export default function VoteResultCard({ decision, onClick }: VoteResultCardProps) {
  const passed = decision.final_result === 'passed'
  const ended = ['passed', 'rejected'].includes(decision.status)

  return (
    <div
      onClick={onClick}
      className={clsx(
        'card p-5 cursor-pointer transition-all duration-200',
        'hover:shadow-md hover:-translate-y-0.5'
      )}
    >
      {/* Status Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={clsx(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            passed ? 'bg-green-100' : 'bg-slate-100'
          )}>
            {ended ? (
              passed ? (
                <CheckCircle2 size={20} className="text-green-600" />
              ) : (
                <Clock size={20} className="text-slate-400" />
              )
            ) : (
              <TrendingUp size={20} className="text-primary-500" />
            )}
          </div>
          <div>
            <p className={clsx(
              'text-sm font-bold',
              passed ? 'text-green-700' : ended ? 'text-slate-600' : 'text-slate-800'
            )}>
              {passed ? '已通过' : ended ? '未通过' : '投票进行中'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {decision.vote_type === 'weighted' ? '加权投票' : decision.vote_type === 'anonymous' ? '匿名投票' : decision.vote_type === 'two_round' ? '两轮制' : '简单多数'}
            </p>
          </div>
        </div>

        <div className={clsx(
          'px-3 py-1 rounded-full text-sm font-bold',
          passed
            ? 'bg-green-50 text-green-700'
            : ended
            ? 'bg-slate-100 text-slate-500'
            : 'bg-primary-50 text-primary-700'
        )}>
          {passed ? '+1' : ended ? '—' : '进行中'}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-slate-900 mb-2 leading-snug">
        {decision.title}
      </h3>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl">
        <div>
          <div className="flex items-center gap-1 text-slate-400 mb-0.5">
            <Users size={11} />
            <span className="text-xs">投票率</span>
          </div>
          <p className="text-sm font-bold text-slate-700">75%</p>
        </div>
        <div>
          <div className="flex items-center gap-1 text-slate-400 mb-0.5">
            <TrendingUp size={11} />
            <span className="text-xs">阈值</span>
          </div>
          <p className="text-sm font-bold text-slate-700">{decision.pass_threshold}%</p>
        </div>
      </div>

      {/* AI indicator */}
      {decision.ai_insight && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 rounded-lg px-2.5 py-1.5">
          <span>🤖</span>
          <span>AI 已生成洞察报告</span>
        </div>
      )}
    </div>
  )
}
