import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { theme, gradients } from '@/constants/theme'
import { SparklesIcon } from '../icons'

interface GenerateButtonProps {
  canGenerate: boolean
  isGenerating: boolean
  costLabel: string
  onPress: () => void
}

export function GenerateButton({ canGenerate, isGenerating, costLabel, onPress }: GenerateButtonProps) {
  const showGradient = canGenerate && !isGenerating
  return (
    <TouchableOpacity
      style={[styles.button, !canGenerate && styles.disabled, isGenerating && { opacity: 0.7 }]}
      onPress={onPress}
      disabled={!canGenerate || isGenerating}
      activeOpacity={0.85}
      accessibilityLabel={isGenerating ? 'Generating' : `Generate, costs ${costLabel}`}
      accessibilityRole="button"
      accessibilityState={{ disabled: !canGenerate || isGenerating }}
    >
      {showGradient && (
        <LinearGradient
          colors={[...gradients.amberCta]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      )}
      {isGenerating ? (
        <View style={styles.row}>
          <ActivityIndicator color="#1A1330" size="small" />
          <Text style={[styles.text, { color: '#1A1330' }]}>Generating...</Text>
        </View>
      ) : (
        <View style={styles.row}>
          <SparklesIcon size={20} color="#1A1330" />
          <Text style={[styles.text, { color: '#1A1330' }]}>Generate ({costLabel})</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 18,
    minHeight: 56,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
  },
  disabled: {
    backgroundColor: theme.glass.tintLow,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  text: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
  },
})
