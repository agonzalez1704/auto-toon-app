# Background generation awareness — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make users aware that long-running generations are still in flight after they dismiss the loading screen, both inside the app (global banner) and outside (push notification on completion).

**Architecture:** Add a client-side zustand registry of in-flight jobs plus a globally-mounted banner. Wrap every long-flow API call with a `runWithJob` helper that maintains the registry. Wire all long-running backend routes to fire existing `notifyGenerationComplete` / `notifyGenerationFailed` push helpers, extended with a `returnTo` deep-link payload. Tap-handlers in the root layout deep-link to the originating flow or the image viewer.

**Tech Stack:** React Native / Expo Router (mobile), zustand + AsyncStorage persistence, expo-notifications, Next.js App Router (backend), existing `lib/push-notifications.ts` + Expo Push.

**Repos touched:**

- **Mobile:** `/Users/antoniogonzalez/Sites/auto-toon-app`
- **Backend:** `/Users/antoniogonzalez/Sites/auto-toon` (a.k.a. `auto-toon` — canonical per `memory/project_canonical_repo.md`)

**Design doc:** `/Users/antoniogonzalez/Sites/auto-toon-app/docs/plans/2026-05-25-background-generation-awareness-design.md`

**Testing strategy:** Neither repo has a unit-test runner configured. Verification is manual end-to-end against a physical iOS device (push requires real device, not simulator). For pure-logic modules (`use-active-jobs-store`, `runWithJob`) we instrument via console logs and observe in dev. Add a Jest setup only if time permits — explicitly out of scope for this plan.

**Package manager:** pnpm for mobile (mobile repo `preinstall` enforces it). Backend uses its own — do not change.

---

## Phase A — Backend push wiring

Extend the push payload, then wire every long route that currently returns silently. Commit per route.

### Task A1: Extend `notifyGenerationComplete` / `notifyGenerationFailed` payload

**Files:**

- Modify: `/Users/antoniogonzalez/Sites/auto-toon/lib/push-notifications.ts`

**Step 1: Open the file and locate `notifyGenerationComplete` + `notifyGenerationFailed`.**

**Step 2: Replace the `opts` shapes to add `returnTo`, `jobKind`, and `jobId`.**

In `notifyGenerationComplete`:

```ts
export function notifyGenerationComplete(
  userId: string,
  opts: {
    type: string
    imageUrl?: string
    creditsRemaining?: number
    returnTo?: { pathname: string; params?: Record<string, string> }
    jobKind?: string
    jobId?: string
  }
): Promise<boolean> {
  return sendPushToUser(userId, {
    title: 'Generation Complete',
    body: `Your ${opts.type} is ready! Tap to view.`,
    data: {
      action: 'generation_complete',
      type: opts.type,
      ...(opts.imageUrl && { imageUrl: opts.imageUrl }),
      ...(opts.creditsRemaining !== undefined && { creditsRemaining: opts.creditsRemaining }),
      ...(opts.returnTo && { returnTo: opts.returnTo }),
      ...(opts.jobKind && { jobKind: opts.jobKind }),
      ...(opts.jobId && { jobId: opts.jobId }),
    },
    categoryId: 'generation',
  })
}
```

In `notifyGenerationFailed`:

```ts
export function notifyGenerationFailed(
  userId: string,
  opts: {
    type: string
    reason: string
    returnTo?: { pathname: string; params?: Record<string, string> }
    jobKind?: string
    jobId?: string
  }
): Promise<boolean> {
  return sendPushToUser(userId, {
    title: 'Generation Failed',
    body: `Your ${opts.type} could not be completed: ${opts.reason}`,
    data: {
      action: 'generation_failed',
      type: opts.type,
      reason: opts.reason,
      ...(opts.returnTo && { returnTo: opts.returnTo }),
      ...(opts.jobKind && { jobKind: opts.jobKind }),
      ...(opts.jobId && { jobId: opts.jobId }),
    },
    categoryId: 'generation',
  })
}
```

**Step 3: Verify backend type-checks.**

Run: `cd /Users/antoniogonzalez/Sites/auto-toon && pnpm tsc --noEmit`
Expected: no new errors introduced by this file.

**Step 4: Commit.**

