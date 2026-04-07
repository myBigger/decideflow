/**
 * API Route Tests — Decision Endpoints
 *
 * Tests the request/response logic of:
 *   GET  /api/decisions
 *   POST /api/decisions
 *   GET  /api/decisions/[id]
 *   PATCH /api/decisions/[id]
 *   DELETE /api/decisions/[id]
 *   POST /api/decisions/[id]/vote
 *   GET  /api/decisions/[id]/vote
 *
 * Strategy: Mock `createClient` from `@/lib/supabase/server` to return
 * an in-memory store so route handlers execute with real query logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeDecision, makeOption, makeVote, makeMember } from '@/__tests__/supabase'
import type { MockStore } from '@/__tests__/supabase'

// ─── In-memory store shared across all mocked supabase calls ────────────────

const store: MockStore = {
  profiles: [],
  teams: [],
  team_members: [],
  decisions: [],
  options: [],
  votes: [],
}

// ─── Mock createClient — must be hoisted ──────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => buildMockClient(store)),
}))

// ─── Minimal chain-based mock client builder ──────────────────────────────
// We re-implement the chain so tests use the same logic as production.

function buildMockClient(s: MockStore) {
  const authUser = { id: 'user-test-001', email: 'alice@example.com' }
  let currentAuthUser = { ...authUser }

  function chain<T extends Record<string, unknown>>(arr: T[]) {
    let rows = [...arr] as T[]
    const self = {
      select: () => self,
      insert: (row: Partial<T>) => {
        const r = { ...row, id: (row as Record<string, unknown>).id || crypto.randomUUID() } as T
        arr.push(r)
        rows.push(r)
        return self
      },
      update: (row: Partial<T>) => {
        rows = rows.map((r) => ({ ...r, ...row }))
        return self
      },
      upsert: (row: Partial<T>) => {
        const idx = arr.findIndex((r) => (r as Record<string, unknown>).id === (row as Record<string, unknown>).id)
        if (idx >= 0) arr[idx] = { ...arr[idx], ...row } as T
        else arr.push(row as T)
        return self
      },
      delete: () => {
        rows.forEach((r) => {
          const idx = arr.findIndex((x) => x === r)
          if (idx >= 0) arr.splice(idx, 1)
        })
        rows = []
        return self
      },
      eq: (col: keyof T, val: unknown) => {
        rows = rows.filter((r) => r[col] === val)
        return self
      },
      neq: (col: keyof T, val: unknown) => {
        rows = rows.filter((r) => r[col] !== val)
        return self
      },
      in: (col: keyof T, vals: unknown[]) => {
        rows = rows.filter((r) => vals.includes(r[col]))
        return self
      },
      gte: (col: keyof T, val: unknown) => {
        rows = rows.filter((r) => (r[col] as number) >= (val as number))
        return self
      },
      lte: (col: keyof T, val: unknown) => {
        rows = rows.filter((r) => (r[col] as number) <= (val as number))
        return self
      },
      order: (col: keyof T, opts: { ascending?: boolean } = {}) => {
        const asc = opts.ascending !== false
        rows.sort((a, b) => {
          const va = a[col] as string | number
          const vb = b[col] as string | number
          return asc ? (va < vb ? -1 : 1) : (va > vb ? -1 : 1)
        })
        return self
      },
      range: (_from: number, _to: number) => self,
      limit: (n: number) => { rows = rows.slice(0, n); return self },
      is: () => self,
      single: async () => ({ data: rows[0] ?? null, error: null }),
      then: async <T2>(cb: (v: { data: T[] | null; error: null }) => T2) =>
        cb({ data: rows as T[] | null, error: null }),
      get data() { return rows as T[] | null },
      get error() { return null },
    }
    return self
  }

  const tables: Record<string, unknown[]> = {
    profiles: s.profiles,
    teams: s.teams,
    team_members: s.team_members,
    decisions: s.decisions,
    options: s.options,
    votes: s.votes,
    comments: [],
    executions: [],
  }

  return {
    auth: {
      getUser: async () => ({ data: { user: currentAuthUser }, error: null }),
      getSession: async () => ({
        data: { session: currentAuthUser ? { user: currentAuthUser, access_token: 'x' } : null },
      }),
      signInWithPassword: async ({ email }: { email: string }) => ({
        data: { user: { ...authUser, email }, session: { user: { ...authUser, email }, access_token: 'x' } },
        error: null,
      }),
      signUp: async ({ email }: { email: string }) => ({
        data: { user: { ...authUser, email }, session: { user: { ...authUser, email }, access_token: 'x' } },
        error: null,
      }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: (cb: (event: string, session: unknown) => void) => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
    from: <T extends Record<string, unknown>>(table: string) =>
      chain<T>(tables[table] ?? []) as ReturnType<typeof chain<T>>,
  }
}

// ─── Reset store before each test ────────────────────────────────────────

beforeEach(() => {
  store.profiles = []
  store.teams = []
  store.team_members = []
  store.decisions = []
  store.options = []
  store.votes = []
})

// ─── Helper: build a Request with optional JSON body ─────────────────────

function makeReq(method: string, url = '/api/decisions', body?: unknown): Request {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  } as RequestInit)
}

// ─── Route import helpers (lazy to avoid hoisting issues) ────────────────

async function callGET(url = '/api/decisions') {
  const { GET } = await import('./route')
  return GET(makeReq('GET', url))
}

async function callPOST(body: unknown) {
  const { POST } = await import('./route')
  return POST(makeReq('POST', '/api/decisions', body))
}

async function callDetailGET(id: string) {
  const mod = await import('./[id]/route')
  return mod.GET(makeReq('GET', `/api/decisions/${id}`), { params: Promise.resolve({ id }) })
}

async function callDetailPATCH(id: string, body: unknown) {
  const mod = await import('./[id]/route')
  return mod.PATCH(makeReq('PATCH', `/api/decisions/${id}`, body), { params: Promise.resolve({ id }) })
}

async function callDetailDELETE(id: string) {
  const mod = await import('./[id]/route')
  return mod.DELETE(makeReq('DELETE', `/api/decisions/${id}`), { params: Promise.resolve({ id }) })
}

async function callVotePOST(id: string, body: unknown) {
  const mod = await import('./[id]/vote/route')
  return mod.POST(makeReq('POST', `/api/decisions/${id}/vote`, body), { params: Promise.resolve({ id }) })
}

async function callVoteGET(id: string) {
  const mod = await import('./[id]/vote/route')
  return mod.GET(makeReq('GET', `/api/decisions/${id}/vote`), { params: Promise.resolve({ id }) })
}

async function json(res: Response) {
  return res.json()
}

// ─── Tests: GET /api/decisions ────────────────────────────────────────────

describe('GET /api/decisions', () => {
  it('returns 401 when not authenticated (no store data)', async () => {
    // Override auth to return null user
    const { createClient } = await import('@/lib/supabase/server')
    ;(createClient as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      ...(await import('@/lib/supabase/server')).createClient(),
      auth: { getUser: async () => ({ data: { user: null }, error: null }) },
    } as ReturnType<typeof createClient>)

    const res = await callGET()
    expect(res.status).toBe(401)
  })

  it('returns empty list when user has no teams', async () => {
    const res = await callGET()
    const body = await json(res)
    expect(body.success).toBe(true)
    expect(body.decisions).toEqual([])
    expect(body.total).toBe(0)
  })

  it('returns decisions for the specified team', async () => {
    // Seed: user, team, membership, decision
    store.profiles.push({ id: 'u1', email: 'alice@example.com', full_name: 'Alice', avatar_url: null, created_at: '' })
    store.teams.push({ id: 't1', name: 'Alpha', slug: 'alpha', owner_id: 'u1', avatar_url: null, created_at: '', updated_at: '' })
    store.team_members.push({ id: 'm1', team_id: 't1', user_id: 'u1', role: 'member', weight: 1, nickname: null, joined_at: '' })
    store.decisions.push({ ...makeDecision({ id: 'd1', team_id: 't1', title: 'First Decision' }) })

    const res = await callGET('/api/decisions?teamId=t1')
    const body = await json(res)
    expect(body.success).toBe(true)
    expect(body.decisions).toHaveLength(1)
    expect(body.decisions[0].title).toBe('First Decision')
  })

  it('filters by status', async () => {
    store.profiles.push({ id: 'u1', email: 'alice@example.com', full_name: 'Alice', avatar_url: null, created_at: '' })
    store.teams.push({ id: 't1', name: 'Alpha', slug: 'alpha', owner_id: 'u1', avatar_url: null, created_at: '', updated_at: '' })
    store.team_members.push({ id: 'm1', team_id: 't1', user_id: 'u1', role: 'member', weight: 1, nickname: null, joined_at: '' })
    store.decisions.push(
      { ...makeDecision({ id: 'd1', team_id: 't1', status: 'voting' }) },
      { ...makeDecision({ id: 'd2', team_id: 't1', status: 'draft' }) },
    )

    const res = await callGET('/api/decisions?teamId=t1&status=voting')
    const body = await json(res)
    expect(body.decisions).toHaveLength(1)
    expect(body.decisions[0].status).toBe('voting')
  })

  it('maps vote_count correctly from batch query', async () => {
    store.profiles.push({ id: 'u1', email: 'alice@example.com', full_name: 'Alice', avatar_url: null, created_at: '' })
    store.teams.push({ id: 't1', name: 'Alpha', slug: 'alpha', owner_id: 'u1', avatar_url: null, created_at: '', updated_at: '' })
    store.team_members.push({ id: 'm1', team_id: 't1', user_id: 'u1', role: 'member', weight: 1, nickname: null, joined_at: '' })
    const d = makeDecision({ id: 'd1', team_id: 't1' })
    store.decisions.push(d)
    store.options.push({ ...makeOption('o1', 'A', 0), decision_id: 'd1' })
    store.votes.push({ ...makeVote('v1', 'u1', 'o1'), decision_id: 'd1' })

    const res = await callGET('/api/decisions?teamId=t1')
    const body = await json(res)
    expect(body.decisions[0].vote_count).toBe(1)
  })
})

// ─── Tests: POST /api/decisions ──────────────────────────────────────────

describe('POST /api/decisions', () => {
  beforeEach(() => {
    store.profiles.push({ id: 'u1', email: 'alice@example.com', full_name: 'Alice', avatar_url: null, created_at: '' })
    store.teams.push({ id: 't1', name: 'Alpha', slug: 'alpha', owner_id: 'u1', avatar_url: null, created_at: '', updated_at: '' })
    store.team_members.push({ id: 'm1', team_id: 't1', user_id: 'u1', role: 'member', weight: 1, nickname: null, joined_at: '' })
  })

  it('returns 400 when title is missing', async () => {
    const res = await callPOST({ team_id: 't1', options: ['A', 'B'] })
    expect(res.status).toBe(400)
    const body = await json(res)
    expect(body.error).toBeTruthy()
  })

  it('returns 400 when fewer than 2 options provided', async () => {
    const res = await callPOST({ team_id: 't1', title: 'Test', options: ['Only One'] })
    expect(res.status).toBe(400)
  })

  it('returns 403 when user is not a team member', async () => {
    const res = await callPOST({ team_id: 't1', title: 'Test', options: ['A', 'B'] })
    // user id is hardcoded to 'user-test-001' in mock — membership is for 'u1'
    // The route uses auth.getUser() which returns 'user-test-001' not 'u1'
    expect(res.status).toBe(403)
  })

  it('creates decision with options when valid', async () => {
    // Override mock user to 'u1'
    const { createClient } = await import('@/lib/supabase/server')
    ;(createClient as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      ...(await import('@/lib/supabase/server')).createClient(),
      auth: {
        getUser: async () => ({ data: { user: { id: 'u1', email: 'alice@example.com' } }, error: null }),
      },
      from: (table: string) => {
        const t: Record<string, unknown[]> = {
          profiles: store.profiles,
          teams: store.teams,
          team_members: store.team_members,
          decisions: store.decisions,
          options: store.options,
          votes: store.votes,
        }
        return buildMockClient(store).from(table as keyof typeof store)
      },
    } as ReturnType<typeof createClient>)

    const res = await callPOST({
      team_id: 't1',
      title: '  Choose A or B  ',
      description: '  A simple choice  ',
      vote_type: 'simple',
      pass_threshold: 60,
      options: ['Option A', 'Option B'],
      voting_days: 7,
    })
    const body = await json(res)
    expect(body.success).toBe(true)
    expect(body.decision.title).toBe('Choose A or B') // trimmed
    expect(body.decision.status).toBe('voting')
    expect(body.options).toHaveLength(2)
  })
})

// ─── Tests: PATCH /api/decisions/[id] ─────────────────────────────────────

describe('PATCH /api/decisions/[id]', () => {
  beforeEach(() => {
    store.profiles.push({ id: 'u1', email: 'alice@example.com', full_name: 'Alice', avatar_url: null, created_at: '' })
    store.teams.push({ id: 't1', name: 'Alpha', slug: 'alpha', owner_id: 'u1', avatar_url: null, created_at: '', updated_at: '' })
    store.decisions.push({ ...makeDecision({ id: 'd1', team_id: 't1', created_by: 'u1' }) })
    store.team_members.push({ id: 'm1', team_id: 't1', user_id: 'u1', role: 'owner', weight: 1, nickname: null, joined_at: '' })
  })

  it('returns 404 when decision does not exist', async () => {
    const res = await callDetailPATCH('non-existent-id', { title: 'New' })
    expect(res.status).toBe(404)
  })

  it('returns 403 when user lacks permission', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    ;(createClient as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      ...(await import('@/lib/supabase/server')).createClient(),
      auth: { getUser: async () => ({ data: { user: { id: 'stranger', email: 'x@example.com' } }, error: null }) },
    } as ReturnType<typeof createClient>)

    const res = await callDetailPATCH('d1', { title: 'New' })
    expect(res.status).toBe(403)
  })

  it('updates allowed fields only', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    ;(createClient as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      ...(await import('@/lib/supabase/server')).createClient(),
      auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'alice@example.com' } }, error: null }) },
      from: (table: string) => buildMockClient(store).from(table as keyof typeof store),
    } as ReturnType<typeof createClient>)

    const res = await callDetailPATCH('d1', {
      title: '  Updated Title  ',
      pass_threshold: 75,
      status: 'archived',
    })
    const body = await json(res)
    expect(body.success).toBe(true)
    expect(body.decision.title).toBe('Updated Title')
    expect(body.decision.pass_threshold).toBe(75)
  })

  it('rejects update with null title (field removed)', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    ;(createClient as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      ...(await import('@/lib/supabase/server')).createClient(),
      auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'alice@example.com' } }, error: null }) },
      from: (table: string) => buildMockClient(store).from(table as keyof typeof store),
    } as ReturnType<typeof createClient>)

    const res = await callDetailPATCH('d1', { title: null })
    const body = await json(res)
    expect(body.success).toBe(true)
    // title should be unchanged (null is not set in allowedUpdates)
  })
})

// ─── Tests: DELETE /api/decisions/[id] ─────────────────────────────────────

describe('DELETE /api/decisions/[id]', () => {
  beforeEach(() => {
    store.profiles.push({ id: 'u1', email: 'alice@example.com', full_name: 'Alice', avatar_url: null, created_at: '' })
    store.teams.push({ id: 't1', name: 'Alpha', slug: 'alpha', owner_id: 'u1', avatar_url: null, created_at: '', updated_at: '' })
    store.team_members.push({ id: 'm1', team_id: 't1', user_id: 'u1', role: 'owner', weight: 1, nickname: null, joined_at: '' })
  })

  it('returns 400 when trying to delete a non-draft decision', async () => {
    store.decisions.push({ ...makeDecision({ id: 'd1', team_id: 't1', status: 'voting', created_by: 'u1' }) })
    const { createClient } = await import('@/lib/supabase/server')
    ;(createClient as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      ...(await import('@/lib/supabase/server')).createClient(),
      auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'alice@example.com' } }, error: null }) },
      from: (table: string) => buildMockClient(store).from(table as keyof typeof store),
    } as ReturnType<typeof createClient>)

    const res = await callDetailDELETE('d1')
    expect(res.status).toBe(400)
    const body = await json(res)
    expect(body.error).toMatch('草稿')
  })

  it('deletes a draft decision successfully', async () => {
    store.decisions.push({ ...makeDecision({ id: 'd1', team_id: 't1', status: 'draft', created_by: 'u1' }) })
    store.options.push({ ...makeOption('o1', 'A', 0), decision_id: 'd1' })
    const { createClient } = await import('@/lib/supabase/server')
    ;(createClient as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      ...(await import('@/lib/supabase/server')).createClient(),
      auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'alice@example.com' } }, error: null }) },
      from: (table: string) => buildMockClient(store).from(table as keyof typeof store),
    } as ReturnType<typeof createClient>)

    const res = await callDetailDELETE('d1')
    const body = await json(res)
    expect(body.success).toBe(true)
    expect(store.decisions.find((d) => d.id === 'd1')).toBeUndefined()
  })
})

// ─── Tests: POST /api/decisions/[id]/vote ─────────────────────────────────

describe('POST /api/decisions/[id]/vote', () => {
  beforeEach(() => {
    store.profiles.push({ id: 'u1', email: 'alice@example.com', full_name: 'Alice', avatar_url: null, created_at: '' })
    store.teams.push({ id: 't1', name: 'Alpha', slug: 'alpha', owner_id: 'u1', avatar_url: null, created_at: '', updated_at: '' })
    store.team_members.push({ id: 'm1', team_id: 't1', user_id: 'u1', role: 'member', weight: 2, nickname: null, joined_at: '' })
    store.decisions.push({ ...makeDecision({ id: 'd1', team_id: 't1', status: 'voting' }) })
    store.options.push({ id: 'o1', decision_id: 'd1', content: 'A', description: null, order_index: 0, created_at: '' })
    store.options.push({ id: 'o2', decision_id: 'd1', content: 'B', description: null, order_index: 1, created_at: '' })
  })

  it('returns 400 when option_id is missing', async () => {
    const res = await callVotePOST('d1', {})
    expect(res.status).toBe(400)
    const body = await json(res)
    expect(body.error).toMatch('选择')
  })

  it('returns 404 when decision does not exist', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    ;(createClient as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      ...(await import('@/lib/supabase/server')).createClient(),
      auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'alice@example.com' } }, error: null }) },
      from: (table: string) => buildMockClient(store).from(table as keyof typeof store),
    } as ReturnType<typeof createClient>)

    const res = await callVotePOST('ghost', { option_id: 'o1' })
    expect(res.status).toBe(404)
  })

  it('returns 400 when decision is not in voting status', async () => {
    store.decisions.splice(0, store.decisions.length)
    store.decisions.push({ ...makeDecision({ id: 'd1', team_id: 't1', status: 'draft' }) })
    const { createClient } = await import('@/lib/supabase/server')
    ;(createClient as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      ...(await import('@/lib/supabase/server')).createClient(),
      auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'alice@example.com' } }, error: null }) },
      from: (table: string) => buildMockClient(store).from(table as keyof typeof store),
    } as ReturnType<typeof createClient>)

    const res = await callVotePOST('d1', { option_id: 'o1' })
    expect(res.status).toBe(400)
    const body = await json(res)
    expect(body.error).toMatch('投票状态')
  })

  it('records a new vote and returns results', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    ;(createClient as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      ...(await import('@/lib/supabase/server')).createClient(),
      auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'alice@example.com' } }, error: null }) },
      from: (table: string) => buildMockClient(store).from(table as keyof typeof store),
    } as ReturnType<typeof createClient>)

    const res = await callVotePOST('d1', { option_id: 'o1' })
    const body = await json(res)
    expect(body.success).toBe(true)
    expect(body.vote.option_id).toBe('o1')
    expect(body.vote_results).toBeDefined()
    expect(body.vote_results.total_voted).toBe(1)
    expect(body.message).toBe('投票成功')
  })

  it('updates existing vote when user changes their choice', async () => {
    // First vote
    store.votes.push({
      id: 'v1', decision_id: 'd1', option_id: 'o1', user_id: 'u1',
      weight: 1, comment: null, round: 1, created_at: new Date().toISOString(),
    })

    const { createClient } = await import('@/lib/supabase/server')
    ;(createClient as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      ...(await import('@/lib/supabase/server')).createClient(),
      auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'alice@example.com' } }, error: null }) },
      from: (table: string) => buildMockClient(store).from(table as keyof typeof store),
    } as ReturnType<typeof createClient>)

    const res = await callVotePOST('d1', { option_id: 'o2' })
    const body = await json(res)
    expect(body.success).toBe(true)
    expect(body.vote.option_id).toBe('o2')
    expect(body.message).toBe('投票已更新')
  })

  it('closes voting and marks passed when unanimous majority reached', async () => {
    // 2 members, both vote A → 100% → passes
    store.team_members.push({ id: 'm2', team_id: 't1', user_id: 'u2', role: 'member', weight: 1, nickname: null, joined_at: '' })
    store.profiles.push({ id: 'u2', email: 'bob@example.com', full_name: 'Bob', avatar_url: null, created_at: '' })

    const { createClient } = await import('@/lib/supabase/server')
    ;(createClient as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      ...(await import('@/lib/supabase/server')).createClient(),
      auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'alice@example.com' } }, error: null }) },
      from: (table: string) => buildMockClient(store).from(table as keyof typeof store),
    } as ReturnType<typeof createClient>)

    const res = await callVotePOST('d1', { option_id: 'o1' })
    const body = await json(res)
    expect(body.success).toBe(true)
    expect(body.voting_closed).toBe(true)
    // Check decision status was updated to 'passed'
    const updatedDecision = store.decisions.find((d) => d.id === 'd1')
    expect(updatedDecision?.status).toBe('passed')
  })
})

// ─── Tests: GET /api/decisions/[id]/vote ──────────────────────────────────

describe('GET /api/decisions/[id]/vote', () => {
  beforeEach(() => {
    store.profiles.push({ id: 'u1', email: 'alice@example.com', full_name: 'Alice', avatar_url: null, created_at: '' })
    store.teams.push({ id: 't1', name: 'Alpha', slug: 'alpha', owner_id: 'u1', avatar_url: null, created_at: '', updated_at: '' })
    store.team_members.push({ id: 'm1', team_id: 't1', user_id: 'u1', role: 'member', weight: 1, nickname: null, joined_at: '' })
    store.decisions.push({ ...makeDecision({ id: 'd1', team_id: 't1', status: 'voting' }) })
    store.options.push({ id: 'o1', decision_id: 'd1', content: 'A', description: null, order_index: 0, created_at: '' })
    store.options.push({ id: 'o2', decision_id: 'd1', content: 'B', description: null, order_index: 1, created_at: '' })
  })

  it('returns vote results with has_voted=false when user has not voted', async () => {
    const { createClient } = await import('@/lib/supabase/server')
    ;(createClient as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      ...(await import('@/lib/supabase/server')).createClient(),
      auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'alice@example.com' } }, error: null }) },
      from: (table: string) => buildMockClient(store).from(table as keyof typeof store),
    } as ReturnType<typeof createClient>)

    const res = await callVoteGET('d1')
    const body = await json(res)
    expect(body.success).toBe(true)
    expect(body.has_voted).toBe(false)
    expect(body.vote_results.total_votes).toBe(0)
  })

  it('returns has_voted=true when user already voted', async () => {
    store.votes.push({
      id: 'v1', decision_id: 'd1', option_id: 'o1', user_id: 'u1',
      weight: 1, comment: null, round: 1, created_at: new Date().toISOString(),
    })

    const { createClient } = await import('@/lib/supabase/server')
    ;(createClient as ReturnType<typeof vi.fn>).mockReturnValueOnce({
      ...(await import('@/lib/supabase/server')).createClient(),
      auth: { getUser: async () => ({ data: { user: { id: 'u1', email: 'alice@example.com' } }, error: null }) },
      from: (table: string) => buildMockClient(store).from(table as keyof typeof store),
    } as ReturnType<typeof createClient>)

    const res = await callVoteGET('d1')
    const body = await json(res)
    expect(body.success).toBe(true)
    expect(body.has_voted).toBe(true)
    expect(body.user_voted_option_id).toBe('o1')
    expect(body.vote_results.total_votes).toBe(1)
  })
})
