/**
 * Decisions API Service
 * 封装所有与决策相关的 API 调用
 */

import type { Decision } from '@/types/database'

export interface DecisionWithMeta extends Decision {
  creator?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
  team?: {
    id: string
    name: string
    slug: string
  }
  options?: Array<{
    id: string
    content: string
    description: string | null
    order_index: number
  }>
  vote_count?: number
  _count?: { votes: number }
}

export interface DecisionListResponse {
  success: boolean
  decisions: DecisionWithMeta[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface DecisionDetailResponse {
  success: boolean
  decision: DecisionWithMeta
  options: Array<{
    id: string
    content: string
    description: string | null
    order_index: number
  }>
  votes: Array<{
    id: string
    option_id: string
    user_id: string
    weight: number
    comment: string | null
    round: number
    created_at: string
  }>
  vote_results: {
    option_id: string
    content: string
    score: number
    percentage: number
    voter_count: number
  }[]
  members: Array<{
    user_id: string
    role: string
    weight: number
    profiles: {
      id: string
      full_name: string | null
      avatar_url: string | null
    }
  }>
  comments: Array<{
    id: string
    content: string
    created_at: string
    author: { id: string; full_name: string | null; avatar_url: string | null }
    replies: Array<any>
  }>
  executions: Array<{
    id: string
    title: string
    status: string
    due_date: string | null
    assignee?: { id: string; full_name: string | null; avatar_url: string | null }
  }>
  current_user_vote: { option_id: string; comment: string | null } | null
  is_expired: boolean
  current_user_role: string
  current_user_weight: number
}

export interface CreateDecisionParams {
  team_id: string
  title: string
  description?: string
  vote_type: 'simple' | 'weighted' | 'anonymous' | 'two_round'
  pass_threshold?: number
  voting_days?: number
  options: string[]
  start_voting?: boolean
}

class DecisionsAPI {
  private baseUrl = '/api/decisions'

  /**
   * 获取决策列表
   */
  async list(params?: {
    teamId?: string
    status?: string
    page?: number
    pageSize?: number
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }): Promise<DecisionListResponse> {
    const searchParams = new URLSearchParams()
    if (params?.teamId) searchParams.set('teamId', params.teamId)
    if (params?.status) searchParams.set('status', params.status)
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy)
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder)

    const url = `${this.baseUrl}${searchParams.toString() ? `?${searchParams}` : ''}`

    const res = await fetch(url, {
      credentials: 'include',
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || `获取决策列表失败 (${res.status})`)
    }

    return res.json()
  }

  /**
   * 获取决策详情
   */
  async getById(id: string): Promise<DecisionDetailResponse> {
    const res = await fetch(`${this.baseUrl}/${id}`, {
      credentials: 'include',
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || `获取决策详情失败 (${res.status})`)
    }

    return res.json()
  }

  /**
   * 创建决策
   */
  async create(params: CreateDecisionParams): Promise<{
    success: boolean
    decision: Decision
    message: string
  }> {
    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(params),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || '创建决策失败')
    }

    return res.json()
  }

  /**
   * 投票
   */
  async vote(decisionId: string, optionId: string, comment?: string, round = 1): Promise<{
    success: boolean
    vote_results: any
    voting_closed: boolean
    message: string
  }> {
    const res = await fetch(`${this.baseUrl}/${decisionId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ option_id: optionId, comment, round }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || '投票失败')
    }

    return res.json()
  }

  /**
   * 添加评论
   */
  async addComment(decisionId: string, content: string, parentId?: string): Promise<{
    success: boolean
    comment: any
  }> {
    const res = await fetch(`${this.baseUrl}/${decisionId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content, parent_id: parentId }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || '评论失败')
    }

    return res.json()
  }

  /**
   * 更新决策
   */
  async update(decisionId: string, updates: {
    title?: string
    description?: string
    status?: string
    voting_end?: string
  }): Promise<{ success: boolean; decision: Decision }> {
    const res = await fetch(`${this.baseUrl}/${decisionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || '更新失败')
    }

    return res.json()
  }

  /**
   * 创建执行任务
   */
  async createExecution(decisionId: string, params: {
    title: string
    assignee_id?: string
    due_date?: string
  }): Promise<{ success: boolean; execution: any }> {
    const res = await fetch(`${this.baseUrl}/${decisionId}/executions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(params),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || '创建任务失败')
    }

    return res.json()
  }
}

export const decisionsAPI = new DecisionsAPI()
