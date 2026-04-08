import { CONFIG } from '@/lib/config'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useRef, useState } from 'react'
import {
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import Svg, { Path as SvgPath } from 'react-native-svg'

// ─── Layout Constants ────────────────────────────────────────────────────────

const { width: SCREEN_W } = Dimensions.get('window')
const CARD_W = SCREEN_W * 0.72
const CARD_GAP = 12
const CARD_SNAP = CARD_W + CARD_GAP

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CarouselPickerItem {
  id: string
  label: string
  description: string
  /** Image filename served from API /previews/ — e.g. "relight-backlight-halo.jpg" */
  preview: string
  /** Optional accent color for selected state */
  color?: string
}

interface CarouselPickerModalProps {
  visible: boolean
  onClose: () => void
  title: string
  items: CarouselPickerItem[]
  selectedId: string | null
  onSelect: (id: string) => void
  /** Initial index to scroll to when opening */
  initialIndex?: number
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CarouselPickerModal({
  visible,
  onClose,
  title,
  items,
  selectedId,
  onSelect,
  initialIndex,
}: CarouselPickerModalProps) {
  const listRef = useRef<FlatList>(null)
  const [activeIndex, setActiveIndex] = useState(initialIndex ?? 0)

  const handleSelect = (id: string) => {
    onSelect(id)
    onClose()
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      onShow={() => {
        const idx = initialIndex ?? items.findIndex((i) => i.id === selectedId)
        if (idx > 0) {
          setTimeout(() => {
            listRef.current?.scrollToIndex({ index: idx, animated: false })
          }, 50)
        }
      }}
    >
      {/* Backdrop */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <View />
      </TouchableOpacity>

      {/* Sheet */}
      <View style={styles.sheet}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <SvgPath
                d="M18 6L6 18M6 6l12 12"
                stroke="rgba(255,255,255,0.6)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </Svg>
          </TouchableOpacity>
        </View>

        {/* Carousel */}
        <FlatList
          ref={listRef}
          data={items}
          horizontal
          pagingEnabled={false}
          snapToInterval={CARD_SNAP}
          snapToAlignment="start"
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: (SCREEN_W - CARD_W) / 2,
          }}
          ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
          getItemLayout={(_, index) => ({
            length: CARD_SNAP,
            offset: CARD_SNAP * index,
            index,
          })}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(
              e.nativeEvent.contentOffset.x / CARD_SNAP
            )
            setActiveIndex(
              Math.max(0, Math.min(idx, items.length - 1))
            )
          }}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isSelected = selectedId === item.id
            const borderColor = isSelected
              ? item.color ?? '#FBBF24'
              : 'rgba(255,255,255,0.08)'

            return (
              <View
                style={[styles.card, { borderColor }]}
              >
                <Image
                  source={{
                    uri: `${CONFIG.API_BASE_URL}/previews/${item.preview}`,
                  }}
                  style={styles.previewImage}
                  contentFit="cover"
                  transition={200}
                />
                <View style={styles.cardInfo}>
                  <View style={styles.cardTitleRow}>
                    {item.color && (
                      <View
                        style={[
                          styles.colorDot,
                          { backgroundColor: item.color },
                        ]}
                      />
                    )}
                    <Text style={styles.cardTitle}>{item.label}</Text>
                  </View>
                  <Text style={styles.cardDesc}>{item.description}</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.selectBtn,
                    isSelected && {
                      backgroundColor: 'rgba(251,191,36,0.12)',
                      borderWidth: 1,
                      borderColor: item.color ?? '#FBBF24',
                    },
                  ]}
                  onPress={() => handleSelect(item.id)}
                  activeOpacity={0.8}
                >
                  {isSelected ? (
                    <Text style={styles.selectBtnText}>Selected</Text>
                  ) : (
                    <>
                      <LinearGradient
                        colors={['#FBBF24', '#F59E0B', '#B45309']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFillObject}
                      />
                      <Text style={styles.selectBtnText}>Select</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )
          }}
        />

        {/* Dot indicators */}
        <View style={styles.dots}>
          {items.map((item, i) => (
            <View
              key={item.id}
              style={[
                styles.dot,
                i === activeIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>
      </View>
    </Modal>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(25,49,83,0.75)',
  },
  sheet: {
    backgroundColor: '#162844',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Card
  card: {
    width: CARD_W,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
  },
  previewImage: {
    width: '100%',
    aspectRatio: 3 / 4,
  },
  cardInfo: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 18,
  },
  selectBtn: {
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  selectBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Dots
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 16,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    backgroundColor: '#FBBF24',
    width: 18,
  },
})
