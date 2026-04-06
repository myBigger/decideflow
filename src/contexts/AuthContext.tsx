'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { getSession, logout as serverLogout } from '@/app/actions/auth'

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

export interface TeamMembership {
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

  // 初始化：检查当前登录状态（使用 Server Action 读取 cookies）
  useEffect(() => {
    const initAuth = async () => {
      try {
        const session = await getSession()

        if (session.authenticated && session.user) {
          setUser(session.user as User)
          setTeams((session.teams || []) as TeamMembership[])
          // 自动选择第一个团队
          if (session.teams && session.teams.length > 0) {
            setCurrentTeamState(session.teams[0] as TeamMembership)
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

  // 登出（使用 Server Action）
  const logout = useCallback(async () => {
    try {
      await serverLogout()
    } catch {
      // 即使失败也清除本地状态
      setUser(null)
      setTeams([])
      setCurrentTeamState(null)
    }
  }, [])

  // 刷新用户信息
  const refreshUser = useCallback(async () => {
    try {
      const session = await getSession()
      if (session.authenticated && session.user) {
        setUser(session.user as User)
        setTeams((session.teams || []) as TeamMembership[])
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
