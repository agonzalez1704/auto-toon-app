import { useEffect } from 'react'
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { useFonts } from 'expo-font'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { ClerkProvider, ClerkLoaded, useAuth } from '@clerk/clerk-expo'
import { QueryClientProvider } from '@tanstack/react-query'
import { useColorScheme } from 'react-native'

import { CONFIG } from '@/lib/config'
import { tokenCache } from '@/lib/clerk-token-cache'
import { setTokenGetter } from '@/lib/api'
import { queryClient } from '@/lib/query'
import { useOnboardingStore } from '@/stores/use-onboarding-store'

export { ErrorBoundary } from 'expo-router'

SplashScreen.preventAutoHideAsync()

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const segments = useSegments()
  const router = useRouter()
  const onboardingCompleted = useOnboardingStore((s) => s.completed)

  // Wire Clerk's getToken to the API client
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      setTokenGetter(getToken)
    }
  }, [isLoaded, isSignedIn, getToken])

  // Redirect based on auth + onboarding state
  useEffect(() => {
    if (!isLoaded) return

    const inOnboarding = segments[0] === '(onboarding)'
    const inAuthGroup = segments[0] === '(auth)'

    if (!onboardingCompleted && !isSignedIn && !inOnboarding) {
      // First launch — show onboarding
      router.replace('/(onboarding)')
    } else if (onboardingCompleted && !isSignedIn && !inAuthGroup) {
      // Onboarding done but not signed in — go to auth
      router.replace('/(auth)/sign-in')
    } else if (isSignedIn && (inAuthGroup || inOnboarding)) {
      // Signed in — go to main app
      router.replace('/(tabs)')
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
                  name="create"
                  options={{ headerShown: false, presentation: 'card' }}
                />
                <Stack.Screen
                  name="account"
                  options={{ headerShown: false, presentation: 'card' }}
                />
              </Stack>
            </AuthGate>
          </ThemeProvider>
        </QueryClientProvider>
      </ClerkLoaded>
    </ClerkProvider>
  )
}
