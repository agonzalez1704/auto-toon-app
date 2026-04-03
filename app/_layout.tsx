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

export { ErrorBoundary } from 'expo-router'

SplashScreen.preventAutoHideAsync()

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

  // Wire Clerk's getToken to the API client
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      setTokenGetter(getToken)
    }
  }, [isLoaded, isSignedIn, getToken])

  // Register for push notifications after sign-in
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return

    registerForPushNotifications().then((token) => {
      setHasPrompted()
      if (token) {
        setPushToken(token)
        setPermissionGranted(true)
        syncPushToken(token).catch(console.warn)
      }
    })

    // Handle notifications received while the app is in the foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (_notification) => {
        // Foreground notification received — no-op by default since
        // the handler already shows the alert via setNotificationHandler
      }
    )

    // Handle notification taps (user interacts with a notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as
          | { type?: string; imageUrl?: string; videoUrl?: string }
          | undefined

        if (!data?.type) return

        switch (data.type) {
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
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current)
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current)
      }
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
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(onboarding)" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="account"
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
                  name="video-generator"
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
