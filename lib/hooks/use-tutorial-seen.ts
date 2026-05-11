import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useState } from 'react'

/**
 * First-visit tutorial gate. Returns `{ seen, dismiss }`.
 * When `seen === false`, the calling screen should render its tutorial sheet.
 */
export function useTutorialSeen(storageKey: string) {
  const [seen, setSeen] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    AsyncStorage.getItem(storageKey)
      .then((v) => { if (!cancelled) setSeen(v === '1') })
      .catch(() => { if (!cancelled) setSeen(true) })
    return () => { cancelled = true }
  }, [storageKey])

  const dismiss = async () => {
    setSeen(true)
    try { await AsyncStorage.setItem(storageKey, '1') } catch {}
  }

  return { seen: seen ?? true, loading: seen === null, dismiss }
}