```bash
cd /Users/antoniogonzalez/Sites/auto-toon
git add lib/push-notifications.ts
git commit -m "feat(push): add returnTo/jobKind/jobId to generation payloads"
```

---

### Task A2: Wire push into `enhance-product` route

This is the route that hosts gpt-image-2 — the primary culprit from the user's report.

**Files:**

- Modify: `/Users/antoniogonzalez/Sites/auto-toon/app/api/enhance-product/route.ts`

**Step 1: Read the file end-to-end** (~600 lines). Locate (a) success return paths near line ~554 where `userId` and result urls are in scope, and (b) error return / throw paths.

**Step 2: Add import at top.**

```ts
import { notifyGenerationComplete, notifyGenerationFailed } from '@/lib/push-notifications'
```

**Step 3: Just before each successful `NextResponse.json({ success: true, ... })` (there may be more than one path — find them all via grep `success: true` in this file), add:**

```ts
// Fire-and-forget push notification (best-effort)
void notifyGenerationComplete(userId, {
  type: 'enhanced product',
  imageUrl: heroImageUrl ?? secondImageUrl ?? undefined,
  creditsRemaining: typeof creditsRemaining === 'number' ? creditsRemaining : undefined,
  jobKind: 'enhance',
  returnTo: { pathname: '/(tabs)/create' },
})
```

`void` prefix ensures we never block the response on push delivery.

**Step 4: In the catch block(s) / error response paths, add (only where `userId` is in scope and a real generation failure occurred, NOT for 402 credits-exhausted or 401 auth):**

```ts
if (userId) {
  void notifyGenerationFailed(userId, {
    type: 'enhanced product',
    reason: error?.message ?? 'Unknown error',
    jobKind: 'enhance',
    returnTo: { pathname: '/(tabs)/create' },
  })
}
```

**Step 5: Type-check.**

Run: `cd /Users/antoniogonzalez/Sites/auto-toon && pnpm tsc --noEmit`
Expected: clean (no new errors).

**Step 6: Commit.**

```bash
cd /Users/antoniogonzalez/Sites/auto-toon
git add app/api/enhance-product/route.ts
git commit -m "feat(enhance-product): fire push on generation complete/failed"
```

---

### Task A3: Wire push into `fashion-editorial/multi-angle`

**Files:**

- Modify: `/Users/antoniogonzalez/Sites/auto-toon/app/api/fashion-editorial/multi-angle/route.ts`

**Step 1: Read the file. Identify userId variable, success return, error paths.**

**Step 2: Same pattern as A2 — import, success notify, failure notify.** Use:

```ts
jobKind: 'multi-angle',
type: 'multi-angle shot',
returnTo: { pathname: '/fashion-editorial/multi-angle' },
```

For `imageUrl` use the first/primary result URL in scope.

**Step 3: Type-check + commit.**

```bash
cd /Users/antoniogonzalez/Sites/auto-toon && pnpm tsc --noEmit
git add app/api/fashion-editorial/multi-angle/route.ts
git commit -m "feat(multi-angle): fire push on complete/failed"
```

---

### Task A4: Wire push into `fashion-editorial/generate`

**Files:**

- Modify: `/Users/antoniogonzalez/Sites/auto-toon/app/api/fashion-editorial/generate/route.ts`

**Step 1: Read file. Same pattern. `jobKind: 'fashion-editorial'`, `type: 'fashion editorial shot'`, `returnTo: { pathname: '/fashion-editorial/generate' }`.**

**Step 2: Type-check + commit.**

```bash
cd /Users/antoniogonzalez/Sites/auto-toon && pnpm tsc --noEmit
git add app/api/fashion-editorial/generate/route.ts
git commit -m "feat(fashion-editorial/generate): fire push on complete/failed"
```

---

### Task A5: Wire push into `generate-fashion-model`

**Files:**

- Modify: `/Users/antoniogonzalez/Sites/auto-toon/app/api/generate-fashion-model/route.ts`

**Step 1: Read. Same pattern. `jobKind: 'fashion-model'`, `type: 'fashion model'`, `returnTo: { pathname: '/model-result' }` (verify pathname exists in mobile app/router — `app/model-result.tsx` does exist).**

**Step 2: Type-check + commit.**

