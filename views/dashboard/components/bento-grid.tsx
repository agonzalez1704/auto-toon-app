import { theme } from '@/constants/theme'
import { LinearGradient } from 'expo-linear-gradient'
import { Dimensions, Platform, Image as RNImage, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import type { BentoCardConfig } from '../data'

const SCREEN_WIDTH = Dimensions.get('window').width
const CARD_WIDTH = (SCREEN_WIDTH - theme.spacing.lg * 2 - theme.spacing.sm) / 2

interface BentoCardProps extends BentoCardConfig {
  onPress: () => void
}

function BentoCard({
  label,
  description,
  preview,
  backgroundImage,
  gradient,
  accent,
  pro,
  onPress,
}: BentoCardProps) {
  // bg image owns the full bleed. Gradient becomes a bottom scrim
  // (transparent top → tinted bottom) so image reads cleanly.
  const bgSource = backgroundImage ?? preview
  // Subtle drop shadow only — accent glow removed (visual restraint)
  const accentGlow = Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10 },
    android: { elevation: 4 },
    default: {},
  })
  // Outer = shadow host (no clip). Inner = clipping surface (border + image).
  // RN clips shadows when overflow:'hidden' is on the same view as shadow.
  return (
    <TouchableOpacity
      style={[styles.cardOuter, accentGlow]}
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityRole="button"
    >
      <View style={[styles.cardInner, { borderColor: theme.colors.border }]}>
        {/* Layer 1: full-bleed image */}
        <RNImage
          source={bgSource}
          style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
          resizeMode="cover"
        />

        {/* Layer 2: bottom scrim — transparent top 45%, brand gradient bottom */}
        <LinearGradient
          colors={['rgba(0,0,0,0)', gradient[0], gradient[1]]}
          locations={[0.45, 0.78, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Layer 3: top-left accent stripe */}
        <View
          style={[styles.accentStripe, { backgroundColor: accent }]}
          pointerEvents="none"
        />

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.label} numberOfLines={1}>
              {label}
            </Text>
            {pro && (
              <View style={[styles.proBadge, { backgroundColor: accent }]}>
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            )}
          </View>
          <Text style={styles.desc} numberOfLines={1}>
            {description}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

interface BentoGridProps {
  cards: BentoCardConfig[]
  onCardPress: (route: string) => void
}

export function BentoGrid({ cards, onCardPress }: BentoGridProps) {
  return (
    <View style={styles.grid}>
      {cards.map((card) => (
        <BentoCard key={card.label} {...card} onPress={() => onCardPress(card.route)} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  cardOuter: {
    width: CARD_WIDTH,
    height: 176,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.bgRaised,
    // shadow lives here — no overflow clip so glow renders
  },
  cardInner: {
    flex: 1,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    // borderColor set inline per-card (accent)
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
    flexShrink: 1,
    letterSpacing: -0.2,
  },
  proBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.accent, // amber — primary
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.30)',
  },
  proBadgeText: {
    ...theme.typography.badge,
    color: '#1A1330',
  },
  desc: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  accentStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 4,
    height: 36,
    borderTopLeftRadius: theme.radius.lg,
    borderBottomRightRadius: 2,
  },
})
