import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import Svg, { Path as SvgPath } from 'react-native-svg'
import { theme } from '@/constants/theme'

/**
 * Unified garment input — one card combining every way to add a garment:
 *   • Gallery / Camera pickers
 *   • Paste image from the clipboard
 *   • Product URL → scraped server-side (inline row, divider-separated)
 *
 * Mirrors the web GarmentInput. The screen owns the actual upload/scrape
 * logic; this component just renders the affordances and reports intent.
 */
const VIOLET = '#8B5CF6'

function Icon({ d, color = theme.colors.text }: { d: string; color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <SvgPath d={d} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export function GarmentInput({
  onGallery,
  onCamera,
  onPaste,
  onUrl,
  uploading,
  scraping,
}: {
  onGallery: () => void
  onCamera: () => void
  onPaste: () => void
  onUrl: (url: string) => void
  uploading: boolean
  scraping: boolean
}) {
  const [url, setUrl] = useState('')
  const busy = uploading || scraping

  const submit = () => {
    const u = url.trim()
    if (!u || scraping) return
    onUrl(u)
    setUrl('')
  }

  return (
    <View style={styles.card}>
      {/* Source buttons */}
      <View style={styles.row}>
        <Pressable style={styles.srcBtn} disabled={busy} onPress={onGallery}>
          {uploading ? (
            <ActivityIndicator color={theme.colors.text} size="small" />
          ) : (
            <>
              <Icon d="M3 16l5-5 4 4 3-3 6 6M3 5h18v14H3z" />
              <Text style={styles.srcLabel}>Gallery</Text>
            </>
          )}
        </Pressable>
        <Pressable style={styles.srcBtn} disabled={busy} onPress={onCamera}>
          <Icon d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z M12 17a4 4 0 100-8 4 4 0 000 8z" />
          <Text style={styles.srcLabel}>Camera</Text>
        </Pressable>
        <Pressable style={styles.srcBtn} disabled={busy} onPress={onPaste}>
          <Icon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2 M9 5a2 2 0 002 2h2a2 2 0 002-2 M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          <Text style={styles.srcLabel}>Paste</Text>
        </Pressable>
      </View>

      {/* Divider */}
      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>OR PASTE A LINK</Text>
        <View style={styles.line} />
      </View>

      {/* Product URL row */}
      <View style={styles.urlRow}>
        <View style={styles.urlField}>
          <Icon d="M10 13a5 5 0 007.07 0l3-3a5 5 0 00-7.07-7.07l-1.72 1.71 M14 11a5 5 0 00-7.07 0l-3 3a5 5 0 007.07 7.07l1.71-1.71" color={theme.colors.textDim} />
          <TextInput
            style={styles.urlInput}
            value={url}
            onChangeText={setUrl}
            placeholder="store.com/product/…"
            placeholderTextColor={theme.colors.textDisabled}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
            onSubmitEditing={submit}
            editable={!scraping}
          />
        </View>
        <Pressable style={[styles.fetchBtn, (scraping || !url.trim()) && { opacity: 0.4 }]} disabled={scraping || !url.trim()} onPress={submit}>
          {scraping ? <ActivityIndicator color="#fff" size="small" /> : (
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none"><SvgPath d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>
          )}
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 12, gap: 12 },
  row: { flexDirection: 'row', gap: 10 },
  srcBtn: {
    flex: 1, height: 64, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.borderStrong,
    backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  srcLabel: { color: theme.colors.text, fontSize: 12, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  line: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  dividerText: { fontSize: 9, letterSpacing: 1, color: theme.colors.textDim },
  urlRow: { flexDirection: 'row', gap: 8 },
  urlField: {
    flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border,
    backgroundColor: 'rgba(0,0,0,0.2)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8,
  },
  urlInput: { flex: 1, color: theme.colors.text, fontSize: 14, paddingVertical: 0 },
  fetchBtn: { width: 48, height: 44, borderRadius: 12, backgroundColor: VIOLET, alignItems: 'center', justifyContent: 'center' },
})
