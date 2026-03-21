import { useColorScheme } from 'react-native'
import Colors from '@/constants/Colors'

/** Returns the themed color set, defaulting to dark mode */
export function useThemeColors() {
  const scheme = useColorScheme()
  return Colors[scheme === 'light' ? 'light' : 'dark']
}
