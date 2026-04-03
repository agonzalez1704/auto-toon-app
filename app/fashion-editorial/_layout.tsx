import { Stack } from 'expo-router'

export default function FashionEditorialLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0F0F13' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="clothing" />
      <Stack.Screen name="makeup" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="hairstyle" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="generate" />
      <Stack.Screen name="campaign" />
    </Stack>
  )
}
