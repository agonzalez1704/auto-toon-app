import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { theme, gradients } from '@/constants/theme'
import type { GoalId } from '@/stores/use-product-enhancer-store'
import { getResultLabel } from '../data'

interface ResultViewProps {
  productName: string
  heroImageUrl: string | null
  vignetteImageUrl: string | null
  goalId: GoalId | null
  onZoom: (initialIndex: 0 | 1) => void
  onAgain: () => void
}

export function ResultView({
  productName,
  heroImageUrl,
  vignetteImageUrl,
  goalId,
  onZoom,
  onAgain,
}: ResultViewProps) {
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
})
