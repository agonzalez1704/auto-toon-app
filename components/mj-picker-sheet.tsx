/**
 * MjPickerSheet — bottom-sheet modal for picking one MJ kit option.
 *
 * Uses a native Modal + FlatList (virtualized for 50+ items per UI/UX Pro Max).
 * Touch targets ≥48pt, 8pt+ spacing, haptic on select, swipe-to-dismiss backdrop,
 * aria/accessibility labels, safe-area aware.
 */
import { useCallback, useMemo } from 'react'
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import type { MjKitOption } from '@/lib/mj-photo-kit'

const BG = '#1F3E6F'               // slightly lighter than panel BG for visual layering
const BG_OVERLAY = 'rgba(8,18,38,0.72)'
const CYAN = '#06B6D4'
const MUTED = 'rgba(255,255,255,0.55)'
const BORDER = 'rgba(255,255,255,0.08)'

export interface MjPickerSheetProps {
  visible: boolean
  title: string
  subtitle?: string
  options: MjKitOption[]
  selectedId?: string
  onSelect: (id: string) => void
  onClose: () => void
}

export function MjPickerSheet({
  visible,
  title,
  subtitle,
  options,
  selectedId,
  onSelect,
  onClose,
}: MjPickerSheetProps) {
  const insets = useSafeAreaInsets()

  const handleSelect = useCallback(
    (id: string) => {
      if (Platform.OS === 'ios') {
        Haptics.selectionAsync().catch(() => {})
      }
      onSelect(id)
      onClose()
    },
    [onSelect, onClose]
  )

  const data = useMemo(() => options, [options])

  const renderItem = useCallback(
    ({ item }: { item: MjKitOption }) => {
      const active = item.id === (selectedId ?? 'none')
      return (
        <TouchableOpacity
          style={[styles.row, active && styles.rowActive]}
          onPress={() => handleSelect(item.id)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          accessibilityHint={item.blurb}
          accessibilityState={{ selected: active }}
        >
          <View style={styles.rowBody}>
            <Text style={[styles.rowLabel, active && styles.rowLabelActive]} numberOfLines={1}>
              {item.label}
            </Text>
            {item.blurb ? (
              <Text style={styles.rowBlurb} numberOfLines={2}>
                {item.blurb}
              </Text>
            ) : null}
          </View>
          <View style={[styles.radio, active && styles.radioActive]}>
            {active ? <View style={styles.radioDot} /> : null}
          </View>
        </TouchableOpacity>
      )
    },
    [selectedId, handleSelect]
  )

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop — tap to dismiss */}
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityLabel="Close picker"
        accessibilityRole="button"
      />

      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        {/* Grabber */}
        <View style={styles.grabberWrap}>
          <View style={styles.grabber} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={12}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <Text style={styles.closeTxt}>Done</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          windowSize={10}
          removeClippedSubviews
        />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: BG_OVERLAY,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '80%',
    backgroundColor: BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: BORDER,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
  },
  grabberWrap: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 12,
    color: MUTED,
    marginTop: 3,
  },
  closeBtn: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    minHeight: 44,
    justifyContent: 'center',
  },
  closeTxt: {
    fontSize: 15,
    fontWeight: '600',
    color: CYAN,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 56,
    borderRadius: 12,
    gap: 12,
  },
  rowActive: {
    backgroundColor: 'rgba(6,182,212,0.12)',
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rowLabelActive: {
    color: CYAN,
  },
  rowBlurb: {
    fontSize: 12,
    color: MUTED,
    lineHeight: 16,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginHorizontal: 12,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: CYAN,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: CYAN,
  },
})
