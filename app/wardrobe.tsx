import { Stack } from 'expo-router'
import { theme } from '@/constants/theme'
import WardrobeScreen from '@/views/wardrobe/wardrobe-screen'

export default function Wardrobe() {
  return (
    <>
      <Stack.Screen
        options={{ title: 'Probador', headerStyle: { backgroundColor: theme.colors.bg }, headerTintColor: theme.colors.text, headerShadowVisible: false, headerBackTitle: 'Atrás' }}
      />
      <WardrobeScreen />
    </>
  )
}
