import { Stack } from 'expo-router'
import { theme } from '@/constants/theme'

export default function AccountLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.bg },
        headerTintColor: theme.colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Cuenta' }} />
      <Stack.Screen name="saldo" options={{ title: 'Saldo' }} />
      <Stack.Screen name="pricing" options={{ title: 'Planes' }} />
      <Stack.Screen name="credits" options={{ title: 'Comprar créditos' }} />
    </Stack>
  )
}
