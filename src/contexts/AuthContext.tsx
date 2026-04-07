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

    // 先通过 onAuthStateChange 快速获取初始状态（如果 cookie 中有 session）
    // getUser() 始终请求服务器，最可靠，但稍慢，所以用 10s 超时兜底
    const TIMEOUT_MS = 10000

    const init = async () => {
      // 用 getUser 而不是 getSession —— getUser 始终验证服务器端 session，更可靠
      const getUserPromise = supabase.auth.getUser()

      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS))

      let session = null
      try {
        const result = await Promise.race([getUserPromise, timeout])
        if (result?.data?.user) {
          session = result.data
        }
      } catch {
        // getUser 失败，不影响 — cookie 中无 session
      }

      if (!mounted) return

      if (session?.user) {
        const user = mapUser(session.user)
        setUser(user)
        // 从 cookie 中恢复 session（getUser 不返回完整 session）
        // 尝试从 cookie 读 session
        try {
          const { data: sessionData } = await supabase.auth.getSession()
          if (sessionData?.session) {
            setSession(sessionData.session)
          }
        } catch { /* ignore */ }

        fetchTeams(user.id).then(teamsData => {
          if (!mounted) return
          setTeams(teamsData)
          teamsFetched.current = true
          if (teamsData.length > 0) {
            setCurrentTeamState(teamsData[0])
          }
        }).catch(() => {
          if (!mounted) return
          teamsFetched.current = true
        })
      }
      setIsLoading(false)
    }

    init()

    // 监听后续 auth 变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        setSession(session)
        if (session) {
          setUser(mapUser(session.user))
          if (!teamsFetched.current) {
            teamsFetched.current = true
            try {
              const teamsData = await fetchTeams(session.user.id)
              if (!mounted) return
              setTeams(teamsData)
              if (teamsData.length > 0) {
                setCurrentTeamState(teamsData[0])
              }
            } catch {
              // fetch 失败不影响 auth 状态
            }
          }
        } else {
          setUser(null)
          setTeams([])
          setCurrentTeamState(null)
          teamsFetched.current = false
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase, fetchTeams, mapUser])

  // 登录（浏览器端直接调用，跳过 Server Action 的 cookie 问题）
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
