'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at?: string
}

interface TeamMembership {
  role: 'owner' | 'admin' | 'member' | 'viewer'
  weight: number
  teams: {
    id: string
    name: string
    slug: string
    avatar_url: string | null
  }
}

interface AuthContextValue {
  // State
  user: User | null
  teams: TeamMembership[]
  isLoading: boolean
  isAuthenticated: boolean
  currentTeam: TeamMembership | null

  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (email: string, password: string, full_name?: string) => Promise<{ success: boolean; error?: string; message?: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  setCurrentTeam: (teamId: string) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// ──────────────────────────────────────────────
// Provider
// ──────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [teams, setTeams] = useState<TeamMembership[]>([])
  const [currentTeam, setCurrentTeamState] = useState<TeamMembership | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 初始化：检查当前登录状态
  useEffect(() => {
    const initAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        const data = await res.json()

        if (data.authenticated && data.user) {
          setUser(data.user)
          setTeams(data.teams || [])
          // 自动选择第一个团队
          if (data.teams && data.teams.length > 0) {
            setCurrentTeamState(data.teams[0])
          }
        } else {
          setUser(null)
          setTeams([])
        }
      } catch {
        setUser(null)
        setTeams([])
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  // 登录
  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        return { success: false, error: data.error || '登录失败' }
      }

      setUser(data.user)
      // 重新获取团队信息
      const meRes = await fetch('/api/auth/me')
      const meData = await meRes.json()
      setTeams(meData.teams || [])
      if (meData.teams && meData.teams.length > 0) {
        setCurrentTeamState(meData.teams[0])
      }

      return { success: true }
    } catch {
      return { success: false, error: '网络错误，请稍后重试' }
    }
  }, [])

  // 注册
  const register = useCallback(async (email: string, password: string, full_name?: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name }),
      })

      const data = await res.json()

      if (!res.ok) {
        return { success: false, error: data.error || '注册失败' }
      }

      return {
        success: true,
        message: data.message || '注册成功',
      }
    } catch {
      return { success: false, error: '网络错误，请稍后重试' }
    }
  }, [])

  // 登出
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // 即使失败也清除本地状态
    } finally {
      setUser(null)
      setTeams([])
      setCurrentTeamState(null)
    }
  }, [])

  // 刷新用户信息
  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()

      if (data.authenticated && data.user) {
        setUser(data.user)
        setTeams(data.teams || [])
      } else {
        setUser(null)
        setTeams([])
        setCurrentTeamState(null)
      }
    } catch {
      // ignore
    }
  }, [])

  // 切换当前团队
  const setCurrentTeam = useCallback((teamId: string) => {
    const team = teams.find(t => t.teams.id === teamId)
    if (team) {
      setCurrentTeamState(team)
    }
  }, [teams])

  const value: AuthContextValue = {
    user,
    teams,
    isLoading,
    isAuthenticated: !!user,
    currentTeam,
    login,
    register,
    logout,
    refreshUser,
    setCurrentTeam,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// ──────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
