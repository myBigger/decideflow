'use client'

import clsx from 'clsx'

// ──────────────────────────────────────────────
// Loading Skeleton Components
// ──────────────────────────────────────────────

export function SkeletonCard() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-5 w-16 rounded-full bg-slate-200" />
        <div className="h-5 w-12 rounded-full bg-slate-200" />
      </div>
      <div className="h-4 w-3/4 bg-slate-200 rounded-lg mb-3" />
      <div className="h-3 w-full bg-slate-100 rounded-lg mb-4" />
      <div className="h-3 w-2/3 bg-slate-100 rounded-lg" />
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
        <div className="h-3 w-16 bg-slate-100 rounded" />
        <div className="h-3 w-20 bg-slate-100 rounded" />
      </div>
    </div>
  )
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export function SkeletonDetail() {
  return (
    <div className="max-w-4xl animate-pulse">
      <div className="h-4 w-20 bg-slate-200 rounded-lg mb-4" />
      <div className="card-elevated p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-6 w-16 rounded-full bg-slate-200" />
          <div className="h-6 w-20 rounded-full bg-slate-200" />
        </div>
        <div className="h-6 w-full bg-slate-200 rounded-lg mb-2" />
        <div className="h-4 w-4/5 bg-slate-100 rounded-lg mb-4" />
        <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl">
          {[1, 2, 3, 4].map(i => (
            <div key={i}>
              <div className="h-3 w-12 bg-slate-100 rounded mb-1" />
              <div className="h-4 w-16 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="card p-4">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-slate-200 rounded-full shrink-0" />
              <div className="flex-1">
                <div className="h-4 w-2/3 bg-slate-200 rounded-lg mb-2" />
                <div className="h-3 w-full bg-slate-100 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// Empty State Components
// ──────────────────────────────────────────────

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  variant?: 'default' | 'voting' | 'search' | 'team'
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'default',
}: EmptyStateProps) {
  const defaultIcons: Record<string, React.ReactNode> = {
    default: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
        <path d="M9 12h6M9 16h4M7 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V8l-5-5z"/>
        <path d="M14 3v5h5"/>
      </svg>
    ),
    voting: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="4"/>
        <path d="M9 12l2 2 4-4"/>
      </svg>
    ),
    search: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
        <circle cx="11" cy="11" r="8"/>
        <path d="M21 21l-4.35-4.35"/>
        <path d="M11 8v6M8 11h6"/>
      </svg>
    ),
    team: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  }

  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        {icon || defaultIcons[variant]}
      </div>
      <p className="empty-state-title">{title}</p>
      {description && <p className="empty-state-desc">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

// ──────────────────────────────────────────────
// Error State
// ──────────────────────────────────────────────

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export function ErrorState({
  message = '加载失败，请稍后重试',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon bg-red-50">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4M12 16h.01"/>
        </svg>
      </div>
      <p className="empty-state-title text-red-600">出错了</p>
      <p className="empty-state-desc">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn btn-secondary text-sm mt-5"
        >
          重试
        </button>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────
// Status Badge
// ──────────────────────────────────────────────

export function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    voting: { label: '进行中', className: 'badge-info' },
    passed: { label: '已通过', className: 'badge-success' },
    rejected: { label: '未通过', className: 'badge-danger' },
    draft: { label: '草稿', className: 'badge-neutral' },
    archived: { label: '已归档', className: 'badge-neutral' },
  }

  const config = configs[status] || configs.draft

  return (
    <span className={clsx('badge', config.className)}>
      {config.label}
    </span>
  )
}

// ──────────────────────────────────────────────
// Time Display
// ──────────────────────────────────────────────

export function TimeDisplay({ date, format = 'relative' }: {
  date: string
  format?: 'relative' | 'absolute'
}) {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (format === 'relative') {
    if (diffDays === 0) return <span className="text-slate-600">今天</span>
    if (diffDays === 1) return <span className="text-slate-600">昨天</span>
    if (diffDays < 7) return <span className="text-slate-600">{diffDays}天前</span>
    if (diffDays < 30) return <span className="text-slate-600">{Math.floor(diffDays / 7)}周前</span>
  }

  return (
    <span className="text-slate-500">
      {d.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })}
    </span>
  )
}
