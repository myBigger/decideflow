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
    let mounted = true
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null

    const init = async () => {
      // 1. 先设置 onAuthStateChange 监听未来变化
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!mounted) return
          if (fallbackTimer) {
            clearTimeout(fallbackTimer)
            fallbackTimer = null
          }
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
          setIsLoading(false)
        }
      )

      // 2. 同时用 getSession() 强制从 cookie 读取初始 session
      //    getSession() 在浏览器端优先读本地 cookie，不一定发网络请求
      //    5 秒超时兜底，防止因代理阻断而永久挂起
      const TIMEOUT_MS = 5000
      let sessionResolved = false

      try {
        const sessionResult = await new Promise<
          { data: { session: Session | null } }
        >((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)
          supabase.auth.getSession().then(
            (result) => {
              clearTimeout(timer)
              resolve(result)
            },
            (err) => {
              clearTimeout(timer)
              reject(err)
            }
          )
        })

        if (!mounted || sessionResolved) return

        if (sessionResult.data.session) {
          // getSession 找到了 session，直接设置，跳过等待 onAuthStateChange
          setSession(sessionResult.data.session)
          setUser(mapUser(sessionResult.data.session.user))
          if (!teamsFetched.current) {
            teamsFetched.current = true
            try {
              const teamsData = await fetchTeams(sessionResult.data.session.user.id)
              if (!mounted) return
              setTeams(teamsData)
              if (teamsData.length > 0) {
                setCurrentTeamState(teamsData[0])
              }
            } catch { /* ignore */ }
          }
        } else {
          // cookie 中无 session，等待 onAuthStateChange（登录页面跳转后触发）
        }
        sessionResolved = true
        setIsLoading(false)
      } catch {
        if (!mounted) return
        if (!sessionResolved) {
          // 超时或出错：等待 onAuthStateChange，最长等 8 秒
          fallbackTimer = setTimeout(() => {
            if (!mounted) return
            setIsLoading(false)
          }, 8000)
        }
      }

      if (!mounted) {
        subscription.unsubscribe()
      }
    }

    init()

    return () => {
      mounted = false
      if (fallbackTimer) clearTimeout(fallbackTimer)
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
