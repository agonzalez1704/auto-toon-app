import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Centralized registry of in-flight generations.
 *
 * Every SSE-driven flow registers its job here when the backend emits
 * `job_started` (carrying the persisted DB row id). The job stays in the
 * registry until either the SSE stream returns `success` / `error`, OR the
 * AppState resume hook polls the status endpoint and observes a terminal
 * state. This is what lets the app survive backgrounding mid-generation:
 *
 *   1. Client opens SSE, backend creates videoGeneration row, emits id
 *   2. Client registers { id, kind, origin } in the tracker
 *   3. User backgrounds the app; iOS kills the SSE socket
 *   4. Backend keeps running; eventually completes + fires push notification
 *   5. User foregrounds the app; AppState 'active' handler polls each
 *      tracked job's status endpoint
 *   6. On terminal status, tracker un-registers and dispatches the result
 *      via the registered onComplete handler (set per-flow at mount time)
 *
 * Persisted to AsyncStorage so a hard kill + cold-start still recovers.
 * onComplete handlers are NOT persisted (functions don't serialize); they
 * re-register on screen mount.
 */

export type GenerationKind = 'video' | 'image'

export interface InFlightJob {
  /** The DB row id (videoGeneration.id today; could be generation.id later). */
  id: string
  kind: GenerationKind
  /** Free-form origin tag — e.g. 'commercial', 'video-generator'. */
  origin: string
  /** Epoch ms when the job was first registered. */
  startedAt: number
  /** Optional pre-emptive result preview (e.g. storyboard URL for commercial). */
  preview?: string
  /** Optional human-readable label for the in-flight banner. */
  label?: string
}

export interface JobResult {
  status: 'completed' | 'failed'
  videoUrl?: string
  lastFrameUrl?: string
  errorMessage?: string
  provider?: string
  duration?: number
  aspectRatio?: string
}

type OnCompleteHandler = (jobId: string, result: JobResult) => void

interface GenerationTrackerState {
  jobs: Record<string, InFlightJob>
  /** Non-persisted runtime registry of result handlers, keyed by origin. */
  handlers: Record<string, OnCompleteHandler>

  registerJob: (job: InFlightJob) => void
  updateJob: (id: string, patch: Partial<InFlightJob>) => void
  completeJob: (id: string, result: JobResult) => void
  removeJob: (id: string) => void

  registerHandler: (origin: string, handler: OnCompleteHandler) => void
  unregisterHandler: (origin: string) => void

  getActiveJobs: () => InFlightJob[]
}

export const useGenerationTracker = create<GenerationTrackerState>()(
  persist(
    (set, get) => ({
      jobs: {},
      handlers: {},

      registerJob: (job) =>
        set((state) => ({ jobs: { ...state.jobs, [job.id]: job } })),

      updateJob: (id, patch) =>
        set((state) => {
          const existing = state.jobs[id]
          if (!existing) return state
          return { jobs: { ...state.jobs, [id]: { ...existing, ...patch } } }
        }),

      completeJob: (id, result) => {
        const job = get().jobs[id]
        if (!job) return
        const handler = get().handlers[job.origin]
        if (handler) handler(id, result)
        set((state) => {
          const next = { ...state.jobs }
          delete next[id]
          return { jobs: next }
        })
      },

      removeJob: (id) =>
        set((state) => {
          const next = { ...state.jobs }
          delete next[id]
          return { jobs: next }
        }),

      registerHandler: (origin, handler) =>
        set((state) => ({ handlers: { ...state.handlers, [origin]: handler } })),

      unregisterHandler: (origin) =>
        set((state) => {
          const next = { ...state.handlers }
          delete next[origin]
          return { handlers: next }
        }),

      getActiveJobs: () => Object.values(get().jobs),
    }),
    {
      name: 'generation-tracker-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ jobs: state.jobs }),
    },
  ),
)
