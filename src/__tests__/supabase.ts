/**
 * Supabase Mock Utilities
 *
 * Provides typed mock Supabase clients for use in tests.
 * Use `createMockSupabase()` to get a fully-typed client that
 * intercepts chain calls with in-memory data.
 */

import type { Database } from '@/types/database'
import type { Decision, Option, Vote, TeamMember, Team, Profile } from '@/types/database'

// ─── In-memory store type ──────────────────────────────────────────────────

export type MockStore = {
  profiles: Profile[]
  teams: Team[]
  team_members: TeamMember[]
  decisions: Decision[]
  options: Option[]
  votes: Vote[]
}

// ─── Chain builder helpers ─────────────────────────────────────────────────

type QueryChain<T> = {
  select: () => QueryChain<T>
  insert: (row: Partial<T>) => QueryChain<T>
  update: (row: Partial<T>) => QueryChain<T>
  upsert: (row: Partial<T>) => QueryChain<T>
  delete: () => QueryChain<T>
  eq: (col: keyof T, val: unknown) => QueryChain<T>
  neq: (col: keyof T, val: unknown) => QueryChain<T>
  in: (col: keyof T, vals: unknown[]) => QueryChain<T>
  gte: (col: keyof T, val: unknown) => QueryChain<T>
  lte: (col: keyof T, val: unknown) => QueryChain<T>
  order: (col: keyof T, opts?: { ascending?: boolean }) => QueryChain<T>
  limit: (n: number) => QueryChain<T>
  single: () => Promise<{ data: T | null; error: Error | null }>
  then: <T2>(
    cb: (val: { data: T[] | null; error: Error | null }) => T2
  ) => Promise<T2>
  data: T[] | null
  error: Error | null
}

function createChain<T extends Record<string, unknown>>(
  store: unknown[],
  tableName: string
): QueryChain<T> {
  let filtered = [...store] as T[]
  const chain: QueryChain<T> = {
    select: () => chain,
    insert: (row) => {
      const record = { ...row, id: (row as Record<string, unknown>).id || crypto.randomUUID() } as T
      store.push(record)
      return chain
    },
    update: (row) => {
      filtered = filtered.map((r) => ({ ...r, ...row }))
      store.splice(0, store.length, ...filtered)
      return chain
    },
    upsert: (row) => {
      const existing = (store as T[]).findIndex(
        (r) => (r as Record<string, unknown>).id === (row as Record<string, unknown>).id
      )
      if (existing >= 0) store[existing] = { ...store[existing], ...row } as T
      else store.push(row as T)
      return chain
    },
    delete: () => {
      store.splice(0, store.length)
      return chain
    },
    eq: (col, val) => {
      filtered = filtered.filter((r) => r[col] === val)
      return chain
    },
    neq: (col, val) => {
      filtered = filtered.filter((r) => r[col] !== val)
      return chain
    },
    in: (col, vals) => {
      filtered = filtered.filter((r) => vals.includes(r[col]))
      return chain
    },
    gte: (col, val) => {
      filtered = filtered.filter((r) => (r[col] as number) >= (val as number))
      return chain
    },
    lte: (col, val) => {
      filtered = filtered.filter((r) => (r[col] as number) <= (val as number))
      return chain
    },
    order: (col, opts = {}) => {
      const asc = opts.ascending !== false
      filtered.sort((a, b) => {
        const va = a[col] as string | number
        const vb = b[col] as string | number
        return asc ? (va < vb ? -1 : 1) : (va > vb ? -1 : 1)
      })
      return chain
    },
    limit: (n) => {
      filtered = filtered.slice(0, n)
      return chain
    },
    single: async () => {
      return { data: (filtered[0] as T) ?? null, error: null }
    },
    then: async (cb) => cb({ data: filtered as T[] | null, error: null }),
    get data() { return filtered as T[] | null },
    get error() { return null },
  }
  return chain
}

// ─── Full mock client factory ──────────────────────────────────────────────

