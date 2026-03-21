import { Stack } from 'expo-router'

export default function AccountLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Account' }} />
      <Stack.Screen name="pricing" options={{ title: 'Plans' }} />
      <Stack.Screen name="credits" options={{ title: 'Buy Credits' }} />
    </Stack>
  )
}
