/**
 * Vote Engine — Unit Tests
 *
 * Tests the pure calculation functions in src/lib/vote-engine.ts.
 * These are synchronous and require no database or network.
 */

import { describe, it, expect } from 'vitest'
import {
  calculateVotingResults,
  isVotingEnded,
  isVotingStarted,
  hasUserVoted,
} from './vote-engine'
import type { Option, Vote, TeamMember } from '@/types/database'

// ─── Fixtures ─────────────────────────────────────────────────────────────

function makeOption(id: string, content: string, orderIndex = 0): Option {
  return { id, content, order_index: orderIndex, decision_id: '', description: null, created_at: '' }
}

function makeVote(
  id: string,
  userId: string,
  optionId: string,
  round = 1,
  createdAt = ''
): Vote {
  return { id, decision_id: '', option_id: optionId, user_id: userId, weight: 1, comment: null, round, created_at: createdAt }
}

function makeMember(userId: string, weight = 1, role: TeamMember['role'] = 'member'): TeamMember {
  return { id: '', team_id: '', user_id: userId, role, weight, nickname: null, joined_at: '' }
}

// ─── calculateVotingResults — Simple Majority ──────────────────────────────

describe('calculateVotingResults — simple', () => {
  it('returns 0% turnout when no one votes', () => {
    const result = calculateVotingResults(
      [makeOption('a', '选项A'), makeOption('b', '选项B')],
      [],
      [makeMember('u1'), makeMember('u2'), makeMember('u3')],
      'simple'
    )
    expect(result.turnout_rate).toBe(0)
    expect(result.passed).toBe(false)
    expect(result.total_voted).toBe(0)
  })

  it('awards 100% to the only voted option', () => {
    const opts = [makeOption('a', 'A'), makeOption('b', 'B')]
    const votes = [makeVote('v1', 'u1', 'a')]
    const members = [makeMember('u1'), makeMember('u2'), makeMember('u3')]
    const result = calculateVotingResults(opts, votes, members, 'simple')

    const optA = result.results.find((r) => r.option_id === 'a')!
    expect(optA.percentage).toBe(100)
    expect(optA.voter_count).toBe(1)
    expect(result.winning_option?.option_id).toBe('a')
    expect(result.passed).toBe(true) // 100% >= 50 threshold
  })

  it('splits vote 50/50 between two equally-voted options', () => {
    const opts = [makeOption('a', 'A'), makeOption('b', 'B')]
    const votes = [makeVote('v1', 'u1', 'a'), makeVote('v2', 'u2', 'b')]
    const members = [makeMember('u1'), makeMember('u2'), makeMember('u3')]
    const result = calculateVotingResults(opts, votes, members, 'simple')

    expect(result.results[0].percentage).toBe(50)
    expect(result.results[1].percentage).toBe(50)
    expect(result.passed).toBe(true) // 50% >= 50 threshold (≥ not >)
  })

  it('fails when winning option is below threshold', () => {
    const opts = [makeOption('a', 'A'), makeOption('b', 'B'), makeOption('c', 'C')]
    const votes = [
      makeVote('v1', 'u1', 'a'),
      makeVote('v2', 'u2', 'b'),
      makeVote('v3', 'u3', 'c'),
    ]
    const members = [makeMember('u1'), makeMember('u2'), makeMember('u3'), makeMember('u4')]
    // Each gets 1/3 = 33.3%
    const result = calculateVotingResults(opts, votes, members, 'simple', 50)

    expect(result.passed).toBe(false)
    expect(result.winning_option?.percentage).toBeCloseTo(33.33, 1)
  })

  it('respects custom passThreshold', () => {
    const opts = [makeOption('a', 'A'), makeOption('b', 'B')]
    const votes = [makeVote('v1', 'u1', 'a'), makeVote('v2', 'u2', 'a')]
    const members = [makeMember('u1'), makeMember('u2'), makeMember('u3'), makeMember('u4')]
    // 2/4 = 50%, passes with threshold=50
    const result = calculateVotingResults(opts, votes, members, 'simple', 50)
    expect(result.passed).toBe(true)
  })

  it('ignores votes for non-existent options', () => {
    const opts = [makeOption('a', 'A')]
    const votes = [makeVote('v1', 'u1', 'ghost-option-id')]
    const members = [makeMember('u1')]
    const result = calculateVotingResults(opts, votes, members, 'simple')

    expect(result.total_voted).toBe(0)
    expect(result.passed).toBe(false)
  })

  it('sorts results by score descending', () => {
    const opts = [makeOption('a', 'A'), makeOption('b', 'B'), makeOption('c', 'C')]
    const votes = [
      makeVote('v1', 'u1', 'a'),
      makeVote('v2', 'u2', 'a'),
      makeVote('v3', 'u3', 'b'),
    ]
    const members = [makeMember('u1'), makeMember('u2'), makeMember('u3')]
    const result = calculateVotingResults(opts, votes, members, 'simple')

    expect(result.results[0].option_id).toBe('a')
    expect(result.results[1].option_id).toBe('b')
    expect(result.results[2].option_id).toBe('c')
  })

  it('only counts the latest vote per user when multiple exist', () => {
    // User votes 'a' then 'b' — only 'b' counts
    const opts = [makeOption('a', 'A'), makeOption('b', 'B')]
    const t = '2024-01-01T00:00:00Z'
    const votes = [
      makeVote('v1', 'u1', 'a', 1, t),
      makeVote('v2', 'u1', 'b', 1, '2024-01-01T01:00:00Z'),
    ]
    const members = [makeMember('u1')]
    const result = calculateVotingResults(opts, votes, members, 'simple')

    expect(result.results.find((r) => r.option_id === 'a')!.voter_count).toBe(0)
    expect(result.results.find((r) => r.option_id === 'b')!.voter_count).toBe(1)
  })
})