export interface MockSupabaseClient {
  auth: {
    getUser: () => Promise<{ data: { user: MockUser | null } }>
    getSession: () => Promise<{ data: { session: MockSession | null } }>
    signInWithPassword: (opts: { email: string; password: string }) => Promise<{
      data: { user: MockUser; session: MockSession }
      error: Error | null
    }>
    signUp: (opts: { email: string; password: string; options?: object }) => Promise<{
      data: { user: MockUser; session: MockSession }
      error: Error | null
    }>
    signOut: () => Promise<{ error: Error | null }>
    onAuthStateChange: (cb: (event: string, session: MockSession | null) => void) => {
      data: { subscription: { unsubscribe: () => void } }
    }
  }
  from: <T extends keyof Database['public']['Tables']>(
    table: T
  ) => QueryChain<Database['public']['Tables'][T]['Row']>
  storage: {
    from: () => ({ upload: () => Promise<{ data: object | null; error: Error | null }> })
  }
}

export interface MockUser {
  id: string
  email: string
  user_metadata?: { full_name?: string; avatar_url?: string }
}

export interface MockSession {
  user: MockUser
  access_token: string
}

let _currentUser: MockUser | null = null

export function createMockSupabase(store: MockStore): MockSupabaseClient {
  return {
    auth: {
      getUser: async () => ({ data: { user: _currentUser } }),
      getSession: async () => ({
        data: {
          session: _currentUser
            ? { user: _currentUser, access_token: 'mock-token' }
            : null,
        },
      }),
      signInWithPassword: async ({ email }) => {
        const user: MockUser = {
          id: 'user-test-001',
          email,
          user_metadata: { full_name: 'Test User' },
        }
        _currentUser = user
        return { data: { user, session: { user, access_token: 'mock-token' } }, error: null }
      },
      signUp: async ({ email }) => {
        const user: MockUser = { id: 'user-test-new', email }
        _currentUser = user
        return { data: { user, session: { user, access_token: 'mock-token' } }, error: null }
      },
      signOut: async () => {
        _currentUser = null
        return { error: null }
      },
      onAuthStateChange: (cb) => ({
        data: {
          subscription: {
            unsubscribe: () => {},
          },
        },
      }),
    },
    from: (table) => {
      const tableMap: Record<string, unknown[]> = {
        profiles: store.profiles,
        teams: store.teams,
        team_members: store.team_members,
        decisions: store.decisions,
        options: store.options,
        votes: store.votes,
      }
      return createChain<Database['public']['Tables']['decisions']['Row']>(
        tableMap[table] ?? [],
        table
      ) as QueryChain<Database['public']['Tables']['decisions']['Row']>
    },
    storage: {
      from: () => ({
        upload: async () => ({ data: { publicUrl: 'https://mock.img/file.png' }, error: null }),
      }),
    },
  }
}

// ─── Pre-built seed data ───────────────────────────────────────────────────

export const SEED_USER: MockUser = {
  id: 'user-test-001',
  email: 'alice@example.com',
  user_metadata: { full_name: 'Alice' },
}

export const SEED_TEAM: Team = {
  id: 'team-test-001',
  name: 'Alpha Squad',
  slug: 'alpha-squad',
  owner_id: 'user-test-001',
  avatar_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const SEED_MEMBER: TeamMember = {
  id: 'member-001',
  team_id: 'team-test-001',
  user_id: 'user-test-001',
  role: 'owner',
  weight: 3,
  nickname: null,
  joined_at: new Date().toISOString(),
}

export function makeDecision(overrides: Partial<Decision> = {}): Decision {
  return {
    id: 'decision-test-001',
    team_id: 'team-test-001',
    title: '选择哪个方案？',
    description: '需要选择一个技术方案',
    vote_type: 'simple',
    status: 'voting',
    created_by: 'user-test-001',
    voting_start: null,
    voting_end: null,
    pass_threshold: 50,
    total_score: null,
    final_result: null,
    round: 1,
    ai_insight: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

export function makeOption(content: string, overrides: Partial<Option> = {}): Option {
  return {
    id: crypto.randomUUID(),
    decision_id: 'decision-test-001',
    content,
    description: null,
    order_index: 0,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

export function makeVote(
  userId: string,
  optionId: string,
  overrides: Partial<Vote> = {}
): Vote {
  return {
    id: crypto.randomUUID(),
    decision_id: 'decision-test-001',
    option_id: optionId,
    user_id: userId,
    weight: 1,
    comment: null,
    round: 1,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

export function makeMember(userId: string, overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    id: crypto.randomUUID(),
    team_id: 'team-test-001',
    user_id: userId,
    role: 'member',
    weight: 1,
    nickname: null,
    joined_at: new Date().toISOString(),
    ...overrides,
  }
}
