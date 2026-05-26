# Background generation awareness — design

**Date:** 2026-05-25
**Status:** approved
**Repos touched:** `auto-toon-app` (mobile), `auto-toon` (backend)

## Problem

Long generations (especially `gpt-image-2`) can run for tens of seconds to minutes. The mobile loading screen blocks the originating screen, but when the user dismisses it by navigating away or backgrounding the app, there is no remaining signal that the job is still in flight. Users may assume the generation was canceled, retry, or miss the result.

## Goals

- Persistent in-app indicator that one or more generations are still running, visible across all screens.
- Out-of-app notification (push) when a generation completes, with a deep link back to the result.
- Cover all long-running flows, not just `enhance-product`.
- No backend schema changes — client-side job registry + existing push infrastructure.

## Non-goals

- Generation history UI / retry-from-history (out of scope).
- Server-side `GenerationJob` table (YAGNI — push payload is the source of truth for kill-recovery).
- Cancellation of in-flight jobs (existing behavior preserved).

## Architecture

Client-only registry plus push-on-completion. No new server tables.

- New zustand store `stores/use-active-jobs-store.ts` (persisted to AsyncStorage). Holds `Record<jobId, ActiveJob>`.
- New helper `lib/use-active-job.ts` exporting `runWithJob(descriptor, asyncFn)` — registers job on start, unregisters on settle.
- New component `components/active-jobs-banner.tsx` — pinned pill rendered above tab bar via root `app/_layout.tsx`. Visible whenever `Object.keys(jobs).length > 0`. Tap → `router.push(job.returnTo)`.
- Each long-flow screen replaces its bare `await apiCall(...)` with `runWithJob(descriptor, () => apiCall(...))`. Existing per-flow `generationPhase` state still drives the in-screen full-page loader.
- Backend long routes that currently return silently are wired to call `notifyGenerationComplete` / `notifyGenerationFailed` from `lib/push-notifications.ts`.
- Push payload extended with `returnTo` + `jobKind` for deterministic deep-linking.
- Root `_layout.tsx` registers a notification-response handler that routes on tap, with cold-start support via `getLastNotificationResponseAsync()`.

### `ActiveJob` shape

```ts
type ActiveJob = {
  id: string                              // uuid
  kind: 'enhance' | 'fashion-editorial' | 'multi-angle' | 'fashion-model' | 'relight' | 'video' | 'commercial' | 'upscale' | 'restore' | 'refine' | 'storyboard'
  label: string                           // e.g. product name
  thumbnail?: string                      // localImageUri or remote
  startedAt: number                       // Date.now()
  returnTo: { pathname: string; params?: Record<string, string> }
}
```

## Components

**New (mobile):**

- `stores/use-active-jobs-store.ts` — zustand + persist. API: `startJob(job)`, `finishJob(id)`, `failJob(id, reason?)`, selectors. Persist via `AsyncStorage` so banner survives app refresh during dev (and survives kill, sweep handles staleness).
- `lib/use-active-job.ts` — `runWithJob<T>(descriptor: Omit<ActiveJob, 'id' | 'startedAt'>, fn: () => Promise<T>): Promise<T>`. Generates uuid, calls `startJob` before awaiting, always calls `finishJob` or `failJob` in `finally`.
- `components/active-jobs-banner.tsx` — pinned pill. One job: shows thumbnail + label + spinner. Multiple: shows count + first label. Tap → routes to first job's `returnTo`. Long-press (optional, deferred): show list of all active jobs.

**Edited (mobile):**

- `app/_layout.tsx` — mount banner globally, register notification response listener, handle cold-start last-notification.
- `views/create/create-screen.tsx` — wrap `enhanceProduct` call in `runWithJob`.
- `app/fashion-editorial/generate.tsx`, `multi-angle.tsx`, `clothing.tsx`, `shoe.tsx`, `showcase.tsx`, `campaign.tsx` — wrap respective API calls.
- `app/model-wizard.tsx`, `app/models.tsx` — wrap fashion-model generation calls.
- `app/relight.tsx` — wrap relight call.
- `app/video-generator.tsx` — wrap video gen call.
- `app/product-commercial.tsx` — wrap commercial generate call.
- `app/restore.tsx`, `app/grid-upscale.tsx` — wrap restore + upscale calls.
- `lib/notifications.ts` — no change (registration unchanged).

**Edited (backend):**

