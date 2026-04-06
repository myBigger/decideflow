/**
 * Teams API Service
 */

export interface Team {
  id: string
  name: string
  slug: string
  avatar_url: string | null
  owner_id: string
  created_at: string
}

export interface TeamMember {
  id: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  weight: number
  nickname: string | null
  joined_at: string
  teams: Team
}

export interface TeamDetail {
  id: string
  name: string
  slug: string
  avatar_url: string | null
  owner_id: string
  members: Array<{
    id: string
    role: string
    weight: number
    nickname: string | null
    profiles: {
      id: string
      email: string
      full_name: string | null
      avatar_url: string | null
    }
  }>
  stats: {
    total_decisions: number
    voting: number
    total_members: number
  }
  currentUserRole: string
  currentUserWeight: number
}

class TeamsAPI {
  private baseUrl = '/api/teams'

  /**
   * 获取用户所属的团队列表
   */
  async list(): Promise<{ success: boolean; teams: TeamMember[] }> {
    const res = await fetch(this.baseUrl, { credentials: 'include' })
    if (!res.ok) throw new Error('获取团队列表失败')
    return res.json()
  }

  /**
   * 获取团队详情
   */
  async getById(teamId: string): Promise<{ success: boolean; team: Team; members: any[]; stats: any }> {
    const res = await fetch(`${this.baseUrl}/${teamId}`, { credentials: 'include' })
    if (!res.ok) throw new Error('获取团队详情失败')
    return res.json()
  }

  /**
   * 创建团队
   */
  async create(name: string): Promise<{ success: boolean; team: Team; message: string }> {
    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || '创建团队失败')
    }
    return res.json()
  }

  /**
   * 邀请成员
   */
  async inviteMember(teamId: string, params: {
    email: string
    role?: string
    weight?: number
    nickname?: string
  }): Promise<{ success: boolean; member: any; message: string }> {
    const res = await fetch(`${this.baseUrl}/${teamId}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(params),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || '邀请成员失败')
    }
    return res.json()
  }
}

export const teamsAPI = new TeamsAPI()
