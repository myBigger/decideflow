'use client'

import { useState } from 'react'
import {
  ArrowLeft, Clock, Users, Calendar, CheckCircle2, XCircle,
  MessageSquare, Plus, AlertTriangle, TrendingUp, ChevronRight,
  Lock, Shield, BarChart2, Sparkles
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale/zh-CN'
import clsx from 'clsx'
import type { Decision, VoteType } from '@/types/database'
import { VOTE_RULES } from '@/lib/vote-engine'
import AIInsightCard from '@/components/AIInsightCard'

interface DecisionDetailProps {
  decision: Decision
  onBack: () => void
  onVote: (decisionId: string, optionId: string) => void
}

const MOCK_OPTIONS = [
  { id: 'opt-1', content: 'AI 写作助手', description: '集成 LLM，提供智能写作、摘要、润色功能', order_index: 0 },
  { id: 'opt-2', content: '数据仪表盘', description: '可视化核心业务指标，支持自定义看板', order_index: 1 },
  { id: 'opt-3', content: '移动端优化', description: '重设计移动端体验，提升 App Store 评分', order_index: 2 },
  { id: 'opt-4', content: 'API 开放平台', description: '对第三方开发者开放 API，构建生态', order_index: 3 },
]

const MOCK_MEMBERS = [
  { id: 'u1', name: '张明', avatar: null, weight: 3 },
  { id: 'u2', name: '李华', avatar: null, weight: 2 },
  { id: 'u3', name: '王芳', avatar: null, weight: 2 },
  { id: 'u4', name: '陈强', avatar: null, weight: 1 },
  { id: 'u5', name: '刘洋', avatar: null, weight: 1 },
  { id: 'u6', name: '赵雪', avatar: null, weight: 1 },
]

export default function DecisionDetail({ decision, onBack, onVote }: DecisionDetailProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [voted, setVoted] = useState(false)
  const [showComment, setShowComment] = useState(false)
  const [comment, setComment] = useState('')

  const voteRule = VOTE_RULES[decision.vote_type]
  const isVoting = decision.status === 'voting'
  const isEnded = ['passed', 'rejected'].includes(decision.status)

  const handleVote = () => {
    if (!selectedOption) return
    onVote(decision.id, selectedOption)
    setVoted(true)
  }

  // Mock vote stats
  const voteStats = {
    opt1: decision.vote_type === 'weighted' ? { score: 5, pct: 62.5 } : { score: 4, pct: 50 },
    opt2: decision.vote_type === 'weighted' ? { score: 2, pct: 25 } : { score: 2, pct: 25 },
    opt3: decision.vote_type === 'weighted' ? { score: 1, pct: 12.5 } : { score: 1, pct: 12.5 },
    opt4: decision.vote_type === 'weighted' ? { score: 0, pct: 0 } : { score: 1, pct: 12.5 },
  }

  return (
    <div className="animate-fade-in max-w-4xl">
      {/* Back */}
      <button onClick={onBack} className="btn btn-ghost mb-4 -ml-2 text-slate-500">
        <ArrowLeft size={16} />
        返回列表
      </button>

      {/* Header Card */}
      <div className="card-elevated p-6 mb-4">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <StatusBadge status={decision.status} />
          <span className="badge badge-neutral">{voteRule.label}</span>
          {decision.vote_type === 'anonymous' && (
            <span className="badge badge-warning flex items-center gap-1">
              <Lock size={10} />
              匿名投票
            </span>
          )}
        </div>

        <h1 className="text-xl font-bold text-slate-900 mb-2 leading-snug">{decision.title}</h1>
        {decision.description && (
          <p className="text-sm text-slate-500 mb-5 leading-relaxed">{decision.description}</p>
        )}

        {/* Meta Info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl">
          <MetaItem icon={<Users size={14} />} label="参与成员" value="8人" />
          <MetaItem
            icon={<Clock size={14} />}
            label={isVoting ? '剩余时间' : '持续时长'}
            value={
              isVoting && decision.voting_end
                ? formatDistanceToNow(new Date(decision.voting_end), { addSuffix: true, locale: zhCN })
                : isEnded
                ? '3天'
                : '未开始'
            }
          />
          <MetaItem icon={<BarChart2 size={14} />} label="投票规则" value={`${decision.pass_threshold}%通过`} />
          <MetaItem icon={<Calendar size={14} />} label="发起时间" value={format(new Date(decision.created_at), 'MM/dd HH:mm')} />
        </div>

        {/* AI Insight Banner */}
        {decision.ai_insight && (
          <AIInsightCard insight={decision.ai_insight as any} expanded={false} />
        )}
      </div>

      {/* Vote Rules Explain */}
      <div className="flex items-center gap-3 p-4 bg-primary-50 border border-primary-100 rounded-xl mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
          <span className="text-lg">{voteRule.icon}</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-primary-800">{voteRule.label}</p>
          <p className="text-xs text-primary-600 mt-0.5">{voteRule.description}</p>
        </div>
        <div className="ml-auto hidden sm:block text-right">
          <p className="text-xs text-primary-400">适用场景</p>
          <p className="text-xs font-medium text-primary-700">{voteRule.bestFor}</p>
        </div>
      </div>

      {/* Voting Options */}
      <div className="space-y-3 mb-4">
        <h3 className="section-title flex items-center gap-2">
          投票选项
          {isVoting && !voted && <span className="text-xs font-normal text-slate-400">（请选择一项）</span>}
          {voted && <span className="badge badge-success text-xs">已投票</span>}
        </h3>

        {MOCK_OPTIONS.map((option, idx) => {
          const stats = [voteStats.opt1, voteStats.opt2, voteStats.opt3, voteStats.opt4][idx]
          const isSelected = selectedOption === option.id
          const isWinner = isEnded && idx === 0 && decision.status === 'passed'
          const isLoser = isEnded && idx === 0 && decision.status === 'rejected'

          return (
            <div
              key={option.id}
              onClick={() => !voted && isVoting && setSelectedOption(option.id)}
              className={clsx(
                'card p-4 cursor-pointer transition-all duration-200 relative overflow-hidden',
                isVoting && !voted && !isSelected && 'hover:border-primary-200 hover:shadow-md',
                isSelected && !voted && isVoting && 'border-primary-400 shadow-md shadow-primary-100 ring-2 ring-primary-200',
                voted && isVoting && isSelected && 'border-primary-400 bg-primary-50/50',
                isEnded && isWinner && 'border-green-300 bg-green-50/50',
                isEnded && isLoser && 'border-red-200 opacity-60',
                !isVoting && !isEnded && 'cursor-default'
              )}
            >
              {/* Selected indicator */}
              {isSelected && !voted && isVoting && (
                <div className="absolute inset-0 bg-primary-500/5 rounded-2xl" />
              )}

              <div className="flex items-start gap-3">
                {/* Radio/Check indicator */}
                <div className={clsx(
                  'w-5 h-5 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center transition-all',
                  isSelected ? 'border-primary-500 bg-primary-500' : 'border-slate-300',
                  !isVoting && 'cursor-default'
                )}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={clsx(
                      'text-sm font-semibold',
                      isSelected ? 'text-primary-700' : 'text-slate-800'
                    )}>
                      {option.content}
                    </span>
                    {isWinner && (
                      <span className="badge badge-success text-xs flex items-center gap-1">
                        <CheckCircle2 size={10} /> 胜出
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{option.description}</p>
                </div>

                {/* Vote Stats (shown when voted or ended) */}
                {(voted || isEnded) && (
                  <div className="text-right shrink-0">
                    <p className={clsx(
                      'text-sm font-bold',
                      isWinner ? 'text-green-600' : isLoser ? 'text-red-500' : 'text-slate-600'
                    )}>
                      {stats.score}票
                    </p>
                    <p className="text-xs text-slate-400">{stats.pct}%</p>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              {(voted || isEnded) && (
                <div className="mt-3 ml-8">
                  <div className="progress-bar">
                    <div
                      className={clsx(
                        'progress-fill transition-all duration-700',
                        isWinner ? 'from-green-400 to-green-600' : isLoser ? 'from-red-400 to-red-500' : 'from-slate-300 to-slate-400'
                      )}
                      style={{ width: `${stats.pct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Vote Button */}
      {isVoting && !voted && (
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-4">
            <MessageSquare size={16} className="text-slate-400" />
            <span className="text-sm text-slate-600">投票附言（可选）</span>
            <button
              onClick={() => setShowComment(!showComment)}
              className="text-xs text-primary-600 hover:text-primary-700"
            >
              {showComment ? '收起' : '添加'}
            </button>
          </div>

          {showComment && (
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="写下你的想法或理由..."
              className="input mb-4 min-h-[80px] resize-none"
            />
          )}

          <button
            onClick={handleVote}
            disabled={!selectedOption}
            className="btn btn-primary btn-lg w-full shadow-lg shadow-primary-500/20"
          >
            <CheckCircle2 size={18} />
            确认投票
            {selectedOption && (
              <span className="text-primary-200 ml-1">
                → {MOCK_OPTIONS.find(o => o.id === selectedOption)?.content}
              </span>
            )}
          </button>
        </div>
      )}

      {/* After Voting */}
      {voted && isVoting && (
        <div className="card p-4 border-green-200 bg-green-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-green-800">投票成功</p>
              <p className="text-xs text-green-600 mt-0.5">
                你的投票已记录，等待其他成员完成后揭晓结果
              </p>
            </div>
          </div>
          {selectedOption && (
            <div className="mt-3 p-3 bg-white rounded-xl border border-green-100">
              <p className="text-xs text-slate-400 mb-1">你投票的选项</p>
              <p className="text-sm font-medium text-slate-800">
                {MOCK_OPTIONS.find(o => o.id === selectedOption)?.content}
              </p>
              {comment && (
                <p className="text-xs text-slate-500 mt-2 italic">"{comment}"</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Ended Result */}
      {isEnded && (
        <div className={clsx(
          'card p-5 text-center',
          decision.status === 'passed'
            ? 'border-green-200 bg-gradient-to-br from-green-50 to-white'
            : 'border-red-200 bg-gradient-to-br from-red-50 to-white'
        )}>
          <div className={clsx(
            'w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center',
            decision.status === 'passed' ? 'bg-green-100' : 'bg-red-100'
          )}>
            {decision.status === 'passed' ? (
              <CheckCircle2 size={32} className="text-green-600" />
            ) : (
              <XCircle size={32} className="text-red-500" />
            )}
          </div>
          <h3 className={clsx(
            'text-xl font-bold mb-2',
            decision.status === 'passed' ? 'text-green-800' : 'text-red-800'
          )}>
            {decision.status === 'passed' ? '决策已通过' : '决策未通过'}
          </h3>
          <p className="text-sm text-slate-500 mb-4 max-w-sm mx-auto">
            {decision.status === 'passed'
              ? '多数成员支持该方案，请按照执行计划推进'
              : '未能获得足够支持，可重新发起决策或调整方案'}
          </p>
          <button className="btn btn-secondary text-sm">
            查看完整报告
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Participants (anonymous mode hides names) */}
      <div className="card p-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Users size={14} className="text-slate-400" />
            投票成员
          </h4>
          <span className="text-xs text-slate-400">6/8 已投票</span>
        </div>
        <div className="flex -space-x-2">
          {MOCK_MEMBERS.map((member, i) => (
            <div
              key={member.id}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-white flex items-center justify-center text-xs font-medium text-slate-600"
              title={member.name}
              style={{ zIndex: MOCK_MEMBERS.length - i }}
            >
              {member.name[0]}
            </div>
          ))}
          <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs text-slate-400">
            +2
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; color: string; className: string }> = {
    voting: { label: '进行中', color: 'blue', className: 'badge-info' },
    passed: { label: '已通过', color: 'green', className: 'badge-success' },
    rejected: { label: '未通过', color: 'red', className: 'badge-danger' },
    draft: { label: '草稿', color: 'gray', className: 'badge-neutral' },
    archived: { label: '已归档', color: 'gray', className: 'badge-neutral' },
  }
  const config = configs[status] || configs.draft
  return <span className={clsx('badge', config.className)}>{config.label}</span>
}

function MetaItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-slate-400 mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  )
}
