'use client'

import { useState, useCallback } from 'react'
import type { AIInsight } from '@/types/database'

interface UseAIInsightOptions {
  decisionId: string
  initialInsight?: AIInsight | null
}

interface UseAIInsightReturn {
  beforeInsight: AIInsight['before'] | null
  afterInsight: AIInsight['after'] | null
  isGeneratingBefore: boolean
  isGeneratingAfter: boolean
  error: string | null
  generateBefore: () => Promise<void>
  generateAfter: () => Promise<void>
  regenerateBefore: () => Promise<void>
  regenerateAfter: () => Promise<void>
}

/**
 * useAIInsight — AI 洞察管理 Hook
 *
 * 封装 AI 洞察的获取、生成、缓存逻辑
 */
export function useAIInsight({
  decisionId,
  initialInsight,
}: UseAIInsightOptions): UseAIInsightReturn {
  const [beforeInsight, setBeforeInsight] = useState<AIInsight['before'] | null>(
    initialInsight?.before || null
  )
  const [afterInsight, setAfterInsight] = useState<AIInsight['after'] | null>(
    initialInsight?.after || null
  )
  const [isGeneratingBefore, setIsGeneratingBefore] = useState(false)
  const [isGeneratingAfter, setIsGeneratingAfter] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateInsight = useCallback(async (
    type: 'before' | 'after',
    setter: (insight: any) => void,
    setGenerating: (v: boolean) => void
  ) => {
    setError(null)
    setGenerating(true)

    try {
      const res = await fetch('/api/ai/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, decision_id: decisionId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '生成失败')
        return
      }

      if (data.success) {
        setter(data.insight)
      } else {
        setError(data.error || '未知错误')
      }
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setGenerating(false)
    }
  }, [decisionId])

  const generateBefore = useCallback(async () => {
    await generateInsight('before', setBeforeInsight, setIsGeneratingBefore)
  }, [generateInsight])

  const generateAfter = useCallback(async () => {
    await generateInsight('after', setAfterInsight, setIsGeneratingAfter)
  }, [generateInsight])

  const regenerateBefore = useCallback(async () => {
    await generateInsight('before', setBeforeInsight, setIsGeneratingBefore)
  }, [generateInsight])

  const regenerateAfter = useCallback(async () => {
    await generateInsight('after', setAfterInsight, setIsGeneratingAfter)
  }, [generateInsight])

  return {
    beforeInsight,
    afterInsight,
    isGeneratingBefore,
    isGeneratingAfter,
    error,
    generateBefore,
    generateAfter,
    regenerateBefore,
    regenerateAfter,
  }
}
