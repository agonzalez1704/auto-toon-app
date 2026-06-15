import { Pressable, StyleSheet, Text, View } from 'react-native'
import { theme } from '@/constants/theme'
import type { ProductAngleKey } from '@/lib/api'

const ACCENT = '#F59E0B'

/**
 * Multi-Angle selector — an unfolded-cube "net": 6 tappable faces laid out as
 * a cross so every angle is reachable on a phone (a true rotatable 3D cube
 * isn't practical in RN — no preserve-3d). Front is the locked hero.
 */
const LAYOUT: { key: ProductAngleKey; label: string; col: number; row: number }[] = [
  { key: 'top', label: 'Top', col: 1, row: 0 },
  { key: 'left', label: 'Left', col: 0, row: 1 },
  { key: 'front', label: 'Front', col: 1, row: 1 },
  { key: 'right', label: 'Right', col: 2, row: 1 },
  { key: 'back', label: 'Back', col: 3, row: 1 },
  { key: 'bottom', label: 'Bottom', col: 1, row: 2 },
]

export function AngleCube({
  selected,
  onToggle,
}: {
  selected: ProductAngleKey[]
  onToggle: (key: ProductAngleKey) => void
}) {
  return (
    <View style={styles.grid}>
      {[0, 1, 2].map((row) => (
        <View key={row} style={styles.row}>
          {[0, 1, 2, 3].map((col) => {
            const face = LAYOUT.find((f) => f.row === row && f.col === col)
            if (!face) return <View key={col} style={styles.cell} />
            const on = selected.includes(face.key)
            const locked = face.key === 'front'
            return (
              <Pressable
                key={col}
                disabled={locked}
                onPress={() => onToggle(face.key)}
                style={({ pressed }) => [styles.cell, styles.face, on && styles.faceOn, pressed && !locked && { opacity: 0.7 }]}
              >
                <Text style={[styles.glyph, on && styles.glyphOn]}>{locked ? '🔒' : on ? '✓' : '+'}</Text>
                <Text style={[styles.label, on && styles.glyphOn]}>{face.label}</Text>
              </Pressable>
            )
          })}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: { alignItems: 'center', gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  cell: { width: 66, height: 66 },
  face: {
    borderRadius: 12, borderWidth: 1, borderColor: theme.colors.borderStrong,
    backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  faceOn: { borderWidth: 2, borderColor: ACCENT, backgroundColor: 'rgba(245,158,11,0.14)' },
  glyph: { fontSize: 16, color: theme.colors.textMuted },
  glyphOn: { color: ACCENT },
  label: { fontSize: 11, fontWeight: '600', color: theme.colors.textMuted },
})
