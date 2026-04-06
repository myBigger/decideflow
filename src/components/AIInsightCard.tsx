'use client'

import { useState } from 'react'
import { Sparkles, ChevronDown, ChevronUp, AlertTriangle, TrendingUp, Lightbulb, Calendar } from 'lucide-react'
import clsx from 'clsx'
import type { AIInsight } from '@/types/database'

interface AIInsightCardProps {
  insight: AIInsight
  expanded?: boolean
}

export default function AIInsightCard({ insight, expanded: defaultExpanded = false }: AIInsightCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const hasBefore = !!insight.before
  const hasAfter = !!insight.after

  return (
    <div className="mt-4 border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <Sparkles size={16} className="text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800">🤖 AI 决策洞察</p>
            <p className="text-xs text-amber-500">基于历史数据 + 实时分析生成</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-amber-400" />
        ) : (
          <ChevronDown size={16} className="text-amber-400" />
        )}
      </button>

      {/* Collapsed Preview */}
      {!expanded && (
        <div className="mt-3 flex flex-wrap gap-2">
          {insight.before?.warnings?.slice(0, 2).map((w, i) => (
            <span key={i} className="text-xs px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full flex items-center gap-1">
              <AlertTriangle size={10} />
              {w}
            </span>
          ))}
          {insight.after?.execution_priorities?.slice(0, 1).map((s: string, i: number) => (
            <span key={i} className="text-xs px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-full flex items-center gap-1">
              <Lightbulb size={10} />
              {s}
            </span>
          ))}
          <span className="text-xs text-amber-400 self-center ml-auto">点击展开</span>
        </div>
      )}

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-4 space-y-4 animate-fade-in">
          {/* Before Insights */}
          {insight.before && (
            <div>
              <div className="flex items-center gap-1 mb-2">
                <AlertTriangle size={13} className="text-amber-600" />
                <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">投票前建议</span>
              </div>

              {insight.before.warnings && insight.before.warnings.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {insight.before.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-amber-800 bg-amber-100/60 rounded-lg px-3 py-2">
                      <span className="text-amber-500 mt-0.5 shrink-0">⚠️</span>
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {insight.before.suggestions && insight.before.suggestions.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {insight.before.suggestions.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-yellow-800 bg-yellow-100/60 rounded-lg px-3 py-2">
                      <span className="text-yellow-500 mt-0.5 shrink-0">💡</span>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              )}

              {insight.before.similar_decisions && insight.before.similar_decisions.length > 0 && (
                <div>
                  <p className="text-xs text-amber-600 font-medium mb-2">📊 历史上相似的决策</p>
                  {insight.before.similar_decisions.map((d, i) => (
                    <div key={i} className="bg-white/70 rounded-lg p-3 mb-2 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-slate-700">{d.title}</span>
                        <span className={clsx(
                          'px-1.5 py-0.5 rounded text-xs font-medium',
                          d.outcome.includes('成功') || d.outcome.includes('通过')
                            ? 'bg-green-50 text-green-600'
                            : 'bg-red-50 text-red-500'
                        )}>
                          {d.outcome.includes('成功') || d.outcome.includes('通过') ? '✓ 成功' : '✗ 有风险'}
                        </span>
                      </div>
                      <p className="text-slate-500">{d.lesson}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* After Insights */}
          {insight.after && (
            <div>
              <div className="flex items-center gap-1 mb-2 pt-3 border-t border-amber-200/60">
                <Calendar size={13} className="text-teal-600" />
                <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">决策后执行建议</span>
              </div>

              {insight.after.execution_priorities && (
                <div className="mb-3">
                  <p className="text-xs text-slate-500 mb-2">执行优先级</p>
                  <div className="space-y-1">
                    {insight.after.execution_priorities.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-700">
                        <span className="w-5 h-5 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center text-xs font-bold shrink-0">
                          {i + 1}
                        </span>
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insight.after.risk_factors && (
                <div className="mb-3">
                  <p className="text-xs text-slate-500 mb-2">风险预警</p>
                  <div className="space-y-1.5">
                    {insight.after.risk_factors.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-orange-700 bg-orange-50 rounded-lg px-3 py-2">
                        <span>🔴</span>
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insight.after.next_review_date && (
                <div className="flex items-center gap-2 p-3 bg-teal-50 rounded-xl">
                  <Calendar size={14} className="text-teal-600" />
                  <div>
                    <p className="text-xs text-teal-500">下次复盘时间</p>
                    <p className="text-sm font-semibold text-teal-800">{insight.after.next_review_date}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
