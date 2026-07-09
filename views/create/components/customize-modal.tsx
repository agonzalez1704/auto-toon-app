import { useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { theme } from '@/constants/theme'
import { generateTagline } from '@/lib/api'
import { useProductEnhancerStore } from '@/stores/use-product-enhancer-store'
import type { GoalId } from '@/stores/use-product-enhancer-store'
import { CloseIcon } from '../icons'

interface CustomizeModalProps {
  visible: boolean
  goalId: GoalId | null
  onClose: () => void
  /**
   * Poster gate: when provided, a sticky "generate" CTA is shown at the bottom
   * of the sheet. Tapping it confirms the config and fires generation (owned by
   * the create screen, which holds consent/credit logic). Poster generation is
   * only reachable through this button.
   */
  onConfirmGenerate?: () => void
  confirmLabel?: string
  confirming?: boolean
}

type FontStyle = 'sans-serif' | 'serif' | 'display' | 'handwritten'
type Language = 'es' | 'en'
type AspectRatio = '1:1' | '4:5' | '9:16' | '16:9' | '3:4'
type ColorScheme = 'monochromatic' | 'complementary' | 'analogous' | 'custom'
type BackgroundType = 'gradient' | 'solid' | 'textured' | 'abstract'

const FONT_STYLES: FontStyle[] = ['sans-serif', 'serif', 'display', 'handwritten']
const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'es', label: 'Español' },
  { id: 'en', label: 'English' },
]
const ASPECT_RATIOS: AspectRatio[] = ['1:1', '4:5', '9:16', '16:9', '3:4']
const COLOR_SCHEMES: ColorScheme[] = ['monochromatic', 'complementary', 'analogous', 'custom']
const BACKGROUND_TYPES: BackgroundType[] = ['gradient', 'solid', 'textured', 'abstract']

/**
 * Bottom-sheet modal for customizing elements/poster goal config.
 * Reads + writes via store. Pure UI — no router or query deps.
 */
export function CustomizeModal({
  visible,
  goalId,
  onClose,
  onConfirmGenerate,
  confirmLabel = 'Generate poster',
  confirming = false,
}: CustomizeModalProps) {
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
              productName={store.productName}
              onSet={(patch) =>
                store.setSecondImageConfig({
                  posterConfig: { ...posterConfig, ...patch } as any,
                })
              }
            />
          )}
        </ScrollView>

        {isPoster && onConfirmGenerate && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.confirmBtn, confirming && { opacity: 0.6 }]}
              onPress={onConfirmGenerate}
              disabled={confirming}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              {confirming ? (
                <ActivityIndicator color={theme.colors.text} />
              ) : (
                <Text style={styles.confirmBtnText}>{confirmLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
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
  productName: string
  onSet: (patch: Record<string, any>) => void
}

function PosterConfig({ cfg, productName, onSet }: PosterProps) {
  const [retranslating, setRetranslating] = useState(false)
  const language: Language = cfg.language === 'en' ? 'en' : 'es'

  // Switching language regenerates the poster copy in that language so the
  // preview text is real localized copy, not a render-model guess. On failure
  // we still flip the language flag (the render prompt enforces the language).
  const changeLanguage = async (lang: Language) => {
    if (lang === language) return
    onSet({ language: lang })
    if (!productName.trim()) return
    setRetranslating(true)
    try {
      const r = await generateTagline(productName, cfg.headline, lang)
      const patch: Record<string, any> = { language: lang }
      if (r.headline) patch.headline = r.headline
      if (r.tagline) patch.tagline = r.tagline
      if (r.text) patch.text = r.text
      onSet(patch)
    } catch {
      // Keep the language flag; copy stays as-is.
    } finally {
      setRetranslating(false)
    }
  }

  return (
    <>
      <View style={styles.langRow}>
        <Text style={styles.sectionTitle}>Language</Text>
        {retranslating && <ActivityIndicator size="small" color={theme.colors.accent} />}
      </View>
      <View style={styles.chipWrap}>
        {LANGUAGES.map((l) => {
          const active = language === l.id
          return (
            <TouchableOpacity
              key={l.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => changeLanguage(l.id)}
              disabled={retranslating}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{l.label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
      <Text style={styles.hint}>
        Poster text is baked into the image — pick the language before generating.
      </Text>

      <FieldText
        label="Top Label"
        value={cfg.topLabel ?? ''}
        placeholder="e.g. NEW, SALE, OFFER"
        onChange={(v) => onSet({ topLabel: v })}
        marginTop
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

      <ChipSelect
        label="Aspect Ratio"
        options={ASPECT_RATIOS}
        value={cfg.aspectRatio ?? '4:5'}
        onSelect={(v) => onSet({ aspectRatio: v })}
      />

      <FieldText
        label="Primary Color"
        value={cfg.primaryColor ?? ''}
        placeholder="e.g. vibrant blue, deep red"
        onChange={(v) => onSet({ primaryColor: v })}
        marginTop
      />
      <ChipSelect
        label="Color Scheme"
        options={COLOR_SCHEMES}
        value={cfg.colorScheme ?? 'monochromatic'}
        onSelect={(v) => onSet({ colorScheme: v })}
      />

      <ChipSelect
        label="Font Style"
        options={FONT_STYLES}
        value={cfg.fontStyle ?? 'sans-serif'}
        onSelect={(v) => onSet({ fontStyle: v })}
      />

      <ChipSelect
        label="Background"
        options={BACKGROUND_TYPES}
        value={cfg.backgroundType ?? 'gradient'}
        onSelect={(v) => onSet({ backgroundType: v })}
      />

      <Text style={[styles.sectionTitle, { marginTop: theme.spacing.xl }]}>Decorative Elements</Text>
      <View style={styles.chipWrap}>
        {(['halftone', 'particles', 'geometricShapes'] as const).map((key) => {
          const active = !!cfg.decorativeElements?.[key]
          const label = key === 'geometricShapes' ? 'geometric' : key
          return (
            <TouchableOpacity
              key={key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() =>
                onSet({
                  decorativeElements: { ...(cfg.decorativeElements ?? {}), [key]: !active },
                })
              }
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </>
  )
}

function ChipSelect<T extends string>({
  label,
  options,
  value,
  onSelect,
}: {
  label: string
  options: readonly T[]
  value: T
  onSelect: (v: T) => void
}) {
  return (
    <>
      <Text style={[styles.sectionTitle, { marginTop: theme.spacing.xl }]}>{label}</Text>
      <View style={styles.chipWrap}>
        {options.map((opt) => {
          const active = value === opt
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onSelect(opt)}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
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
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  hint: {
    fontSize: 12,
    color: theme.colors.textDisabled,
    marginBottom: theme.spacing.sm,
    marginTop: -theme.spacing.xs,
  },
  footer: {
    paddingHorizontal: theme.spacing['2xl'],
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.glass.border,
  },
  confirmBtn: {
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.radius.md,
    backgroundColor: theme.palette.violet,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: 0.3,
  },
})
