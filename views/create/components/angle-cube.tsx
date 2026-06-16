import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Svg, { Polygon, Path as SvgPath, Text as SvgText } from 'react-native-svg'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { theme } from '@/constants/theme'
import type { ProductAngleKey } from '@/lib/api'

const ACCENT = '#F59E0B'
const LABELS: Record<ProductAngleKey, string> = {
  front: 'Frente', back: 'Detrás', left: 'Izq.', right: 'Der.', top: 'Arriba', bottom: 'Abajo',
}
// The four side faces in clockwise order as the cube yaws.
const SIDES: ProductAngleKey[] = ['front', 'right', 'back', 'left']

// Isometric cube face polygons (viewBox 0 0 220 232).
const FACE_PTS = {
  top: '110,28 186,70 110,112 34,70',
  left: '34,70 110,112 110,204 34,162',
  right: '186,70 110,112 110,204 186,162',
}
const FACE_CENTER = { top: { x: 110, y: 70 }, left: { x: 72, y: 138 }, right: { x: 148, y: 138 } }

/**
 * Interactive isometric "view cube" — rotate it to bring any side to the
 * front, tap a face to toggle that angle. The universal 3D-gizmo pattern,
 * much clearer than an unfolded net. Front is the locked hero.
 */
export function AngleCube({
  selected,
  onToggle,
}: {
  selected: ProductAngleKey[]
  onToggle: (key: ProductAngleKey) => void
}) {
  const [yaw, setYaw] = useState(0)
  const [flip, setFlip] = useState(false)
  const spin = useSharedValue(0)

  const rightKey = SIDES[yaw % 4]
  const leftKey = SIDES[(yaw + 3) % 4]
  const topKey: ProductAngleKey = flip ? 'bottom' : 'top'
  const visible: { pos: 'top' | 'left' | 'right'; key: ProductAngleKey }[] = [
    { pos: 'top', key: topKey },
    { pos: 'left', key: leftKey },
    { pos: 'right', key: rightKey },
  ]

  const isSel = (k: ProductAngleKey) => selected.includes(k)

  const rotate = (dir: 1 | -1) => {
    setYaw((y) => (y + dir + 4) % 4)
    spin.value = dir * 38
    spin.value = withTiming(0, { duration: 280 })
  }
  const doFlip = () => {
    setFlip((f) => !f)
    spin.value = 26
    spin.value = withTiming(0, { duration: 280 })
  }

  const aStyle = useAnimatedStyle(() => ({ transform: [{ perspective: 800 }, { rotateY: `${spin.value}deg` }] }))

  const FILL_OFF = { top: 'rgba(255,255,255,0.10)', left: 'rgba(255,255,255,0.035)', right: 'rgba(255,255,255,0.065)' }
  const FILL_ON = { top: 'rgba(245,158,11,0.95)', left: 'rgba(190,120,8,0.95)', right: 'rgba(217,140,10,0.95)' }

  const selectedKeys = ([...SIDES, 'top', 'bottom'] as ProductAngleKey[]).filter((k) => isSel(k))

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.stage, aStyle]}>
        <Svg width={200} height={210} viewBox="0 0 220 232">
          {visible.map(({ pos, key }) => {
            const on = isSel(key)
            return (
              <Polygon
                key={pos}
                points={FACE_PTS[pos]}
                fill={on ? FILL_ON[pos] : FILL_OFF[pos]}
                stroke={on ? ACCENT : 'rgba(255,255,255,0.22)'}
                strokeWidth={on ? 2 : 1.5}
                strokeLinejoin="round"
                onPress={() => onToggle(key)}
              />
            )
          })}
          {visible.map(({ pos, key }) => {
            const on = isSel(key)
            const c = FACE_CENTER[pos]
            return (
              <SvgText
                key={`t-${pos}`}
                x={c.x}
                y={c.y + 4}
                fontSize={13}
                fontWeight="700"
                fill={on ? '#1A1330' : 'rgba(248,250,252,0.85)'}
                textAnchor="middle"
                onPress={() => onToggle(key)}
              >
                {LABELS[key]}{key === 'front' ? ' ●' : ''}
              </SvgText>
            )
          })}
        </Svg>
      </Animated.View>

      {/* Rotation controls */}
      <View style={styles.controls}>
        <Pressable style={styles.ctrlBtn} onPress={() => rotate(-1)} hitSlop={8}><Text style={styles.ctrlIcon}>‹</Text></Pressable>
        <Pressable style={styles.flipBtn} onPress={doFlip}><Text style={styles.flipText}>{flip ? 'Ver arriba' : 'Ver abajo'}</Text></Pressable>
        <Pressable style={styles.ctrlBtn} onPress={() => rotate(1)} hitSlop={8}><Text style={styles.ctrlIcon}>›</Text></Pressable>
      </View>

      <Text style={styles.hint}>Gira el cubo y toca un lado para elegir ese ángulo</Text>

      {/* Selected summary */}
      <View style={styles.summary}>
        {selectedKeys.map((k) => (
          <View key={k} style={styles.pill}>
            <Text style={styles.pillText}>{LABELS[k]}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: 10, paddingVertical: 6 },
  stage: { alignItems: 'center', justifyContent: 'center' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ctrlBtn: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: theme.colors.borderStrong,
    backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center',
  },
  ctrlIcon: { color: theme.colors.text, fontSize: 26, lineHeight: 28, marginTop: -2 },
  flipBtn: {
    height: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: theme.colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center',
  },
  flipText: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '600' },
  hint: { fontSize: 12, color: theme.colors.textDim, textAlign: 'center' },
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  pill: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
    backgroundColor: 'rgba(245,158,11,0.16)', borderWidth: 1, borderColor: ACCENT,
  },
  pillText: { color: ACCENT, fontSize: 12, fontWeight: '600' },
})
