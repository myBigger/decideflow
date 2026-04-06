'use client'

import { useState, useCallback } from 'react'
import {
  Sparkles, RefreshCw, AlertTriangle, Lightbulb, Clock,
  CheckCircle2, TrendingUp, Calendar, ChevronDown, ChevronUp,
  Loader2, X, Info
} from 'lucide-react'
import clsx from 'clsx'
import type { AIInsight } from '@/types/database'

interface AIInsightPanelProps {
  decisionId: string
  insight: AIInsight | null
  type: 'before' | 'after'
  expanded?: boolean
}

type InsightStatus = 'idle' | 'generating' | 'success' | 'error'

export default function AIInsightPanel({
  decisionId,
  insight,
  type,
  expanded = false,
}: AIInsightPanelProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isExpanded, setIsExpanded] = useState(expanded)
  const [error, setError] = useState<string | null>(null)
  const [localInsight, setLocalInsight] = useState<AIInsight | null>(insight)
  const [showTip, setShowTip] = useState(false)

  const hasInsight = !!localInsight

  const generateInsight = useCallback(async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, decision_id: decisionId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '生成失败')
        return
      }

      if (data.success) {
        setLocalInsight(data.insight)
        setIsExpanded(true)
      } else {
        setError(data.error || '未知错误')
      }
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setIsGenerating(false)
    }
  }, [decisionId, type])

  const label = type === 'before' ? '投票前洞察' : '决策后洞察'
  const icon = type === 'before' ? <Lightbulb size={15} /> : <TrendingUp size={15} />

  return (
    <div className="border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-amber-50/60 border-b border-amber-100">
        <div className="flex items-center gap-2.5">
          <div className={clsx(
            'w-8 h-8 rounded-xl flex items-center justify-center',
            hasInsight ? 'bg-amber-100' : 'bg-amber-50'
          )}>
            {isGenerating ? (
              <Loader2 size={15} className="text-amber-600 animate-spin" />
            ) : (
              <Sparkles size={15} className={clsx(
                'transition-colors',
                hasInsight ? 'text-amber-600' : 'text-amber-400'
              )} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-amber-800">🤖 AI {label}</span>
              {hasInsight && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                  已生成
                </span>
              )}
            </div>
            <p className="text-xs text-amber-600 mt-0.5">
              {type === 'before'
                ? '基于历史数据 + 实时分析，预警潜在风险'
                : '胜出后自动生成执行方案与风险清单'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tip button */}
          <button
            onClick={() => setShowTip(!showTip)}
            className="btn btn-ghost p-1.5 rounded-lg text-amber-500 hover:bg-amber-100"
            title="什么是 AI 洞察？"
          >
            <Info size={14} />
          </button>

          {/* Regenerate / Generate button */}
          <button
            onClick={generateInsight}
            disabled={isGenerating}
            className={clsx(
              'btn text-xs px-3 py-1.5 rounded-xl transition-all',
              hasInsight
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                : 'bg-primary-500 text-white hover:bg-primary-600 shadow-sm'
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                生成中...
              </>
            ) : hasInsight ? (
              <>
                <RefreshCw size={12} />
                重新生成
              </>
            ) : (
              <>
                <Sparkles size={12} />
                生成洞察
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tip tooltip */}
      {showTip && (
        <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 animate-fade-in">
          <div className="flex items-start gap-2 text-xs text-blue-700">
            <Info size={13} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium mb-1">
                {type === 'before' ? '投票前洞察会做什么？' : '决策后洞察会做什么？'}
              </p>
              <p className="text-blue-600 leading-relaxed">
                {type === 'before'
                  ? '分析本团队历史决策数据，识别类似决策的结果和教训，预警被忽视的风险点，给出补充建议。'
                  : '基于投票结果，生成执行优先级清单、风险监控清单，并建议下次复盘时间。'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="px-5 py-3 bg-red-50 border-b border-red-100 flex items-center gap-2 text-xs text-red-700">
          <AlertTriangle size={13} className="shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Generating skeleton */}
      {isGenerating && !localInsight && (
        <div className="px-5 py-4 space-y-3">
          <SkeletonLine />
          <SkeletonLine width="75%" />
          <SkeletonLine width="88%" />
          <SkeletonLine width="60%" />
        </div>
      )}

      {/* Empty state */}
      {!hasInsight && !isGenerating && !error && (
        <div className="px-5 py-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-3">
            <Sparkles size={20} className="text-amber-500" />
          </div>
          <p className="text-sm font-medium text-amber-800 mb-1">
            还没有洞察
          </p>
          <p className="text-xs text-amber-600 mb-4 max-w-xs mx-auto">
            {type === 'before'
              ? '点击上方按钮，让 AI 分析历史数据，为你预警风险'
              : '投票结束后，将自动生成执行建议'}
          </p>
          <button
            onClick={generateInsight}
            className="btn btn-primary text-xs shadow-sm"
          >
            <Sparkles size={13} />
            立即生成洞察
          </button>
        </div>
      )}

      {/* Insight content */}
      {hasInsight && !isGenerating && (
        <div>
          {/* Expandable preview */}
          {!isExpanded && (
            <div
              className="px-5 py-4 cursor-pointer hover:bg-amber-50/40 transition-colors"
              onClick={() => setIsExpanded(true)}
            >
              <div className="flex flex-wrap gap-2">
                {localInsight?.before?.warnings?.slice(0, 2).map((w, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full flex items-center gap-1">
                    <AlertTriangle size={10} />
                    {w.substring(0, 30)}{w.length > 30 ? '...' : ''}
                  </span>
                ))}
                {localInsight?.after?.execution_priorities?.slice(0, 2).map((p, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-full flex items-center gap-1">
                    <Lightbulb size={10} />
                    {p.substring(0, 30)}{p.length > 30 ? '...' : ''}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1 mt-3 text-xs text-amber-500">
                <ChevronDown size={12} />
                点击展开完整洞察
              </div>
            </div>
          )}

          {/* Expanded content */}
          {isExpanded && (
            <div className="px-5 py-4 animate-fade-in space-y-4">
              {/* Before Insights */}
              {localInsight?.before && (
                <div>
                  {localInsight.before.warnings && localInsight.before.warnings.length > 0 && (
                    <InsightSection
                      icon={<AlertTriangle size={13} />}
                      title="⚠️ 风险预警"
                      iconBg="bg-red-50"
                      iconColor="text-red-500"
                      bgColor="bg-red-50/50"
                      textColor="text-red-800"
                      borderColor="border-red-100"
                      items={localInsight.before.warnings}
                      emoji="🔴"
                    />
                  )}

                  {localInsight.before.suggestions && localInsight.before.suggestions.length > 0 && (
                    <InsightSection
                      icon={<Lightbulb size={13} />}
                      title="💡 补充建议"
                      iconBg="bg-yellow-50"
                      iconColor="text-yellow-600"
                      bgColor="bg-yellow-50/50"
                      textColor="text-yellow-800"
                      borderColor="border-yellow-100"
                      items={localInsight.before.suggestions}
                      emoji="💡"
                    />
                  )}

                  {localInsight.before.similar_decisions && localInsight.before.similar_decisions.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1">
                        📊 历史相似决策
                      </p>
                      <div className="space-y-2">
                        {localInsight.before.similar_decisions.map((d, i) => (
                          <div key={i} className="bg-white/70 rounded-xl p-3 text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-slate-700">{d.title}</span>
                              <span className={clsx(
                                'px-1.5 py-0.5 rounded text-xs font-medium',
                                d.outcome.includes('良好') || d.outcome.includes('成功')
                                  ? 'bg-green-50 text-green-600'
                                  : 'bg-amber-50 text-amber-600'
                              )}>
                                {d.outcome.substring(0, 20)}
                              </span>
                            </div>
                            <p className="text-slate-500">💬 {d.lesson}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* After Insights */}
              {localInsight?.after && (
                <div>
                  {localInsight.after.execution_priorities && localInsight.after.execution_priorities.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-teal-700 mb-2 flex items-center gap-1">
                        <CheckCircle2 size={13} />
                        执行优先级
                      </p>
                      <div className="space-y-1.5">
                        {localInsight.after.execution_priorities.map((p, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-slate-700 bg-teal-50/60 rounded-lg px-3 py-2">
                            <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center text-xs font-bold shrink-0">
                              {i + 1}
                            </span>
                            {p}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {localInsight.after.risk_factors && localInsight.after.risk_factors.length > 0 && (
                    <InsightSection
                      icon={<AlertTriangle size={13} />}
                      title="🔴 风险监控"
                      iconBg="bg-orange-50"
                      iconColor="text-orange-500"
                      bgColor="bg-orange-50/50"
                      textColor="text-orange-800"
                      borderColor="border-orange-100"
                      items={localInsight.after.risk_factors}
                      emoji="🔴"
                    />
                  )}

                  {localInsight.after.next_review_date && (
                    <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-xl border border-teal-100">
                      <Calendar size={16} className="text-teal-600 shrink-0" />
                      <div>
                        <p className="text-xs text-teal-500">建议下次复盘</p>
                        <p className="text-sm font-semibold text-teal-800">
                          {localInsight.after.next_review_date}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Collapse button */}
              <button
                onClick={() => setIsExpanded(false)}
                className="flex items-center gap-1 text-xs text-amber-500 hover:text-amber-700 mx-auto"
              >
                <ChevronUp size={12} />
                收起
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────
// Helper Components
// ──────────────────────────────────────────────

function InsightSection({
  icon,
  title,
  iconBg,
  iconColor,
  bgColor,
  textColor,
  borderColor,
  items,
  emoji,
}: {
  icon: React.ReactNode
  title: string
  iconBg: string
  iconColor: string
  bgColor: string
  textColor: string
  borderColor: string
  items: string[]
  emoji: string
}) {
  return (
    <div className={clsx('rounded-xl p-3 mb-3 border', bgColor, borderColor)}>
      <div className="flex items-center gap-1.5 mb-2">
        <div className={clsx('w-6 h-6 rounded-lg flex items-center justify-center', iconBg)}>
          <span className={iconColor}>{icon}</span>
        </div>
        <span className={clsx('text-xs font-semibold', textColor)}>
          {title}
        </span>
      </div>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div
            key={i}
            className={clsx(
              'flex items-start gap-2 rounded-lg px-3 py-2 text-xs',
              bgColor
            )}
          >
            <span className="shrink-0 mt-0.5">{emoji}</span>
            <span className={textColor}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SkeletonLine({ width = '100%' }: { width?: string }) {
  return (
    <div className="animate-pulse flex items-center gap-2">
      <div className="w-5 h-5 rounded bg-amber-200 shrink-0" />
      <div
        className="h-3 rounded bg-amber-200"
        style={{ width, maxWidth: width }}
      />
    </div>
  )
}