```bash
cd /Users/antoniogonzalez/Sites/auto-toon && pnpm tsc --noEmit
git add app/api/generate-fashion-model/route.ts
git commit -m "feat(generate-fashion-model): fire push on complete/failed"
```

---

### Task A6: Wire push into `upscale-grid`

**Files:**

- Modify: `/Users/antoniogonzalez/Sites/auto-toon/app/api/upscale-grid/route.ts`

**Pattern:** `jobKind: 'upscale'`, `type: 'upscale'`, `returnTo: { pathname: '/grid-upscale' }`.

Commit message: `feat(upscale-grid): fire push on complete/failed`.

---

### Task A7: Wire push into `restore`

**Files:**

- Modify: `/Users/antoniogonzalez/Sites/auto-toon/app/api/restore/route.ts`

**Pattern:** `jobKind: 'restore'`, `type: 'restoration'`, `returnTo: { pathname: '/restore' }`.

Commit message: `feat(restore): fire push on complete/failed`.

---

### Task A8: Wire push into `refine`

**Files:**

- Modify: `/Users/antoniogonzalez/Sites/auto-toon/app/api/refine/route.ts`

**Pattern:** `jobKind: 'refine'`, `type: 'refinement'`, `returnTo: { pathname: '/(tabs)/create' }` (verify which screen — read existing usage in mobile if unclear).

Commit message: `feat(refine): fire push on complete/failed`.

---

### Task A9: Backfill already-wired routes with the new fields

**Files:**

- Modify: `/Users/antoniogonzalez/Sites/auto-toon/app/api/relight/generate/route.ts`
- Modify: `/Users/antoniogonzalez/Sites/auto-toon/app/api/fashion-editorial/commercial/generate/route.ts`
- Modify: `/Users/antoniogonzalez/Sites/auto-toon/app/api/fashion-editorial/edit-image/route.ts`
- Modify: `/Users/antoniogonzalez/Sites/auto-toon/app/api/storyboard/scenes/render/route.ts`

**Step 1: For each, find existing `notifyGenerationComplete` / `notifyGenerationFailed` calls. Add `jobKind` + `returnTo` to the options.**

Mapping:

- `relight/generate` → `jobKind: 'relight'`, `returnTo: { pathname: '/relight' }`
- `fashion-editorial/commercial/generate` → `jobKind: 'commercial'`, `returnTo: { pathname: '/product-commercial' }`
- `fashion-editorial/edit-image` → `jobKind: 'fashion-editorial'`, `returnTo: { pathname: '/fashion-editorial/generate' }`
- `storyboard/scenes/render` → `jobKind: 'storyboard'`, `returnTo: { pathname: '/video-generator' }` (verify)

**Step 2: Type-check + single commit for the backfill.**

```bash
cd /Users/antoniogonzalez/Sites/auto-toon && pnpm tsc --noEmit
git add app/api/relight/generate/route.ts app/api/fashion-editorial/commercial/generate/route.ts app/api/fashion-editorial/edit-image/route.ts app/api/storyboard/scenes/render/route.ts
git commit -m "feat(push): backfill jobKind+returnTo on existing wired routes"
```

---

## Phase B — Mobile state layer

### Task B1: Create the active-jobs zustand store

**Files:**

- Create: `/Users/antoniogonzalez/Sites/auto-toon-app/stores/use-active-jobs-store.ts`

**Step 1: Write the file.**

```ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type JobKind =
  | 'enhance'
  | 'fashion-editorial'
  | 'multi-angle'
  | 'fashion-model'
  | 'relight'
  | 'video'
  | 'commercial'
  | 'upscale'
  | 'restore'
  | 'refine'
  | 'storyboard'

export interface ReturnTo {
  pathname: string
  params?: Record<string, string>
}

export interface ActiveJob {
  id: string
  kind: JobKind
  label: string
  thumbnail?: string
  startedAt: number
  returnTo: ReturnTo
  status: 'running' | 'failed'
  failReason?: string
}

interface ActiveJobsState {
  jobs: Record<string, ActiveJob>
  startJob: (job: Omit<ActiveJob, 'startedAt' | 'status'>) => void
  finishJob: (id: string) => void
  failJob: (id: string, reason?: string) => void
  removeJob: (id: string) => void
  sweepStale: (maxAgeMs?: number) => void
}

const DEFAULT_STALE_MS = 10 * 60 * 1000 // 10 minutes

export const useActiveJobsStore = create<ActiveJobsState>()(
  persist(
    (set, get) => ({
      jobs: {},
      startJob: (job) =>
        set((s) => ({
          jobs: {
            ...s.jobs,
            [job.id]: { ...job, startedAt: Date.now(), status: 'running' },
          },
        })),
      finishJob: (id) =>
        set((s) => {
          const next = { ...s.jobs }
          delete next[id]
          return { jobs: next }
        }),
      failJob: (id, reason) =>
        set((s) => {
          const existing = s.jobs[id]
          if (!existing) return s
          return {
            jobs: {
              ...s.jobs,
              [id]: { ...existing, status: 'failed', failReason: reason },
            },
          }
        }),
      removeJob: (id) =>
        set((s) => {
          const next = { ...s.jobs }
          delete next[id]
          return { jobs: next }
        }),
      sweepStale: (maxAgeMs = DEFAULT_STALE_MS) => {
        const now = Date.now()
        const jobs = get().jobs
        const next: Record<string, ActiveJob> = {}
        for (const [id, job] of Object.entries(jobs)) {
          if (now - job.startedAt < maxAgeMs) next[id] = job
        }
        set({ jobs: next })
      },
    }),
    {
      name: 'active-jobs-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
```

**Step 2: Type-check.**

Run: `cd /Users/antoniogonzalez/Sites/auto-toon-app && pnpm tsc --noEmit`
Expected: clean.

**Step 3: Commit.**

```bash
cd /Users/antoniogonzalez/Sites/auto-toon-app
git add stores/use-active-jobs-store.ts
git commit -m "feat(jobs): add active-jobs zustand store with AsyncStorage persistence"
```

---

### Task B2: Add the `runWithJob` helper

**Files:**

- Create: `/Users/antoniogonzalez/Sites/auto-toon-app/lib/run-with-job.ts`

**Step 1: Write the file.**

```ts
import * as Crypto from 'expo-crypto'
import { useActiveJobsStore, type ActiveJob } from '@/stores/use-active-jobs-store'

export interface JobDescriptor {
  kind: ActiveJob['kind']
  label: string
  thumbnail?: string
  returnTo: ActiveJob['returnTo']
}

export interface RunWithJobResult<T> {
  jobId: string
  result: T
}

/**
 * Wrap an async operation in a tracked job.
 * - Registers the job in `useActiveJobsStore` on start.
 * - Removes the job from the registry on success.
 * - Marks the job as failed (kept briefly for UI) on error, then removes it after a delay.
 *
 * Always rethrows the original error so existing call-site error handling is unchanged.
 */
export async function runWithJob<T>(
  descriptor: JobDescriptor,
  fn: (jobId: string) => Promise<T>
): Promise<RunWithJobResult<T>> {
  const jobId = Crypto.randomUUID()
  const { startJob, finishJob, failJob, removeJob } = useActiveJobsStore.getState()

  startJob({ id: jobId, ...descriptor })

  try {
    const result = await fn(jobId)
    finishJob(jobId)
    return { jobId, result }
  } catch (err: any) {
    failJob(jobId, err?.message ?? 'Unknown error')
    // Keep failed pill visible briefly, then drop it.
    setTimeout(() => removeJob(jobId), 3500)
    throw err
  }
}
```

**Step 2: Type-check.**

Run: `cd /Users/antoniogonzalez/Sites/auto-toon-app && pnpm tsc --noEmit`
Expected: clean. (`expo-crypto` is already in `package.json`.)

**Step 3: Smoke-check the lifecycle by temporarily adding a log in any screen.** Inside any screen's `useEffect`, add:

```ts
import { runWithJob } from '@/lib/run-with-job'
import { useActiveJobsStore } from '@/stores/use-active-jobs-store'

// Inside dev-only useEffect:
useEffect(() => {
  ;(async () => {
    console.log('[jobs] before:', useActiveJobsStore.getState().jobs)
    await runWithJob(
      { kind: 'enhance', label: 'smoke test', returnTo: { pathname: '/(tabs)/create' } },
      () => new Promise((res) => setTimeout(res, 1000))
    )
    console.log('[jobs] after success:', useActiveJobsStore.getState().jobs)
  })()
}, [])
```

