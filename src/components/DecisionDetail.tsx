'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ArrowLeft, Clock, Users, Calendar, CheckCircle2, XCircle,
  MessageSquare, Plus, AlertTriangle, ChevronRight,
  Lock, Shield, BarChart2, Sparkles, RefreshCw
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale/zh-CN'
import clsx from 'clsx'
import type { Decision } from '@/types/database'
import { VOTE_RULES } from '@/lib/vote-engine'
import { decisionsAPI, type DecisionDetailResponse } from '@/lib/api/decisions'
import AIInsightCard from '@/components/AIInsightCard'
import { SkeletonDetail } from '@/components/ui'

interface DecisionDetailProps {
  decision: Decision
  onBack: () => void
  onVote: (decisionId: string, optionId: string) => void
}

export default function DecisionDetail({ decision, onBack, onVote }: DecisionDetailProps) {
  const [data, setData] = useState<DecisionDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [voted, setVoted] = useState(false)
  const [showComment, setShowComment] = useState(false)
  const [comment, setComment] = useState('')
  const [voting, setVoting] = useState(false)
  const [voteMsg, setVoteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const voteRule = VOTE_RULES[decision.vote_type]
  const isVoting = decision.status === 'voting'
  const isEnded = ['passed', 'rejected'].includes(decision.status)

  // 真实数据优先级：API > props
  const options = data?.options ?? []
  const voteResults = data?.vote_results ?? []
  const members = data?.members ?? []
  const executions = data?.executions ?? []
  const comments = data?.comments ?? []
  const currentUserVote = data?.current_user_vote ?? null
  const hasVoted = currentUserVote !== null || voted
  const totalVoters = members.length
  const votedCount = data?.votes?.length ?? 0

  // 发起 API 请求获取完整数据
  const fetchDetail = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await decisionsAPI.getById(decision.id)
      setData(res)
      // 每次加载时重置表单状态，避免跨决策污染
      setSelectedOption(null)
      setComment('')
      if (res.current_user_vote) {
        setVoted(true)
        setSelectedOption(res.current_user_vote.option_id)
        if (res.current_user_vote.comment) {
          setComment(res.current_user_vote.comment)
        }
      } else {
        setVoted(false)
      }
    } catch (err: any) {
      setError(err.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [decision.id])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  // 投票
  const handleVote = async () => {
    if (!selectedOption) return
    setVoting(true)
    setVoteMsg(null)
    try {
      const result = await decisionsAPI.vote(decision.id, selectedOption, comment || undefined)
      setVoted(true)
      onVote(decision.id, selectedOption)
      setVoteMsg({ type: 'success', text: result.message })
      // 刷新数据
      await fetchDetail()
    } catch (err: any) {
      setVoteMsg({ type: 'error', text: err.message || '投票失败' })
    } finally {
      setVoting(false)
    }
  }

  // 计算每个选项的投票结果
  const getOptionResult = (optionId: string) => {
    return voteResults.find(r => r.option_id === optionId)
  }

  // 判断胜出/失败
  const isWinner = (optionId: string) => {
    if (!isEnded) return false
    const result = getOptionResult(optionId)
    if (!result) return false
    const maxScore = Math.max(...voteResults.map(r => r.score))
    return result.score === maxScore && result.score > 0
  }

  if (loading) {
    return (
      <div className="animate-fade-in max-w-4xl">
        <button onClick={onBack} className="btn btn-ghost mb-4 -ml-2 text-slate-500">
          <ArrowLeft size={16} />
          返回列表
        </button>
        <SkeletonDetail />
      </div>
    )
  }

  if (error) {
    return (
      <div className="animate-fade-in max-w-4xl">
        <button onClick={onBack} className="btn btn-ghost mb-4 -ml-2 text-slate-500">
          <ArrowLeft size={16} />
          返回列表
        </button>
        <div className="card p-8 text-center">
          <AlertTriangle size={32} className="text-red-400 mx-auto mb-3" />
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <button onClick={fetchDetail} className="btn btn-secondary text-sm">
            <RefreshCw size={14} />
            重试
          </button>
        </div>
      </div>
    )
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

        {/* Meta Info — 真实数据 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl">
          <MetaItem
            icon={<Users size={14} />}
            label="参与成员"
            value={isVoting || isEnded ? `${votedCount}/${totalVoters}人` : `${totalVoters}人`}
          />
          <MetaItem
            icon={<Clock size={14} />}
            label={isVoting ? '剩余时间' : '持续时长'}
            value={
              isVoting && decision.voting_end
                ? formatDistanceToNow(new Date(decision.voting_end), { addSuffix: true, locale: zhCN })
                : isEnded && decision.voting_end
                ? format(new Date(decision.voting_end), 'MM/dd HH:mm')
                : isEnded ? '已结束' : '未开始'
            }
          />
          <MetaItem
            icon={<BarChart2 size={14} />}
            label="投票规则"
            value={`${decision.pass_threshold}%通过`}
          />
          <MetaItem
            icon={<Calendar size={14} />}
            label="发起时间"
            value={format(new Date(decision.created_at), 'MM/dd HH:mm')}
          />
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
          {isVoting && !hasVoted && <span className="text-xs font-normal text-slate-400">（请选择一项）</span>}
          {hasVoted && <span className="badge badge-success text-xs">已投票</span>}
        </h3>

        {options.map((option) => {
          const result = getOptionResult(option.id)
          const isSelected = selectedOption === option.id
          const winner = isWinner(option.id)
          const loser = isEnded && !winner && (result?.score ?? 0) < (Math.max(...voteResults.map(r => r.score)) || 0)

          return (
            <div
              key={option.id}
              onClick={() => !hasVoted && isVoting && setSelectedOption(option.id)}
              className={clsx(
                'card p-4 transition-all duration-200 relative overflow-hidden',
                !hasVoted && isVoting && 'cursor-pointer hover:border-primary-200 hover:shadow-md',
                isSelected && !hasVoted && isVoting && 'border-primary-400 shadow-md shadow-primary-100 ring-2 ring-primary-200',
                hasVoted && isVoting && isSelected && 'border-primary-400 bg-primary-50/50',
                winner && 'border-green-300 bg-green-50/50',
                loser && 'border-red-200 opacity-60',
                !isVoting && !isEnded && 'cursor-default'
              )}
            >
              {isSelected && !hasVoted && isVoting && (
                <div className="absolute inset-0 bg-primary-500/5 rounded-2xl" />
              )}

              <div className="flex items-start gap-3">
                {/* Radio indicator */}
                <div className={clsx(
                  'w-5 h-5 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center transition-all',
                  isSelected ? 'border-primary-500 bg-primary-500' : 'border-slate-300',
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
                    {winner && (
                      <span className="badge badge-success text-xs flex items-center gap-1">
                        <CheckCircle2 size={10} /> 胜出
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{option.description}</p>
                </div>

                {/* Vote Stats */}
                {(hasVoted || isEnded) && result && (
                  <div className="text-right shrink-0">
                    <p className={clsx(
                      'text-sm font-bold',
                      winner ? 'text-green-600' : loser ? 'text-red-500' : 'text-slate-600'
                    )}>
                      {result.score}票
                    </p>
                    <p className="text-xs text-slate-400">{result.percentage.toFixed(1)}%</p>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              {(hasVoted || isEnded) && result && (
                <div className="mt-3 ml-8">
                  <div className="progress-bar">
                    <div
                      className={clsx(
                        'progress-fill transition-all duration-700',
                        winner ? 'from-green-400 to-green-600' : loser ? 'from-red-400 to-red-500' : 'from-slate-300 to-slate-400'
                      )}
                      style={{ width: `${result.percentage}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Vote Button */}
      {isVoting && !hasVoted && (
        <div className="card p-4">
          {voteMsg && (
            <div className={clsx(
              'mb-4 p-3 rounded-xl text-sm',
              voteMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            )}>
              {voteMsg.text}
            </div>
          )}

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
            disabled={!selectedOption || voting}
            className="btn btn-primary btn-lg w-full shadow-lg shadow-primary-500/20"
          >
            {voting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                投票中...
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                确认投票
                {selectedOption && (
                  <span className="text-primary-200 ml-1">
                    → {options.find(o => o.id === selectedOption)?.content}
                  </span>
                )}
              </>
            )}
          </button>
        </div>
      )}

      {/* After Voting */}
      {hasVoted && isVoting && (
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
                {options.find(o => o.id === selectedOption)?.content}
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

      {/* Participants */}
      {members.length > 0 && (
        <div className="card p-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Users size={14} className="text-slate-400" />
              投票成员
            </h4>
            <span className="text-xs text-slate-400">{votedCount}/{totalVoters} 已投票</span>
          </div>
          <div className="flex -space-x-2">
            {members.map((member, i) => (
              <div
                key={member.user_id}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-white flex items-center justify-center text-xs font-medium text-slate-600"
                title={member.profiles?.full_name || '未知成员'}
                style={{ zIndex: members.length - i }}
              >
                {member.profiles?.full_name?.[0] || '?'}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Executions */}
      {executions.length > 0 && isEnded && (
        <div className="card p-4 mt-4">
          <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-slate-400" />
            执行任务
          </h4>
          <div className="space-y-2">
            {executions.map(exec => (
              <div key={exec.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={clsx(
                    'w-2 h-2 rounded-full',
                    exec.status === 'completed' ? 'bg-green-400' :
                    exec.status === 'in_progress' ? 'bg-blue-400' :
                    exec.status === 'overdue' ? 'bg-red-400' : 'bg-slate-300'
                  )} />
                  <span className="text-sm text-slate-700">{exec.title}</span>
                </div>
                {exec.due_date && (
                  <span className="text-xs text-slate-400">
                    {format(new Date(exec.due_date), 'MM/dd截止')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    voting: { label: '进行中', className: 'badge-info' },
    passed: { label: '已通过', className: 'badge-success' },
    rejected: { label: '未通过', className: 'badge-danger' },
    draft: { label: '草稿', className: 'badge-neutral' },
    archived: { label: '已归档', className: 'badge-neutral' },
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
