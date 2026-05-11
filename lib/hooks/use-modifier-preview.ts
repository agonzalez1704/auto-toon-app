import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCallback, useEffect, useState } from 'react'
import { previewModifier, type PreviewModifierRequest } from '@/lib/api'

export type ModifierKind = 'lighting' | 'surface' | 'shotType'

export interface CanvasSubject {
  subjectImageUrl?: string
  footwearImageUrl?: string
}

function shortHash(input: string): string {
  let hash = 5381
  for (let i = 0; i < input.length; i++) hash = ((hash << 5) + hash) ^ input.charCodeAt(i)
  return (hash >>> 0).toString(36).slice(0, 8)
}

const cacheKey = (kind: ModifierKind, value: string, subject?: string, footwear?: string) => {
  const parts = [`fe-preview-${kind}-${value}`]
  if (subject) parts.push(`s${shortHash(subject)}`)
  if (footwear) parts.push(`f${shortHash(footwear)}`)
  return parts.join('-')
}

/**
 * AsyncStorage-backed cache for AI-generated modifier previews.
 * Mirrors web `useModifierPreview` but persists to AsyncStorage.
 */
export function useModifierPreview(
  kind: ModifierKind,
  value: string | undefined,
  presetPrompt: string | undefined,
  subject?: CanvasSubject,
) {
  const subjectImageUrl = subject?.subjectImageUrl
  const footwearImageUrl = subject?.footwearImageUrl

  const [url, setUrl] = useState<string | undefined>(undefined)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    if (!value) { setUrl(undefined); return }
    AsyncStorage.getItem(cacheKey(kind, value, subjectImageUrl, footwearImageUrl))
      .then((cached) => {
        if (!cancelled) {
          setUrl(cached || undefined)
          setError(undefined)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [kind, value, subjectImageUrl, footwearImageUrl])

  const generate = useCallback(async () => {
    if (!value || !presetPrompt) return
    setGenerating(true)
    setError(undefined)
    try {
      const req: PreviewModifierRequest = { kind, value, prompt: presetPrompt, subjectImageUrl, footwearImageUrl }
      const { imageUrl } = await previewModifier(req)
      await AsyncStorage.setItem(cacheKey(kind, value, subjectImageUrl, footwearImageUrl), imageUrl)
      setUrl(imageUrl)
    } catch (err: any) {
      setError(err?.message || String(err))
    } finally {
      setGenerating(false)
    }
  }, [kind, value, presetPrompt, subjectImageUrl, footwearImageUrl])

  const clear = useCallback(async () => {
    if (!value) return
    await AsyncStorage.removeItem(cacheKey(kind, value, subjectImageUrl, footwearImageUrl))
    setUrl(undefined)
  }, [kind, value, subjectImageUrl, footwearImageUrl])

  return { url, generating, error, generate, clear }
}