Run the app in dev (`pnpm start`, press `i`). Confirm logs show the job appearing and disappearing. **Remove the smoke-test code before committing.**

**Step 4: Commit.**

```bash
cd /Users/antoniogonzalez/Sites/auto-toon-app
git add lib/run-with-job.ts
git commit -m "feat(jobs): add runWithJob helper"
```

---

## Phase C — Mobile UI: banner + root layout integration

### Task C1: Build the `ActiveJobsBanner` component

**Files:**

- Create: `/Users/antoniogonzalez/Sites/auto-toon-app/components/active-jobs-banner.tsx`

**Step 1: Write the file.**

```tsx
import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { Image } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { theme } from '@/constants/theme'
import { useActiveJobsStore } from '@/stores/use-active-jobs-store'

export function ActiveJobsBanner() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const jobs = useActiveJobsStore((s) => s.jobs)

  const list = useMemo(() => Object.values(jobs).sort((a, b) => b.startedAt - a.startedAt), [jobs])
  if (list.length === 0) return null

  const primary = list[0]
  const extra = list.length - 1
  const failed = primary.status === 'failed'

  const onPress = () => {
    router.push({ pathname: primary.returnTo.pathname as never, params: primary.returnTo.params as never })
  }

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 6 }]}>
      <Pressable onPress={onPress} style={[styles.pill, failed && styles.pillFailed]}>
        {primary.thumbnail ? (
          <Image source={{ uri: primary.thumbnail }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={styles.thumbPlaceholder} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {failed ? 'Generation failed' : `Generating ${primary.label}`}
            {extra > 0 && !failed ? `  +${extra} more` : ''}
          </Text>
          {failed && primary.failReason ? (
            <Text style={styles.sub} numberOfLines={1}>
              {primary.failReason}
            </Text>
          ) : null}
        </View>
        {!failed && <ActivityIndicator color="#fff" />}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(20,20,22,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    maxWidth: '92%',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  pillFailed: {
    backgroundColor: 'rgba(180,30,30,0.95)',
  },
  thumb: { width: 28, height: 28, borderRadius: 6 },
  thumbPlaceholder: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#333' },
  title: { color: '#fff', fontSize: 13, fontWeight: '600' },
  sub: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 },
})
```

**Step 2: Type-check.**

Run: `cd /Users/antoniogonzalez/Sites/auto-toon-app && pnpm tsc --noEmit`
Expected: clean. If `theme` import unused, drop it.

**Step 3: Commit.**

```bash
cd /Users/antoniogonzalez/Sites/auto-toon-app
git add components/active-jobs-banner.tsx
git commit -m "feat(jobs): add ActiveJobsBanner pill"
```

---

### Task C2: Mount the banner globally + add notification response handler in root layout

**Files:**

- Modify: `/Users/antoniogonzalez/Sites/auto-toon-app/app/_layout.tsx`

**Step 1: Read the existing file.** Note where the root `<Stack>` / providers are rendered, and where existing `expo-notifications` permission registration lives (we already have `lib/notifications.ts`).

**Step 2: Add imports.**

```tsx
import * as Notifications from 'expo-notifications'
import { useEffect, useRef } from 'react'
import { useRouter } from 'expo-router'
import { AppState } from 'react-native'

import { ActiveJobsBanner } from '@/components/active-jobs-banner'
import { useActiveJobsStore } from '@/stores/use-active-jobs-store'
```

(If some imports already exist, deduplicate.)

**Step 3: Inside the root layout component, add the navigation handler hook.**

```tsx
function useGenerationPushRouting() {
  const router = useRouter()
  const handledColdStart = useRef(false)

  useEffect(() => {
    function navigate(data: any) {
      if (!data) return
      if (data.action !== 'generation_complete' && data.action !== 'generation_failed') return

      // De-dupe: if HTTP already finalized the job, skip auto-routing — banner already cleared.
      const jobId = typeof data.jobId === 'string' ? data.jobId : undefined
      const jobs = useActiveJobsStore.getState().jobs
      if (jobId && !jobs[jobId]) {
        // Job already resolved in-app; do nothing.
        return
      }

      if (data.returnTo?.pathname) {
        router.push({ pathname: data.returnTo.pathname, params: data.returnTo.params })
      } else if (data.imageUrl) {
        router.push({
          pathname: '/image-viewer',
          params: { urls: JSON.stringify([data.imageUrl]) },
        })
      }
    }

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      navigate(response.notification.request.content.data)
    })

    // Cold-start: process the notification that launched the app, once.
    if (!handledColdStart.current) {
      handledColdStart.current = true
      Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response) navigate(response.notification.request.content.data)
      })
    }

    return () => sub.remove()
  }, [router])
}
```

