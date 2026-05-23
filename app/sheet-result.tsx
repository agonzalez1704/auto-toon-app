import { useCallback, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
  Share,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as FileSystem from 'expo-file-system/legacy'
import * as MediaLibrary from 'expo-media-library'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Path as SvgPath, Rect } from 'react-native-svg'

const { width: SCREEN_W } = Dimensions.get('window')

// ─── SVG Icons ──────────────────────────────────────────────────────────

function CloseIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M18 6L6 18M6 6l12 12"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function DownloadIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function ShareIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function CheckIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M20 6L9 17l-5-5"
        stroke="#FFFFFF"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function SparkleIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z"
        fill="#FBBF24"
        stroke="none"
      />
    </Svg>
  )
}

// ─── Screen ─────────────────────────────────────────────────────────────

export default function SheetResultScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{
    sheetUrl?: string
    modelName?: string
    modelId?: string
  }>()

  const sheetUrl = params.sheetUrl || ''
  const modelName = params.modelName || 'Model'
  const [saving, setSaving] = useState(false)

  const handleSave = useCallback(async () => {
    if (!sheetUrl) return
    setSaving(true)
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Allow photo library access to save the sheet.')
        return
      }
      const safeName = modelName.replace(/[^a-z0-9-_ ]/gi, '').trim() || 'character-sheet'
      const filename = `${safeName}-${Date.now()}.png`
      const fileUri = `${FileSystem.cacheDirectory}${filename}`
      await FileSystem.downloadAsync(sheetUrl, fileUri)
      await MediaLibrary.saveToLibraryAsync(fileUri)
      Alert.alert('Saved', 'Character sheet saved to your photo library.')
    } catch (error) {
      console.error('Save sheet error:', error)
      Alert.alert('Error', 'Failed to save character sheet.')
    } finally {
      setSaving(false)
    }
  }, [sheetUrl, modelName])

  const handleShare = useCallback(async () => {
    if (!sheetUrl) return
    try {
      if (Platform.OS === 'ios') {
        await Share.share({ url: sheetUrl })
      } else {
        await Share.share({ message: sheetUrl })
      }
    } catch {
      // user cancelled
    }
  }, [sheetUrl])

  const handleDone = useCallback(() => {
    router.replace('/models')
  }, [router])

  if (!sheetUrl) {
    router.back()
    return null
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <CloseIcon />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <View style={styles.headerTitleRow}>
              <SparkleIcon />
              <Text style={styles.headerTitle}>Character Sheet Ready</Text>
            </View>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {modelName}
            </Text>
          </View>
          <View style={styles.iconBtnSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.sheetWrap}>
            <Image
              source={{ uri: sheetUrl }}
              style={styles.sheet}
              contentFit="contain"
              transition={200}
            />
          </View>

          <Text style={styles.hint}>
            This sheet is your model&apos;s identity anchor — it&apos;s reused for every generation to
            keep the character consistent across scenes.
          </Text>
        </ScrollView>

        {/* Actions */}
        <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionPill}
              onPress={handleSave}
              activeOpacity={0.8}
              disabled={saving}
            >
              <LinearGradient
                colors={['#FBBF24', '#F59E0B', '#B45309']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <DownloadIcon />}
              <Text style={styles.actionText}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionPillGhost} onPress={handleShare} activeOpacity={0.8}>
              <ShareIcon />
              <Text style={styles.actionText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionPillGhost} onPress={handleDone} activeOpacity={0.8}>
              <CheckIcon />
              <Text style={styles.actionText}>Done</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </SafeAreaView>
    </View>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B1220' },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnSpacer: { width: 40 },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
    maxWidth: SCREEN_W - 120,
  },

  scroll: { padding: 16, paddingBottom: 24, alignItems: 'center', gap: 16 },
  sheetWrap: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  sheet: { width: '100%', aspectRatio: 1 },
  hint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },

  bottomBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  actionsRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionPillGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  actionText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
})