- `lib/push-notifications.ts` — extend `notifyGenerationComplete` and `notifyGenerationFailed` to accept and pass through `returnTo` + `jobKind` in `data`.
- `app/api/enhance-product/route.ts` — fire `notifyGenerationComplete` after success, `notifyGenerationFailed` on error.
- `app/api/fashion-editorial/multi-angle/route.ts` — same.
- `app/api/fashion-editorial/generate/route.ts` — same (if reachable from mobile).
- `app/api/generate-fashion-model/route.ts` — same.
- `app/api/fashion-model/*` routes — audit + same.
- `app/api/upscale-grid/route.ts` — same.
- `app/api/restore/route.ts` — same.
- `app/api/refine/route.ts` — same.
- `app/api/storyboard/scenes/render/route.ts` — already wired, verify payload matches new shape.
- Existing wired routes (`relight/generate`, `fashion-editorial/commercial/generate`, `fashion-editorial/edit-image`) — extend with `returnTo` + `jobKind` in payload.

## Data flow

### Start

1. User taps Generate on any flow screen.
2. Screen calls `runWithJob({ kind, label, thumbnail, returnTo: { pathname: '/.../current-screen', params } }, () => apiCall(args))`.
3. Helper generates `jobId`, calls `startJob`, awaits inner fn.
4. Existing `store.generationPhase = 'generating'` continues to drive the in-screen full-page loader.

### Dismiss / navigate away

5. User pops or switches tabs. Inner promise keeps running (already true today — zustand state persists across screen unmounts).
6. `<ActiveJobsBanner />` visible on every other screen.

### Complete (app foregrounded)

7. Backend resolves; mobile receives HTTP response.
8. `runWithJob` `finally` calls `finishJob(jobId)`. Banner pill removed.
9. Per-flow store sets result via existing logic. If user is on originating screen, `ResultView` renders.
10. If user is elsewhere, show 5s toast "X ready — tap to view" that routes via `returnTo` on tap.

### Background / killed

11. Backend route calls `notifyGenerationComplete(userId, { type, imageUrl, returnTo, jobKind, creditsRemaining })` post-success.
12. Push delivered by Expo Push. OS displays banner.
13. Tap → `addNotificationResponseReceivedListener` handler reads `data.returnTo` and `data.imageUrl`, navigates.

### Error

14. `runWithJob` catches → `failJob(jobId, reason)`. Banner shows red pill briefly (3s), then auto-clears.
15. Backend route fires `notifyGenerationFailed` before returning error response.

### Push-tap dedupe (foregrounded)

16. Notification handler checks `useActiveJobsStore.getState().jobs[data.jobId]`. If absent (HTTP already resolved), suppress in-app toast — OS-level banner still showed.

## Push payload extension

```ts
notifyGenerationComplete(userId, {
  type: string                    // existing
  imageUrl?: string               // existing
  creditsRemaining?: number       // existing
  returnTo?: { pathname: string; params?: Record<string, string> }  // NEW
  jobKind?: ActiveJob['kind']     // NEW
  jobId?: string                  // NEW (for dedupe)
})
```

`returnTo` shape mirrors expo-router `router.push` input.

## Deep-link handler

In `app/_layout.tsx`:

```ts
useEffect(() => {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, unknown>
    if (data.action === 'generation_complete' || data.action === 'generation_failed') {
      if (data.returnTo) router.push(data.returnTo as never)
      else if (data.imageUrl) router.push({ pathname: '/image-viewer', params: { urls: JSON.stringify([data.imageUrl]) } })
    }
  })
  // Cold-start
  Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response) sub.remove() // process once
    // ...same routing logic, deferred until auth ready
  })
  return () => sub.remove()
}, [router])
```

Auth gate: if user signed out when push tapped, queue `pendingRoute` in `use-auth-modal` store, consume after sign-in resolves.

## Error handling + edge cases

- **Multiple concurrent jobs**: registry is `Record`, banner shows count.
- **App killed mid-job**: persisted store may contain stale jobs. On app foreground sweep, mark jobs older than 10min as stale and remove. Backend push remains authoritative.
- **Push permission denied**: banner-only inside app. `sendPushToUser` already no-ops when token missing.
- **Network drop mid-fetch**: `runWithJob` catches, calls `failJob`. Red pill + toast.
- **Duplicate completion** (HTTP resolves + push arrives): dedupe via `jobId` lookup in registry (see step 16).
- **Cold-start auth not ready**: queue pending route, consume after auth resolves.

## Testing

- Manual: run gpt-image-2 enhance, navigate to another tab during load, verify banner visible, verify push arrives on backgrounded device, verify tap routes back to result.
- Manual: kill app mid-generation, verify push arrives + tap deep-links correctly.
- Manual: trigger failure (force 500 server-side), verify red pill + push-failure path.
- Unit: `use-active-jobs-store` reducers.
- Unit: `runWithJob` start/finish/fail lifecycle including thrown errors.