**Step 4: Add the foreground-sweep hook for stale jobs.**

```tsx
function useStaleJobSweep() {
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        useActiveJobsStore.getState().sweepStale()
      }
    })
    // Also sweep on mount.
    useActiveJobsStore.getState().sweepStale()
    return () => sub.remove()
  }, [])
}
```

**Step 5: Call both hooks inside the root layout component (the one that wraps the `<Stack>`).** Render `<ActiveJobsBanner />` as a sibling of the `<Stack>`, after it, so it overlays.

```tsx
useGenerationPushRouting()
useStaleJobSweep()

return (
  <>
    <Stack>{/* existing routes */}</Stack>
    <ActiveJobsBanner />
  </>
)
```

(Adapt to actual existing JSX structure — keep all existing providers.)

**Step 6: Type-check + manual smoke.**

Run: `cd /Users/antoniogonzalez/Sites/auto-toon-app && pnpm tsc --noEmit`
Expected: clean.

Manual: start dev (`pnpm start`, press `i`). With the registry empty, banner should be invisible. Drop into Reactotron / a temp button calling `useActiveJobsStore.getState().startJob({ id: 'x', kind: 'enhance', label: 'demo', returnTo: { pathname: '/(tabs)/create' } })` — confirm banner appears across screens.

**Step 7: Commit.**

```bash
cd /Users/antoniogonzalez/Sites/auto-toon-app
git add app/_layout.tsx
git commit -m "feat(jobs): mount banner globally + push-tap deep link + stale sweep"
```

---

## Phase D — Wrap each long-flow screen with `runWithJob`

For each screen below, the pattern is identical:

1. `import { runWithJob } from '@/lib/run-with-job'`
2. Identify the existing `await <api>(...)` call.
3. Replace with `const { result } = await runWithJob({ kind, label, thumbnail, returnTo }, () => <api>(...))`.
4. Substitute `result` for the previous direct return value.
5. Type-check.
6. Commit per file.

The existing in-screen full-page loader (driven by per-flow `generationPhase`) stays untouched.

### Task D1: Create screen (enhance-product)

**Files:**

- Modify: `/Users/antoniogonzalez/Sites/auto-toon-app/views/create/create-screen.tsx`

**Step 1: Find the `await enhanceProduct(...)` call around line 88-110.**

**Step 2: Replace.**

```ts
const { result } = await runWithJob(
  {
    kind: 'enhance',
    label: store.productName || 'product',
    thumbnail: store.localImageUri ?? store.uploadedImageUrl ?? undefined,
    returnTo: { pathname: '/(tabs)/create' },
  },
  () =>
    enhanceProduct({
      imageUrl: store.uploadedImageUrl!,
      productName: store.productName,
      model: AI_MODELS[store.selectedModel].id,
      ...(store.selectedModel === 'MIDJOURNEY_V7' ? { mjParams } : {}),
      generationMode: store.generationMode,
      secondImageConfig: goalConfig?.secondImageType
        ? {
            type: goalConfig.secondImageType,
            elementsConfig: store.secondImageConfig.elementsConfig,
            posterConfig: store.secondImageConfig.posterConfig as Record<string, unknown> | undefined,
          }
        : undefined,
      promptCustomizations: store.promptCustomizations,
      seedreamConfig: store.seedreamConfig,
      seasonalEnabled: store.seasonalEnabled,
      skipHeroImage: store.generationMode === 'style-only',
      skipSecondImage: store.generationMode === 'enhance-only',
      categoryAttributes: store.categoryAttributes ?? undefined,
      suggestedStyleVariant: store.suggestedStyleVariant,
      styleVariantOverride: store.selectedStyleVariant,
      extractedText: store.extractedText ?? undefined,
    })
)

if (result.success) {
  store.setGenerationResult(result.heroImageUrl ?? null, result.vignetteImageUrl ?? null)
  useCreditsStore.getState().setCredits(result.creditsRemaining)
  fetchCredits()
} else {
  store.setError('Generation failed. Please try again.')
}
```