// ─── calculateVotingResults — Weighted ─────────────────────────────────────

describe('calculateVotingResults — weighted', () => {
  it('uses member weight instead of 1-per-person', () => {
    const opts = [makeOption('a', 'A'), makeOption('b', 'B')]
    const votes = [
      makeVote('v1', 'u1', 'a', 1), // weight 3
      makeVote('v2', 'u2', 'b', 1), // weight 1
    ]
    const members = [
      makeMember('u1', 3), // heavy voter
      makeMember('u2', 1),
    ]
    const result = calculateVotingResults(opts, votes, members, 'weighted')

    // a: 3 pts, b: 1 pt → a = 75%, b = 25%
    expect(result.results.find((r) => r.option_id === 'a')!.percentage).toBeCloseTo(75, 1)
    expect(result.results.find((r) => r.option_id === 'b')!.percentage).toBeCloseTo(25, 1)
    expect(result.winning_option?.option_id).toBe('a')
  })

  it('defaults missing weights to 1', () => {
    const opts = [makeOption('a', 'A')]
    const members = [{ ...makeMember('u1'), weight: 0 }] // invalid weight in DB
    const result = calculateVotingResults(opts, [], members, 'weighted')
    expect(result.total_eligible).toBe(1)
  })
})

// ─── calculateVotingResults — Two-Round ────────────────────────────────────

describe('calculateVotingResults — two_round', () => {
  it('round 1: passes only when winner >= threshold', () => {
    const opts = [makeOption('a', 'A'), makeOption('b', 'B')]
    const votes = [makeVote('v1', 'u1', 'a'), makeVote('v2', 'u2', 'a')] // 2/2 = 100%
    const members = [makeMember('u1'), makeMember('u2')]
    const result = calculateVotingResults(opts, votes, members, 'two_round', 50, 1)
    expect(result.passed).toBe(true)
    expect(result.round).toBe(1)
  })

  it('round 1: does NOT pass when winner < threshold (advances to round 2)', () => {
    const opts = [makeOption('a', 'A'), makeOption('b', 'B')]
    const votes = [makeVote('v1', 'u1', 'a'), makeVote('v2', 'u2', 'b')] // 50/50
    const members = [makeMember('u1'), makeMember('u2')]
    const result = calculateVotingResults(opts, votes, members, 'two_round', 50, 1)
    expect(result.passed).toBe(false) // 50% is not > 50%
  })

  it('round 2: passes with simple majority above threshold', () => {
    const opts = [makeOption('a', 'A'), makeOption('b', 'B')]
    const votes = [makeVote('v1', 'u1', 'a', 2)]
    const members = [makeMember('u1'), makeMember('u2')]
    const result = calculateVotingResults(opts, votes, members, 'two_round', 50, 2)
    expect(result.passed).toBe(true)
    expect(result.round).toBe(2)
  })

  it('filters votes by round number', () => {
    const opts = [makeOption('a', 'A'), makeOption('b', 'B')]
    const votes = [
      makeVote('v1', 'u1', 'a', 1), // round 1
      makeVote('v2', 'u2', 'b', 2), // round 2
    ]
    const members = [makeMember('u1'), makeMember('u2')]
    // Querying round 1 should only count v1
    const round1 = calculateVotingResults(opts, votes, members, 'two_round', 50, 1)
    expect(round1.total_voted).toBe(1)
    expect(round1.winning_option?.option_id).toBe('a')

    // Querying round 2 should only count v2
    const round2 = calculateVotingResults(opts, votes, members, 'two_round', 50, 2)
    expect(round2.total_voted).toBe(1)
    expect(round2.winning_option?.option_id).toBe('b')
  })

  it('does not mix round 1 and round 2 votes', () => {
    const opts = [makeOption('a', 'A'), makeOption('b', 'B')]
    const votes = [
      makeVote('v1', 'u1', 'a', 1),
      makeVote('v2', 'u1', 'b', 2), // same user, later round
    ]
    const members = [makeMember('u1')]
    const round1 = calculateVotingResults(opts, votes, members, 'two_round', 50, 1)
    expect(round1.total_voted).toBe(1)
    expect(round1.winning_option?.option_id).toBe('a')
  })
})

