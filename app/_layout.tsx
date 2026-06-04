import { useEffect, useRef } from 'react'
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { useFonts } from 'expo-font'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { ClerkProvider, ClerkLoaded, useAuth } from '@clerk/clerk-expo'
import { QueryClientProvider } from '@tanstack/react-query'
import { useColorScheme } from 'react-native'
import * as Notifications from 'expo-notifications'

import { CONFIG } from '@/lib/config'
import { tokenCache } from '@/lib/clerk-token-cache'
import { setTokenGetter } from '@/lib/api'
import { queryClient } from '@/lib/query'
import { useOnboardingStore } from '@/stores/use-onboarding-store'
import { useSignUpStore } from '@/stores/use-signup-store'
import { useNotificationsStore } from '@/stores/use-notifications-store'
import { registerForPushNotifications, syncPushToken } from '@/lib/notifications'
import { TermsConsentModal } from '@/components/terms-consent-modal'
import { AIConsentModal } from '@/components/ai-consent-modal'
import { ExhaustionModal } from '@/components/exhaustion-modal'
import { InFlightBanner } from '@/components/in-flight-banner'
import { useGenerationResume } from '@/lib/generation-resume'
import { useGenerationTracker } from '@/stores/use-generation-tracker'

export { ErrorBoundary } from 'expo-router'

SplashScreen.preventAutoHideAsync()

/**
 * Shape of the `data` blob attached to every server-sent push. `generationId`
 * lets the client correlate a notification with an in-flight job tracked
 * locally — without it we can't clear the banner without polling.
 */
type PushPayload = {
  action?: string
  generationId?: string
  imageUrl?: string
  videoUrl?: string
  reason?: string
}

/**
 * If the push refers to a tracked job, dispatch the terminal status through
 * the tracker and return true. Returns false when the push has no matching
 * job (legacy push, unrelated event) so the caller can fall back to its
 * own routing logic.
 */
function dispatchPushToTracker(
  data: PushPayload | undefined,
  _router: ReturnType<typeof useRouter>,
): boolean {
  if (!data?.generationId || !data.action) return false
  const tracker = useGenerationTracker.getState()
  if (!tracker.jobs[data.generationId]) return false

  if (data.action === 'video_ready' || data.action === 'generation_complete') {
    tracker.completeJob(data.generationId, {
      status: 'completed',
      videoUrl: data.videoUrl,
    })
    return true
  }
  if (data.action === 'generation_failed') {
    tracker.completeJob(data.generationId, {
      status: 'failed',
      errorMessage: data.reason || 'Generation failed',
    })
    return true
  }
  return false
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const segments = useSegments()
  const router = useRouter()
  const onboardingCompleted = useOnboardingStore((s) => s.completed)
  const justSignedUp = useSignUpStore((s) => s.justSignedUp)
  const setJustSignedUp = useSignUpStore((s) => s.setJustSignedUp)

  const setPushToken = useNotificationsStore((s) => s.setPushToken)
  const setPermissionGranted = useNotificationsStore((s) => s.setPermissionGranted)
  const setHasPrompted = useNotificationsStore((s) => s.setHasPrompted)
  const notificationListener = useRef<Notifications.Subscription>()
  const responseListener = useRef<Notifications.Subscription>()

  // Resume in-flight generation jobs whenever the app foregrounds. This
  // covers the case where a video / commercial generation was started, the
  // user backgrounded the app, iOS killed the SSE socket, and the backend
  // finished the work autonomously. On foreground we poll the status
  // endpoint per tracked job id and dispatch the result to whichever screen
  // registered the matching origin handler.
  useGenerationResume()

  // Wire Clerk's getToken to the API client as soon as Clerk is loaded.
  // getToken() returns null when unsigned, so attaching early is safe and
  // avoids a race where API calls fire before the interceptor has auth.
  useEffect(() => {
    if (isLoaded) {
      setTokenGetter(getToken)
    }
  }, [isLoaded, getToken])

  // Register for push notifications after sign-in
  // Must run after the token getter is wired so API calls are authenticated
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return

    // Ensure auth interceptor is set before making API calls
    setTokenGetter(getToken)

    // Hydrate AI-consent state from server so requireConsent() can short-circuit.
    import('@/stores/use-ai-consent-store').then(({ useAIConsentStore }) => {
      useAIConsentStore.getState().hydrateFromServer()
    })

    registerForPushNotifications().then((token) => {
      setHasPrompted()
      if (token) {
        setPushToken(token)
        setPermissionGranted(true)
        syncPushToken(token).catch(console.warn)
      }
    })

    // Foreground notification: drive the tracker so the in-flight banner
    // clears the moment the backend reports completion, even if the SSE
    // socket was killed by backgrounding. The tracker handler (registered
    // by the source screen) takes care of any UI navigation.
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        const data = notification.request.content.data as PushPayload | undefined
        dispatchPushToTracker(data, router)
      }
    )

    // Notification tap. Dispatch through the tracker so the source screen's
    // handler runs (it knows where to navigate). Fall back to raw URL
    // routing only when the push lacks a generationId — e.g. legacy pushes
    // from before this change shipped.
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as PushPayload | undefined
        const dispatched = dispatchPushToTracker(data, router)
        if (dispatched) return

        if (!data?.action) return
        switch (data.action) {
          case 'generation_complete':
            if (data.imageUrl) {
              router.push({ pathname: '/image-viewer', params: { imageUrl: data.imageUrl } })
            }
            break
          case 'video_ready':
            if (data.videoUrl) {
              router.push({ pathname: '/video-player', params: { videoUrl: data.videoUrl } })
            }
            break
          case 'credits_low':
          case 'credits_exhausted':
            router.push('/account/pricing')
            break
          case 'spending_limit':
            router.push('/account/credits')
            break
        }
      }
    )

    return () => {
      notificationListener.current?.remove()
      responseListener.current?.remove()
    }
  }, [isLoaded, isSignedIn])

  // Redirect based on auth + onboarding state
  useEffect(() => {
    if (!isLoaded) return

    const inOnboarding = segments[0] === '(onboarding)'
    const inAuthGroup = segments[0] === '(auth)'
    const inWelcome = segments[0] === 'welcome'

    if (!onboardingCompleted && !isSignedIn && !inOnboarding) {
      // First launch — show onboarding
      router.replace('/(onboarding)')
    } else if (onboardingCompleted && !isSignedIn && !inAuthGroup) {
      // Onboarding done but not signed in — go to auth
      router.replace('/(auth)/sign-in')
    } else if (isSignedIn && (inAuthGroup || inOnboarding)) {
      if (justSignedUp) {
        // New user — show welcome screen
        setJustSignedUp(false)
        router.replace('/welcome')
      } else if (!inWelcome) {
        // Returning user — go to main app
        router.replace('/(tabs)')
      }
    }
  }, [isLoaded, isSignedIn, onboardingCompleted, segments])

  return <>{children}</>
}

