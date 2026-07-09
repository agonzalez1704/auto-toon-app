import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { theme, gradients } from '@/constants/theme'
import { SparklesIcon } from '../icons'

interface GenerateButtonProps {
  canGenerate: boolean
  isGenerating: boolean
  costLabel: string
  /** When true, the button swaps to a "Get more credits" CTA. The parent
   *  rewires `onPress` to open the credits-exhaustion modal / IAP flow. */
  insufficientCredits?: boolean
  /** Overrides the default "Generate ({cost})" label — e.g. a poster gate that
   *  opens the config sheet instead of generating directly. */
  label?: string
  onPress: () => void
}

export function GenerateButton({
  canGenerate,
  isGenerating,
  costLabel,
  insufficientCredits = false,
  label,
  onPress,
}: GenerateButtonProps) {
  // "Get more credits" is always tappable when shown — it ignores
  // canGenerate (the user can buy credits without finishing the form).
  const isCreditCta = insufficientCredits && !isGenerating
  const effectiveDisabled = isCreditCta ? false : !canGenerate || isGenerating
  const showGradient = isCreditCta || (canGenerate && !isGenerating)
  return (
    <TouchableOpacity
      style={[styles.button, effectiveDisabled && styles.disabled, isGenerating && { opacity: 0.7 }]}
      onPress={onPress}
      disabled={effectiveDisabled}
      activeOpacity={0.85}
      accessibilityLabel={
        isGenerating
          ? 'Generating'
          : isCreditCta
            ? 'Get more credits'
            : `Generate, costs ${costLabel}`
      }
      accessibilityRole="button"
      accessibilityState={{ disabled: effectiveDisabled }}
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
      ) : isCreditCta ? (
        <View style={styles.row}>
          <SparklesIcon size={20} color="#1A1330" />
          <Text style={[styles.text, { color: '#1A1330' }]}>Get more credits</Text>
        </View>
      ) : (
        <View style={styles.row}>
          <SparklesIcon size={20} color="#1A1330" />
          <Text style={[styles.text, { color: '#1A1330' }]}>{label ?? `Generate (${costLabel})`}</Text>
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
