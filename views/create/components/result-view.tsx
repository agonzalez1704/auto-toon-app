import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { theme, gradients } from '@/constants/theme'
import type { GoalId, SecondImageType } from '@/stores/use-product-enhancer-store'
import { getResultLabel } from '../data'

interface ResultViewProps {
  productName: string
  heroImageUrl: string | null
  vignetteImageUrl: string | null
  goalId: GoalId | null
  // What the server actually generated — decides whether the grid picker is offered
  secondImageType?: SecondImageType | null
  onUpscaleGrid?: () => void
  onZoom: (initialIndex: 0 | 1) => void
  onAgain: () => void
}

export function ResultView({
  productName,
  heroImageUrl,
  vignetteImageUrl,
  goalId,
  secondImageType,
  onUpscaleGrid,
  onZoom,
  onAgain,
}: ResultViewProps) {
  const showGridUpscale = secondImageType === '3x3' && !!vignetteImageUrl && !!onUpscaleGrid
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{productName}</Text>

          {heroImageUrl && (
            <ResultPanel
              label="Hero Image"
              imageUrl={heroImageUrl}
              onPress={() => onZoom(0)}
            />
          )}

          {vignetteImageUrl && (
            <ResultPanel
              label={getResultLabel(goalId)}
              imageUrl={vignetteImageUrl}
              onPress={() => onZoom(heroImageUrl ? 1 : 0)}
            />
          )}

          {showGridUpscale && (
            <TouchableOpacity
              style={styles.upscale}
              onPress={onUpscaleGrid}
              activeOpacity={0.85}
              accessibilityLabel="Pick images from the grid to upscale"
              accessibilityRole="button"
            >
              <Text style={styles.upscaleText}>Upscale Grid Images</Text>
              <Text style={styles.upscaleHint}>Pick which photos to enhance · charged per image</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.again}
            onPress={onAgain}
            activeOpacity={0.85}
            accessibilityLabel="Enhance another"
            accessibilityRole="button"
          >
            <LinearGradient
              colors={[...gradients.brand]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
            <Text style={styles.againText}>Enhance Another</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

interface ResultPanelProps {
  label: string
  imageUrl: string
  onPress: () => void
}

function ResultPanel({ label, imageUrl, onPress }: ResultPanelProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} accessibilityLabel={`View ${label} full size`}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          contentFit="contain"
          transition={300}
        />
        <Text style={styles.tap}>Tap to zoom</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  safeArea: { flex: 1 },
  content: { padding: theme.spacing.lg, paddingBottom: 120 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: theme.spacing.xl,
    color: theme.colors.text,
  },
  section: { marginBottom: theme.spacing.xl },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
    color: theme.colors.textDim,
  },
  image: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: theme.radius.lg,
  },
  tap: {
    textAlign: 'center',
    fontSize: 12,
    color: theme.colors.textDisabled,
    marginTop: theme.spacing.xs,
  },
  again: {
    paddingVertical: 18,
    minHeight: 56,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  againText: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
  },
  upscale: {
    paddingVertical: 14,
    minHeight: 56,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  upscaleText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  upscaleHint: {
    fontSize: 12,
    color: theme.colors.textDim,
    marginTop: 2,
  },
})