**Step 3: Type-check + commit.**

```bash
cd /Users/antoniogonzalez/Sites/auto-toon-app && pnpm tsc --noEmit
git add views/create/create-screen.tsx
git commit -m "feat(jobs): track enhance-product generation as active job"
```

---

### Task D2: Multi-angle screen

**Files:**

- Modify: `/Users/antoniogonzalez/Sites/auto-toon-app/app/fashion-editorial/multi-angle.tsx`

**Pattern:** wrap the multi-angle API call.

```ts
{
  kind: 'multi-angle',
  label: <best label in scope, e.g. modelName or 'multi-angle'>,
  thumbnail: <source image uri if available>,
  returnTo: { pathname: '/fashion-editorial/multi-angle' },
}
```

Type-check + commit `feat(jobs): track multi-angle as active job`.

---

### Task D3: Fashion-editorial generate / clothing / shoe / showcase / campaign

**Files:**

- Modify: `/Users/antoniogonzalez/Sites/auto-toon-app/app/fashion-editorial/generate.tsx`
- Modify: `/Users/antoniogonzalez/Sites/auto-toon-app/app/fashion-editorial/clothing.tsx`
- Modify: `/Users/antoniogonzalez/Sites/auto-toon-app/app/fashion-editorial/shoe.tsx`
- Modify: `/Users/antoniogonzalez/Sites/auto-toon-app/app/fashion-editorial/showcase.tsx`
- Modify: `/Users/antoniogonzalez/Sites/auto-toon-app/app/fashion-editorial/campaign.tsx`

For each: identify the long-running API call (skip pure picker/setup screens — only wrap real `await` calls that hit the backend with a generation). Use `kind: 'fashion-editorial'` and `returnTo` matching the current pathname.

Commit per file: `feat(jobs): track <screen> as active job`. (5 commits, or batch if all touched in one session — prefer per-file commits for revert safety.)

---

### Task D4: Fashion-model generation (model-wizard, models)

**Files:**

- Modify: `/Users/antoniogonzalez/Sites/auto-toon-app/app/model-wizard.tsx`
- Modify: `/Users/antoniogonzalez/Sites/auto-toon-app/app/models.tsx`

Wrap `generateFashionModel` (or `generateCharacterSheet` if used here).

```ts
{
  kind: 'fashion-model',
  label: <model name or 'new model'>,
  returnTo: { pathname: '/model-result' },
}
```

Commit: `feat(jobs): track fashion-model generation as active job`.

---

### Task D5: Relight

**Files:**

- Modify: `/Users/antoniogonzalez/Sites/auto-toon-app/app/relight.tsx`

Wrap `relightImage` call.

```ts
{ kind: 'relight', label: 'relight', returnTo: { pathname: '/relight' } }
```

Commit: `feat(jobs): track relight as active job`.

---

### Task D6: Product commercial

**Files:**

- Modify: `/Users/antoniogonzalez/Sites/auto-toon-app/app/product-commercial.tsx`

Wrap commercial generation. **Note:** if this flow uses SSE (look for `generateVideoSSE` or similar), wrap the entire SSE consumption in `runWithJob` — call `finishJob` only when the final event arrives, fail on error event. The helper as written needs adjustment for SSE — see Task D7 for the SSE pattern.

```ts
{ kind: 'commercial', label: 'commercial', returnTo: { pathname: '/product-commercial' } }
```

Commit: `feat(jobs): track commercial as active job`.

---

### Task D7: Video generator (SSE)

**Files:**

- Modify: `/Users/antoniogonzalez/Sites/auto-toon-app/app/video-generator.tsx`

**Special case — SSE.** The helper `runWithJob` expects a single awaited promise. For SSE, wrap the whole subscription in a `new Promise` that resolves on the success event and rejects on the error event:

```ts
await runWithJob(
  { kind: 'video', label: 'video', returnTo: { pathname: '/video-generator' } },
  () =>
    new Promise<void>((resolve, reject) => {
      generateVideoSSE(args, {
        onProgress: (...) => {/* existing */},
        onStoryboard: (...) => {/* existing */},
        onSuccess: (...) => {
          // existing success handler
          resolve()
        },
        onError: (err) => {
          // existing error handler
          reject(new Error(err.message ?? 'Video failed'))
        },
      })
    })
)
```

