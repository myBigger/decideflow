'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Option, Vote, TeamMember } from '@/types/database'
import { calculateVotingResults, type VotingStats } from '@/lib/vote-engine'
import type { VoteType } from '@/types/database'

interface UseRealtimeVotesOptions {
  decisionId: string
  options: Option[]
  members: TeamMember[]
  voteType: VoteType
  passThreshold: number
  currentRound?: number
  enabled?: boolean
}

interface UseRealtimeVotesReturn {
  votes: Vote[]
  voteResults: VotingStats
  totalVoters: number
  isConnected: boolean
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

/**
 * useRealtimeVotes — 实时投票订阅 Hook
 *
 * 通过 Supabase Realtime 订阅投票变化，
 * 自动重新计算投票结果并返回
 */
export function useRealtimeVotes({
  decisionId,
  options,
  members,
  voteType,
  passThreshold,
  currentRound = 1,
  enabled = true,
}: UseRealtimeVotesOptions): UseRealtimeVotesReturn {
  const [votes, setVotes] = useState<Vote[]>([])
  const [voteResults, setVoteResults] = useState<VotingStats>({
    total_eligible: members.length,
    total_voted: 0,
    turnout_rate: 0,
    results: [],
    passed: false,
    round: currentRound,
  })
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const supabase = createClient()

  // 计算投票结果
  const recalculateResults = useCallback(
    (currentVotes: Vote[]) => {
      const results = calculateVotingResults(
        options,
        currentVotes,
        members,
        voteType,
        passThreshold,
        currentRound
      )
      setVoteResults(results)
      setVotes(currentVotes)
    },
    [options, members, voteType, passThreshold, currentRound]
  )

  // 初始加载 + 订阅
  useEffect(() => {
    if (!enabled || !decisionId) return

    let channel: RealtimeChannel | null = null
    let isMounted = true

    const init = async () => {
      try {
        // 初始获取投票
        const { data: initialVotes, error: fetchError } = await supabase
          .from('votes')
          .select('*')
          .eq('decision_id', decisionId)
          .eq('round', currentRound)

        if (fetchError) throw fetchError

        if (isMounted) {
          recalculateResults(initialVotes || [])
          setIsLoading(false)
        }

        // 建立 Realtime 订阅
        channel = supabase
          .channel(`votes:${decisionId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'votes',
              filter: `decision_id=eq.${decisionId}`,
            },
            async (payload) => {
              // 获取新投票的完整信息
              const newVote = payload.new as Vote

              // 如果是当前轮次的新投票
              if (newVote.round === currentRound) {
                setVotes(prev => {
                  // 避免重复添加
                  const exists = prev.some(v => v.id === newVote.id)
                  if (exists) return prev
                  const updated = [...prev, newVote]
                  recalculateResults(updated)
                  return updated
                })
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'votes',
              filter: `decision_id=eq.${decisionId}`,
            },
            (payload) => {
              const updatedVote = payload.new as Vote
              setVotes(prev => {
                const updated = prev.map(v =>
                  v.id === updatedVote.id ? updatedVote : v
                )
                recalculateResults(updated)
                return updated
              })
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'votes',
              filter: `decision_id=eq.${decisionId}`,
            },
            (payload) => {
              const deletedVote = payload.old as Vote
              setVotes(prev => {
                const updated = prev.filter(v => v.id !== deletedVote.id)
                recalculateResults(updated)
                return updated
              })
            }
          )
          .subscribe((status) => {
            if (isMounted) {
              setIsConnected(status === 'SUBSCRIBED')
              if (status === 'CHANNEL_ERROR') {
                setError(new Error('实时订阅连接失败'))
              }
            }
          })
      } catch (err) {
        if (isMounted) {
          setError(err as Error)
          setIsLoading(false)
        }
      }
    }

    init()

    return () => {
      isMounted = false
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [decisionId, currentRound, enabled, supabase])

  // 手动刷新
  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('votes')
        .select('*')
        .eq('decision_id', decisionId)
        .eq('round', currentRound)

      if (fetchError) throw fetchError
      recalculateResults(data || [])
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [decisionId, currentRound, recalculateResults, supabase])

  return {
    votes,
    voteResults,
    totalVoters: voteResults.total_voted,
    isConnected,
    isLoading,
    error,
    refresh,
  }
}