// ─── calculateVotingResults — Anonymous ────────────────────────────────────

describe('calculateVotingResults — anonymous', () => {
  it('behaves like simple majority (no identity in results)', () => {
    const opts = [makeOption('a', 'A'), makeOption('b', 'B')]
    const votes = [makeVote('v1', 'u1', 'a'), makeVote('v2', 'u2', 'b'), makeVote('v3', 'u3', 'a')]
    const members = [makeMember('u1'), makeMember('u2'), makeMember('u3')]
    const result = calculateVotingResults(opts, votes, members, 'anonymous')

    expect(result.results.find((r) => r.option_id === 'a')!.voter_count).toBe(2)
    expect(result.results.find((r) => r.option_id === 'b')!.voter_count).toBe(1)
    // Anonymous just means the front-end hides voter identity —
    // the calculation is identical to 'simple'
  })
})

// ─── isVotingEnded / isVotingStarted ────────────────────────────────────────

describe('time helpers', () => {
  const past = '2020-01-01T00:00:00Z'
  const future = '2099-12-31T23:59:59Z'

  it('isVotingEnded returns true when voting_end is in the past', () => {
    expect(isVotingEnded(past)).toBe(true)
  })

  it('isVotingEnded returns false when voting_end is in the future', () => {
    expect(isVotingEnded(future)).toBe(false)
  })

  it('isVotingEnded returns false when voting_end is null', () => {
    expect(isVotingEnded(null)).toBe(false)
  })

  it('isVotingStarted returns true when voting_start is in the past', () => {
    expect(isVotingStarted(past)).toBe(true)
  })

  it('isVotingStarted returns false when voting_start is in the future', () => {
    expect(isVotingStarted(future)).toBe(false)
  })

  it('isVotingStarted defaults to true when voting_start is null', () => {
    expect(isVotingStarted(null)).toBe(true)
  })
})

// ─── hasUserVoted ───────────────────────────────────────────────────────────

describe('hasUserVoted', () => {
  const decisionId = 'decision-001'

  function makeVote2(userId: string, optionId: string, createdAt = '2024-01-01T00:00:00Z') {
    return {
      id: crypto.randomUUID(),
      decision_id: decisionId,
      option_id: optionId,
      user_id: userId,
      weight: 1,
      comment: null,
      round: 1,
      created_at: createdAt,
    } satisfies Vote
  }

  it('returns the latest option_id if user has voted', () => {
    const votes = [
      makeVote2('u1', 'a', '2024-01-01T00:00:00Z'),
      makeVote2('u1', 'b', '2024-01-01T01:00:00Z'), // later
    ]
    expect(hasUserVoted('u1', votes, decisionId)).toBe('b')
  })

  it('returns the option_id if user voted only once', () => {
    const votes = [makeVote2('u1', 'c')]
    expect(hasUserVoted('u1', votes, decisionId)).toBe('c')
  })

  it('returns null if user has not voted', () => {
    const votes = [makeVote2('u2', 'a')]
    expect(hasUserVoted('u1', votes, decisionId)).toBe(null)
  })

  it('filters by decision_id', () => {
    const votes = [
      { ...makeVote2('u1', 'a'), decision_id: 'other-decision' },
    ]
    expect(hasUserVoted('u1', votes, decisionId)).toBe(null)
  })
})