Commit: `feat(jobs): track video generation as active job`.

---

### Task D8: Upscale-grid + restore + (any other long flows)

**Files:**

- Modify: `/Users/antoniogonzalez/Sites/auto-toon-app/app/grid-upscale.tsx`
- Modify: `/Users/antoniogonzalez/Sites/auto-toon-app/app/restore.tsx`

Wrap `upscaleGrid` / `restoreImage`. Use respective `kind`s and `returnTo` paths.

Commits:

- `feat(jobs): track upscale-grid as active job`
- `feat(jobs): track restore as active job`

---

## Phase E — Manual verification

No automated tests. Verify on a real iOS device (push requires it).

### Task E1: In-app banner — single job

1. Start backend dev server.
2. Run mobile app on real device: `cd /Users/antoniogonzalez/Sites/auto-toon-app && pnpm ios --device`.
3. Sign in.
4. On the Create tab, upload a product photo, select gpt-image-2 (or any slow model), tap Generate.
5. Loading screen appears.
6. Tap a different tab (Assets) before generation finishes.
7. **Expected:** banner pill is visible at top of every screen, label = product name, with spinner.
8. Tap the pill. **Expected:** routes back to Create.
9. Wait for generation to finish. **Expected:** banner pill disappears, Create tab shows the result.

### Task E2: In-app banner — multiple concurrent jobs

1. Trigger an enhance-product generation.
2. Without waiting, navigate to relight, trigger a relight on a different image.
3. **Expected:** banner shows "Generating X +1 more".
4. Wait for both. **Expected:** banner clears as each completes.

### Task E3: Push — app backgrounded

1. Trigger a slow generation (gpt-image-2 enhance).
2. Background the app (swipe to home, don't kill).
3. Wait for completion.
4. **Expected:** OS push banner "Generation Complete — Your enhanced product is ready! Tap to view."
5. Tap. **Expected:** app foregrounds and routes to `/(tabs)/create` with result rendered. Banner pill is gone (HTTP response landed during the routing — dedupe path).

### Task E4: Push — app killed

1. Trigger a slow generation.
2. Force-kill the app.
3. Wait for completion.
4. **Expected:** push arrives. Tap. App cold-starts and routes via `getLastNotificationResponseAsync` to the result screen. Banner pill empty (registry cleared by sweep after relaunch — acceptable; result rendered directly).

### Task E5: Failure path

1. Trigger a generation that will fail server-side (temporarily edit a route to `throw new Error('test fail')`).
2. **Expected:** red banner pill briefly, auto-clears after ~3.5s. If backgrounded, push "Generation Failed".
3. Revert the test fail.

### Task E6: Stale sweep

1. With the app open, manually call `useActiveJobsStore.getState().startJob({ id: 'stale', kind: 'enhance', label: 'stale', returnTo: { pathname: '/(tabs)/create' } })`, then directly mutate `startedAt` to `Date.now() - 11 * 60 * 1000` via dev tools, then background + foreground the app.
2. **Expected:** the stale pill is removed by the sweep.

---

## Out of scope (do not implement)

- Server-side `GenerationJob` table.
- Cancellation of in-flight jobs.
- Generation history / retry UI.
- Jest / Vitest setup.
- Updating already-wired routes' core logic beyond payload-field additions.

---

## Risks + open questions

- **Cold-start race**: if the router isn't ready when `getLastNotificationResponseAsync` resolves, `router.push` may no-op. Mitigation: rely on `useRouter` hook (already mounted) + the natural mount order; if observed-flaky in E4, defer `navigate(data)` behind a short `setTimeout(..., 0)` or wait on a `useNavigationContainerRef`'s ready state.
- **Auth gate**: if a user receives a push while signed out (rare — token belongs to authenticated user), tap-routing might land them on a protected screen and the existing auth modal handles it. No new code needed unless E3/E4 surface a routing failure.
- **Returning to deep-link with non-route params**: returnTo `params` must be string-only (expo-router requirement). Ensure every backend route producing `returnTo` only sets string params.
