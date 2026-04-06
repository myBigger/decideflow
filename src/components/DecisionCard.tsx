'use client'

import { Clock, CheckCircle2, FileText, Users, Calendar, ArrowUpRight } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { zhCN } from 'date-fns/locale/zh-CN'
import clsx from 'clsx'
import type { Decision, VoteType } from '@/types/database'
import type { DecisionWithMeta } from '@/lib/api/decisions'

interface DecisionCardProps {
  decision: Decision | DecisionWithMeta
  onClick: () => void
}

const VOTE_TYPE_LABELS: Record<VoteType, { label: string; color: string }> = {
  simple: { label: '简单多数', color: 'text-blue-600 bg-blue-50' },
  weighted: { label: '加权投票', color: 'text-purple-600 bg-purple-50' },
  anonymous: { label: '匿名投票', color: 'text-amber-600 bg-amber-50' },
  two_round: { label: '两轮制', color: 'text-teal-600 bg-teal-50' },
}

const STATUS_CONFIG = {
  voting: {
    label: '进行中',
    color: 'badge-info',
    icon: <Clock size={10} />,
  },
  passed: {
    label: '已通过',
    color: 'badge-success',
    icon: <CheckCircle2 size={10} />,
  },
  rejected: {
    label: '未通过',
    color: 'badge-danger',
    icon: null,
  },
  draft: {
    label: '草稿',
    color: 'badge-neutral',
    icon: <FileText size={10} />,
  },
  archived: {
    label: '已归档',
    color: 'badge-neutral',
    icon: null,
  },
}

export default function DecisionCard({ decision, onClick }: DecisionCardProps) {
  const statusConfig = STATUS_CONFIG[decision.status] || STATUS_CONFIG.draft
  const voteTypeInfo = VOTE_TYPE_LABELS[decision.vote_type]

  const getTimeDisplay = () => {
    if (decision.status === 'draft') {
      return '尚未开始投票'
    }
    if (decision.status === 'voting' && decision.voting_end) {
      return `${formatDistanceToNow(new Date(decision.voting_end), { addSuffix: true, locale: zhCN })} 结束`
    }
    if (decision.final_result && decision.updated_at) {
      return `${format(new Date(decision.updated_at), 'yyyy/MM/dd')} 结束`
    }
    return null
  }

  return (
    <div
      onClick={onClick}
      className="card p-5 cursor-pointer group hover:border-primary-200 hover:shadow-md transition-all duration-200 animate-fade-in"
    >
      {/* Top Row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={clsx('badge', statusConfig.color, 'flex items-center gap-1')}>
            {statusConfig.icon}
            {statusConfig.label}
          </span>
          <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', voteTypeInfo.color)}>
            {voteTypeInfo.label}
          </span>
          {decision.vote_type === 'two_round' && decision.round && (
            <span className="text-xs text-slate-400">第{decision.round}轮</span>
          )}
        </div>
        <ArrowUpRight
          size={16}
          className="text-slate-300 group-hover:text-primary-500 transition-colors shrink-0 mt-0.5"
        />
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-slate-900 leading-snug mb-2 group-hover:text-primary-700 transition-colors line-clamp-2">
        {decision.title}
      </h3>

      {/* Description */}
      {decision.description && (
        <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
          {decision.description}
        </p>
      )}

      {/* AI Insight Indicator */}
      {decision.ai_insight && (
        <div className="flex items-center gap-1.5 mb-3 text-xs text-amber-600 bg-amber-50 rounded-lg px-2.5 py-1.5 border border-amber-100">
          <span>🤖</span>
          <span className="font-medium">AI 已生成洞察</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1">
          <Users size={12} />
          <span>{(decision as any).vote_count != null ? `${(decision as any).vote_count}票` : '发起者'}</span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar size={12} />
          <span>
            {getTimeDisplay() || format(new Date(decision.created_at), 'MM/dd')}
          </span>
        </div>
      </div>

      {/* Progress for voting */}
      {decision.status === 'voting' && decision.voting_end && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>投票进度</span>
            <span>
              {Math.max(
                0,
                Math.min(
                  100,
                  Math.round(
                    ((Date.now() - new Date(decision.voting_start || decision.created_at).getTime()) /
                      (new Date(decision.voting_end).getTime() - new Date(decision.voting_start || decision.created_at).getTime())) *
                      100
                  )
                )
              )}%
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${Math.max(
                  0,
                  Math.min(
                    100,
                    Math.round(
                      ((Date.now() - new Date(decision.voting_start || decision.created_at).getTime()) /
                        (new Date(decision.voting_end).getTime() - new Date(decision.voting_start || decision.created_at).getTime())) *
                        100
                    )
                  )
                )}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
