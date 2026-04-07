'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface AuthUser {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
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
  user: AuthUser | null
  session: Session | null
  teams: TeamMembership[]
  isLoading: boolean
  isAuthenticated: boolean
  currentTeam: TeamMembership | null
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  setCurrentTeam: (teamId: string) => void
  signInWithPassword: (email: string, password: string) => Promise<{ error?: string }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// ──────────────────────────────────────────────
// Provider — browser-side only via onAuthStateChange
// ──────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [teams, setTeams] = useState<TeamMembership[]>([])
  const [currentTeam, setCurrentTeamState] = useState<TeamMembership | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const supabase = useRef(createClient()).current
  const teamsFetched = useRef(false)

  // 获取用户对应的团队信息
  const fetchTeams = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        role,
        weight,
        teams (
          id,
          name,
          slug,
          avatar_url
        )
      `)
      .eq('user_id', userId)

    if (!error && data) {
      return data as unknown as TeamMembership[]
    }
    return []
  }, [supabase])

  // 用户信息映射
  const mapUser = useCallback((authUser: User | null): AuthUser | null => {
    if (!authUser) return null
    return {
      id: authUser.id,
      email: authUser.email ?? '',
      full_name: authUser.user_metadata?.full_name ?? null,
      avatar_url: authUser.user_metadata?.avatar_url ?? null,
    }
  }, [])

  // 初始化：监听浏览器端 Supabase auth 状态
  useEffect(() => {
    let mounted = true  // 防止组件卸载后仍更新状态

    // 监听后续 auth 变化 — onAuthStateChange 会在 cookie 中有 session 时立即触发，
    // 不需要任何网络请求，浏览器直接读 cookie 即可
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        setSession(session)
        if (session) {
          setUser(mapUser(session.user))
          if (!teamsFetched.current) {
            teamsFetched.current = true
            fetchTeams(session.user.id).then(teamsData => {
              if (!mounted) return
              setTeams(teamsData)
              if (teamsData.length > 0) {
                setCurrentTeamState(teamsData[0])
              }
            }).catch(() => {
              if (!mounted) return
              // fetch 失败不影响 auth 状态
            })
          }
        } else {
          setUser(null)
          setTeams([])
          setCurrentTeamState(null)
          teamsFetched.current = false
        }
        setIsLoading(false)
      }
    )

    // 兜底：如果 onAuthStateChange 因浏览器代理/网络问题没有触发，
    // 3 秒后强制结束加载状态（允许用户看到未登录状态，而不是永久转圈）
    const fallbackTimer = setTimeout(() => {
      if (!mounted) return
      setIsLoading(false)
    }, 3000)

    return () => {
      mounted = false
      clearTimeout(fallbackTimer)
      subscription.unsubscribe()
    }
  }, [supabase, fetchTeams, mapUser])

  // 登录（浏览器端直接调用）
  const signInWithPassword = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { error: error.message }
      return {}
    },
    [supabase]
  )

  // 注册
  const signUp = useCallback(
    async (email: string, password: string, fullName: string): Promise<{ error?: string }> => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (error) return { error: error.message }
      return {}
    },
    [supabase]
  )

  // 登出
  const logout = useCallback(async () => {
    await supabase.auth.signOut()
  }, [supabase])

  // 刷新用户信息
  const refreshUser = useCallback(async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (currentUser) {
      setUser(mapUser(currentUser))
      const teamsData = await fetchTeams(currentUser.id)
      setTeams(teamsData)
    }
  }, [supabase, mapUser, fetchTeams])

  // 切换当前团队
  const setCurrentTeam = useCallback((teamId: string) => {
    const team = teams.find(t => t.teams.id === teamId)
    if (team) setCurrentTeamState(team)
  }, [teams])

  const value: AuthContextValue = {
    user,
    session,
    teams,
    isLoading,
    isAuthenticated: !!user,
    currentTeam,
    logout,
    refreshUser,
    setCurrentTeam,
    signInWithPassword,
    signUp,
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
