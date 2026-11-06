import { Stack } from 'expo-router'
import { theme } from '@/constants/theme'
import TrabajosScreen from '@/views/estudio/trabajos-screen'

export default function Trabajos() {
  return (
    <>
      <Stack.Screen
        options={{ headerShown: true, title: 'Trabajos', headerStyle: { backgroundColor: theme.colors.bg }, headerTintColor: theme.colors.text, headerShadowVisible: false, headerBackTitle: 'Atrás' }}
      />
      <TrabajosScreen />
    </>
  )
}
