'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus } from 'lucide-react'
import type { Decision } from '@/types/database'
import { decisionsAPI, type DecisionWithMeta } from '@/lib/api/decisions'
import { SkeletonList, EmptyState, ErrorState } from '@/components/ui'
import DecisionCard from '@/components/DecisionCard'
import DecisionDetail from '@/components/DecisionDetail'

interface DashboardHomeProps {
  teamId?: string
  onSelectDecision: (d: Decision) => void
  onCreateClick: () => void
  votingCount?: number
  passedCount?: number
  draftCount?: number
  totalCount?: number
}

export default function DashboardHome({
  teamId,
  onSelectDecision,
  onCreateClick,
  votingCount,
  passedCount,
  draftCount,
  totalCount,
}: DashboardHomeProps) {
  const [decisions, setDecisions] = useState<DecisionWithMeta[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedDecision, setSelectedDecision] = useState<DecisionWithMeta | null>(null)

  const fetchDecisions = useCallback(async (status?: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await decisionsAPI.list({
        teamId,
        status: status === 'all' ? undefined : status,
        page,
        pageSize: 20,
        sortBy: 'created_at',
        sortOrder: 'desc',
      })
      setDecisions(data.decisions || [])
      setTotalPages(data.totalPages)
      setTotal(data.total)
    } catch (err: any) {
      setError(err.message || '加载失败')
    } finally {
      setIsLoading(false)
    }
  }, [teamId, page])

  // 切换团队时重置筛选条件到"全部"
  useEffect(() => {
    setFilter('all')
    setPage(1)
  }, [teamId])

  useEffect(() => {
    fetchDecisions(filter)
  }, [fetchDecisions, filter])

  const handleSelectDecision = useCallback((d: DecisionWithMeta) => {
    setSelectedDecision(d)
    onSelectDecision(d)
  }, [onSelectDecision])

  const handleBack = useCallback(() => {
    setSelectedDecision(null)
    fetchDecisions(filter)
  }, [fetchDecisions, filter])

  const handleVote = useCallback(async (decisionId: string, optionId: string) => {
    // 投票后刷新列表中的数据
    setSelectedDecision(null)
    await fetchDecisions(filter)
  }, [fetchDecisions, filter])

  const filteredDecisions = decisions
  const votingDecisions = filteredDecisions.filter(d => d.status === 'voting')
  const otherDecisions = filteredDecisions.filter(d => d.status !== 'voting')

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="h-7 w-32 bg-slate-200 rounded-lg animate-pulse mb-1" />
            <div className="h-4 w-64 bg-slate-100 rounded animate-pulse" />
          </div>
          <div className="h-9 w-32 bg-slate-200 rounded-xl animate-pulse" />
        </div>
        <SkeletonList count={3} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <ErrorState message={error} onRetry={() => fetchDecisions(filter)} />
      </div>
    )
  }

  // 详情视图
  if (selectedDecision) {
    return (
      <DecisionDetail
        decision={selectedDecision as unknown as Decision}
        onBack={handleBack}
        onVote={handleVote}
      />
    )
  }

  // 列表视图
  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">
            {filter === 'all' ? '决策列表' :
             filter === 'voting' ? '进行中的投票' :
             filter === 'passed' ? '已结束的决策' : '草稿'}
          </h1>
          <p className="page-subtitle">
            {total > 0
              ? `共 ${total} 个决策`
              : '团队的所有决策，从发起到留档，全流程可视化'}
          </p>
        </div>
        <button
          onClick={onCreateClick}
          className="btn btn-primary shadow-sm shadow-primary-500/25 hover:shadow-md hover:shadow-primary-500/30"
        >
          <Plus size={18} />
          新建决策
        </button>
      </div>

      <div className="flex items-center gap-1 mb-6 bg-white rounded-xl p-1 border border-slate-200 w-fit">
        {[
          { key: 'all', label: '全部', count: totalCount ?? total },
          { key: 'voting', label: '进行中', count: votingCount ?? votingDecisions.length },
          { key: 'draft', label: '草稿', count: draftCount ?? otherDecisions.filter(d => d.status === 'draft').length },
          { key: 'passed', label: '已结束', count: passedCount ?? otherDecisions.filter(d => d.status === 'passed').length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => { setFilter(tab.key); setPage(1) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === tab.key
                ? 'bg-primary-50 text-primary-700 shadow-sm'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1.5 text-xs ${
                filter === tab.key ? 'text-primary-500' : 'text-slate-400'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {filteredDecisions.length === 0 ? (
        <EmptyState
          variant={filter === 'voting' ? 'voting' : 'default'}
          title={filter === 'voting' ? '暂无进行中的投票' : filter === 'draft' ? '暂无草稿' : filter === 'passed' ? '暂无已结束决策' : '暂无决策'}
          description={
            filter === 'all'
              ? '发起第一个团队决策，让决策有据可查'
              : undefined
          }
          action={
            filter === 'all' && (
              <button onClick={onCreateClick} className="btn btn-primary text-sm">
                <Plus size={14} />
                发起第一个决策
              </button>
            )
          }
        />
      ) : (
        <div className="space-y-8">
          {votingDecisions.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-500"></span>
                </span>
                <h2 className="section-title mb-0">进行中的投票</h2>
                <span className="badge badge-info">{votingDecisions.length}</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 stagger-children">
                {votingDecisions.map(decision => (
                  <DecisionCard
                    key={decision.id}
                    decision={decision}
                    onClick={() => handleSelectDecision(decision)}
                  />
                ))}
              </div>
            </section>
          )}

          {otherDecisions.length > 0 && (
            <section>
              <h2 className="section-title">
                {votingDecisions.length > 0 ? '其他决策' : '全部决策'}
                <span className="text-xs font-normal text-slate-400 ml-2">{otherDecisions.length}个</span>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 stagger-children">
                {otherDecisions.map(decision => (
                  <DecisionCard
                    key={decision.id}
                    decision={decision}
                    onClick={() => handleSelectDecision(decision)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn btn-secondary btn-sm"
          >
            上一页
          </button>
          <span className="text-sm text-slate-500 px-3">
            第 {page} / {totalPages} 页
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn btn-secondary btn-sm"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  )
}
