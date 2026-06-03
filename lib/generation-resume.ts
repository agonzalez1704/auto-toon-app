import { AppState, type AppStateStatus } from 'react-native'
import { useEffect, useRef } from 'react'
import { useGenerationTracker } from '@/stores/use-generation-tracker'
import { getVideoGenerationStatus } from '@/lib/api'

/**
 * AppState-driven resume loop for backgrounded generations.
 *
 * Mounted once at the root layout. When the app comes back to the
 * foreground we poll the status of every job in the tracker registry.
 * Any job whose status is now terminal gets dispatched through its
 * per-origin completion handler (set when each screen mounts) and is
 * removed from the registry.
 *
 * Per job we poll at most a handful of times back-to-back; if the job
 * is still 'processing' the next foreground tick will pick it up. We
 * never set up a long-running background timer — iOS would kill it.
 */

const POLL_LIMIT = 8
const POLL_INTERVAL_MS = 3_000

async function pollJob(jobId: string): Promise<boolean> {
  for (let attempt = 0; attempt < POLL_LIMIT; attempt++) {
    try {
      const res = await getVideoGenerationStatus(jobId)
      if (res.status === 'completed') {
        useGenerationTracker.getState().completeJob(jobId, {
          status: 'completed',
          videoUrl: res.videoUrl ?? undefined,
          lastFrameUrl: res.lastFrameUrl ?? undefined,
          provider: res.provider ?? undefined,
          duration: res.duration ?? undefined,
          aspectRatio: res.aspectRatio ?? undefined,
        })
        return true
      }
      if (res.status === 'failed') {
        useGenerationTracker.getState().completeJob(jobId, {
          status: 'failed',
          errorMessage: res.errorMessage ?? 'Generation failed',
        })
        return true
      }
    } catch (err) {
      // Network or 404 — back off and let the next foreground tick retry.
      console.warn(`[generation-resume] poll failed for ${jobId}:`, err)
      return false
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
  }
  return false
}

async function resumeAllJobs() {
  const jobs = useGenerationTracker.getState().getActiveJobs()
  if (!jobs.length) return
  console.log(`[generation-resume] checking ${jobs.length} in-flight job(s)`)
  await Promise.all(jobs.map((j) => pollJob(j.id)))
}

export function useGenerationResume() {
  const lastState = useRef<AppStateStatus>(AppState.currentState)

  useEffect(() => {
    // Resume on mount too — covers cold-start after iOS killed the app while
    // generation was running.
    resumeAllJobs()

    const sub = AppState.addEventListener('change', (next) => {
      const prev = lastState.current
      lastState.current = next
      if ((prev === 'background' || prev === 'inactive') && next === 'active') {
        resumeAllJobs()
      }
    })
    return () => sub.remove()
  }, [])
}