export default function RootLayout() {
  const colorScheme = useColorScheme()
  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  })

  useEffect(() => {
    if (fontError) throw fontError
  }, [fontError])

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync()
  }, [fontsLoaded])

  if (!fontsLoaded) return null

  return (
    <ClerkProvider
      publishableKey={CONFIG.CLERK_PUBLISHABLE_KEY}
      tokenCache={tokenCache}
    >
      <ClerkLoaded>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <AuthGate>
              {/* Mounted at root so they overlay every modal-presentation route
                  (product-commercial, video-generator, fashion-editorial, etc).
                  Mounting under (tabs)/_layout left consent prompts invisible
                  on screens pushed above the tabs stack. */}
              <TermsConsentModal />
              <AIConsentModal />
              <ExhaustionModal />
              <InFlightBanner />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(onboarding)" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="account"
                  options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }}
                />
                <Stack.Screen
                  name="assets"
                  options={{ headerShown: false, presentation: 'card' }}
                />
                <Stack.Screen
                  name="grid-upscale"
                  options={{ headerShown: false, presentation: 'modal' }}
                />
                <Stack.Screen
                  name="image-viewer"
                  options={{ headerShown: false, presentation: 'modal', animation: 'fade' }}
                />
                <Stack.Screen
                  name="restore-viewer"
                  options={{ headerShown: false, presentation: 'modal', animation: 'fade', gestureEnabled: false }}
                />
                <Stack.Screen
                  name="model-wizard"
                  options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }}
                />
                <Stack.Screen
                  name="model-result"
                  options={{ headerShown: false, presentation: 'modal', animation: 'fade' }}
                />
                <Stack.Screen
                  name="sheet-result"
                  options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: false }}
                />
                <Stack.Screen
                  name="video-generator"
                  options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }}
                />
                <Stack.Screen
                  name="product-commercial"
                  options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }}
                />
                <Stack.Screen
                  name="fashion-editorial"
                  options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }}
                />
                <Stack.Screen
                  name="video-player"
                  options={{ headerShown: false, presentation: 'modal', animation: 'fade' }}
                />
                <Stack.Screen
                  name="welcome"
                  options={{ headerShown: false, presentation: 'modal', animation: 'fade', gestureEnabled: false }}
                />
              </Stack>
            </AuthGate>
          </ThemeProvider>
        </QueryClientProvider>
      </ClerkLoaded>
    </ClerkProvider>
  )
}
