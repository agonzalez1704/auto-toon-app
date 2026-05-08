import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { theme } from '@/constants/theme'
import { AI_MODELS, type ImageModelId } from '@/stores/use-product-enhancer-store'
import { ASPECT_RATIOS, VISIBLE_MODELS } from '../data'
import { AspectRatioIcon, GeminiIcon, IdeogramIcon, MidjourneyIcon } from '../icons'

interface ModelToggleProps {
  selectedModel: ImageModelId
  onSelect: (id: ImageModelId) => void
  selectedAspect: string
  onSelectAspect: (value: string) => void
}

export function ModelToggle({
  selectedModel,
  onSelect,
  selectedAspect,
  onSelectAspect,
}: ModelToggleProps) {
  const ProviderIcon =
    selectedModel === 'MIDJOURNEY_V7'
      ? MidjourneyIcon
      : selectedModel.startsWith('IDEOGRAM')
      ? IdeogramIcon
      : GeminiIcon

  return (
    <>
      <View style={styles.toggle}>
        {VISIBLE_MODELS.map(({ id, label }) => {
          const active = selectedModel === id
          return (
            <TouchableOpacity
              key={id}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => onSelect(id)}
              activeOpacity={0.7}
              hitSlop={theme.hitSlop(4)}
              accessibilityLabel={`Model ${label}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.aspectRow}
      >
        {ASPECT_RATIOS.map((ratio) => {
          const active = selectedAspect === ratio.value
          return (
            <TouchableOpacity
              key={ratio.value}
              style={[styles.aspectPill, active && styles.aspectPillActive]}
              onPress={() => onSelectAspect(ratio.value)}
              activeOpacity={0.7}
              accessibilityLabel={`Aspect ratio ${ratio.value}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <AspectRatioIcon
                w={ratio.w}
                h={ratio.h}
                color={active ? theme.palette.violet : 'rgba(255,255,255,0.5)'}
              />
              <Text style={[styles.aspectPillText, active && styles.aspectPillTextActive]}>
                {ratio.value}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      <View style={styles.poweredByRow}>
        <ProviderIcon size={13} />
        <Text style={styles.poweredByText}>Powered by {AI_MODELS[selectedModel].name}</Text>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  toggle: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: theme.glass.tintLow,
    borderRadius: theme.radius.sm,
    padding: 3,
    marginBottom: theme.spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.glass.border,
  },
  pill: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
    minHeight: 36,
    borderRadius: theme.radius.sm - 2,
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: theme.colors.accentSoft,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textDisabled,
  },
  pillTextActive: {
    color: theme.colors.text,
  },
  aspectRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  aspectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    minHeight: 44,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.glass.border,
  },
  aspectPillActive: {
    borderColor: theme.colors.accentBorder,
    backgroundColor: theme.colors.accentSoft,
  },
  aspectPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textDisabled,
  },
  aspectPillTextActive: {
    color: theme.colors.text,
  },
  poweredByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginBottom: theme.spacing.lg,
  },
  poweredByText: {
    fontSize: 11,
    color: theme.colors.textDisabled,
    fontWeight: '500',
  },
})
