import { useState } from 'react'
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { theme } from '@/constants/theme'
import { useProductEnhancerStore } from '@/stores/use-product-enhancer-store'
import type { GoalId } from '@/stores/use-product-enhancer-store'
import { CloseIcon } from '../icons'

interface CustomizeModalProps {
  visible: boolean
  goalId: GoalId | null
  onClose: () => void
}

type FontStyle = 'sans-serif' | 'serif' | 'display' | 'handwritten'

const FONT_STYLES: FontStyle[] = ['sans-serif', 'serif', 'display', 'handwritten']

/**
 * Bottom-sheet modal for customizing elements/poster goal config.
 * Reads + writes via store. Pure UI — no router or query deps.
 */
export function CustomizeModal({ visible, goalId, onClose }: CustomizeModalProps) {
  const store = useProductEnhancerStore()
  const [newElement, setNewElement] = useState('')
  const [newEnhancer, setNewEnhancer] = useState('')

  const isElements = goalId === 'elements'
  const isPoster = goalId === 'printable-poster'
  const elementsConfig = store.secondImageConfig.elementsConfig
  const posterConfig = store.secondImageConfig.posterConfig as Record<string, any> | null

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View />
      </TouchableOpacity>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>{isElements ? 'Elements Config' : 'Poster Config'}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={theme.hitSlop(12)} accessibilityLabel="Close">
            <CloseIcon />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ paddingHorizontal: theme.spacing['2xl'] }}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isElements && elementsConfig && (
            <ElementsConfig
              keyElements={elementsConfig.keyElements}
              enhancers={elementsConfig.enhancers}
              newElement={newElement}
              newEnhancer={newEnhancer}
              setNewElement={setNewElement}
              setNewEnhancer={setNewEnhancer}
              onSet={(patch) =>
                store.setSecondImageConfig({
                  elementsConfig: { ...elementsConfig, ...patch },
                })
              }
            />
          )}

          {isPoster && posterConfig && (
            <PosterConfig
              cfg={posterConfig}
              onSet={(patch) =>
                store.setSecondImageConfig({
                  posterConfig: { ...posterConfig, ...patch } as any,
                })
              }
            />
          )}
        </ScrollView>
      </View>
    </Modal>
  )
}

// ── Elements editor ────────────────────────────────────────────────────

interface ElementsProps {
  keyElements: string[]
  enhancers: string[]
  newElement: string
  newEnhancer: string
  setNewElement: (v: string) => void
  setNewEnhancer: (v: string) => void
  onSet: (patch: { keyElements?: string[]; enhancers?: string[] }) => void
}

function ElementsConfig({
  keyElements,
  enhancers,
  newElement,
  newEnhancer,
  setNewElement,
  setNewEnhancer,
  onSet,
}: ElementsProps) {
  return (
    <>
      <Text style={styles.sectionTitle}>Key Elements</Text>
      <ChipList
        items={keyElements}
        onRemove={(i) => {
          const updated = [...keyElements]
          updated.splice(i, 1)
          onSet({ keyElements: updated })
        }}
      />
      <AddRow
        value={newElement}
        onChange={setNewElement}
        placeholder="Add element..."
        onAdd={() => {
          onSet({ keyElements: [...keyElements, newElement.trim()] })
          setNewElement('')
        }}
      />

      <Text style={[styles.sectionTitle, { marginTop: theme.spacing['2xl'] }]}>Visual Enhancers</Text>
      <ChipList
        items={enhancers}
        onRemove={(i) => {
          const updated = [...enhancers]
          updated.splice(i, 1)
          onSet({ enhancers: updated })
        }}
      />
      <AddRow
        value={newEnhancer}
        onChange={setNewEnhancer}
        placeholder="Add enhancer..."
        onAdd={() => {
          onSet({ enhancers: [...enhancers, newEnhancer.trim()] })
          setNewEnhancer('')
        }}
      />
    </>
  )
}

// ── Poster editor ──────────────────────────────────────────────────────

interface PosterProps {
  cfg: Record<string, any>
  onSet: (patch: Record<string, any>) => void
}

function PosterConfig({ cfg, onSet }: PosterProps) {
  return (
    <>
      <FieldText
        label="Top Label"
        value={cfg.topLabel ?? ''}
        placeholder="e.g. NEW, SALE, OFFER"
        onChange={(v) => onSet({ topLabel: v })}
      />
      <FieldText
        label="Headline"
        value={cfg.headline ?? ''}
        placeholder="Main title"
        onChange={(v) => onSet({ headline: v })}
        marginTop
      />
      <FieldText
        label="Tagline"
        value={cfg.tagline ?? ''}
        placeholder="Subtitle or slogan"
        onChange={(v) => onSet({ tagline: v })}
        multiline
        marginTop
      />
      <FieldText
        label="Primary Color"
        value={cfg.primaryColor ?? ''}
        placeholder="e.g. vibrant blue, deep red"
        onChange={(v) => onSet({ primaryColor: v })}
        marginTop
      />

      <Text style={[styles.sectionTitle, { marginTop: theme.spacing.xl }]}>Font Style</Text>
      <View style={styles.chipWrap}>
        {FONT_STYLES.map((fs) => {
          const active = cfg.fontStyle === fs
          return (
            <TouchableOpacity
              key={fs}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onSet({ fontStyle: fs })}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{fs}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </>
  )
}

// ── Atoms ──────────────────────────────────────────────────────────────

function ChipList({ items, onRemove }: { items: string[]; onRemove: (i: number) => void }) {
  return (
    <View style={styles.chipWrap}>
      {items.map((el, i) => (
        <View key={`${i}-${el}`} style={styles.chip}>
          <Text style={styles.chipText} numberOfLines={1}>
            {el}
          </Text>
          <TouchableOpacity hitSlop={theme.hitSlop(8)} onPress={() => onRemove(i)}>
            <CloseIcon size={12} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  )
}

function AddRow({
  value,
  onChange,
  placeholder,
  onAdd,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  onAdd: () => void
}) {
  const disabled = !value.trim()
  return (
    <View style={styles.addRow}>
      <TextInput
        style={[styles.input, { flex: 1 }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textDisabled}
      />
      <TouchableOpacity
        style={[styles.addBtn, disabled && { opacity: 0.4 }]}
        disabled={disabled}
        onPress={onAdd}
        accessibilityLabel="Add"
        accessibilityRole="button"
      >
        <Text style={styles.addBtnText}>Add</Text>
      </TouchableOpacity>
    </View>
  )
}

function FieldText({
  label,
  value,
  placeholder,
  onChange,
  multiline,
  marginTop,
}: {
  label: string
  value: string
  placeholder: string
  onChange: (v: string) => void
  multiline?: boolean
  marginTop?: boolean
}) {
  return (
    <>
      <Text style={[styles.sectionTitle, marginTop && { marginTop: theme.spacing.xl }]}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { minHeight: 60 }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textDisabled}
        multiline={multiline}
      />
    </>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.75)',
  },
  sheet: {
    backgroundColor: '#162844',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing['2xl'],
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.md,
  },
  input: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    fontSize: 15,
    color: theme.colors.text,
    backgroundColor: theme.glass.tintLow,
    borderColor: theme.glass.border,
    minHeight: 44,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.glass.border,
    backgroundColor: theme.glass.tintLow,
  },
  chipActive: {
    borderColor: theme.colors.accentBorder,
    backgroundColor: theme.colors.accentSoft,
  },
  chipText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    maxWidth: 180,
  },
  chipTextActive: {
    color: theme.colors.text,
  },
  addRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  addBtn: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.palette.violet,
    justifyContent: 'center',
    minHeight: 44,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
})
