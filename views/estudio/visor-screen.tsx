import { View } from 'react-native'
import { Text } from '@/components/text'
import { theme } from '@/constants/theme'

/** Placeholder until the Visor board is ported. Params: `ids` (JSON string[] of piece ids), `i` (initial index). */
export default function VisorScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: theme.colors.textDim }}>Visor</Text>
    </View>
  )
}
