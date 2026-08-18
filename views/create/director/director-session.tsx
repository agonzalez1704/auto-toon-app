import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Text, TextInput } from '@/components/text'
import { theme } from '@/constants/theme'
import { askDirector, type DirectorEntry } from '@/lib/api'
import { userAction, type DirectorComponent, type Surface } from '@/lib/create/a2ui'
import { SurfaceView } from './surface-view'

/**
 * La conversación con el director.
 *
 * El servidor manda A2UI v0.9.1 y este cliente lo dibuja — mismo endpoint,
 * mismo parser y mismo catálogo que la web. Lo único propio de móvil es cómo
 * se ve.
 *
 * El transcripto viaja completo en cada turno: los turnos del director van
 * como el JSON que el modelo produjo, y los del cliente como acciones tipadas.
 * Así el modelo relee su propio formato de cable en vez de una prosa que
 * tendría que reinterpretar.
 */
export function DirectorSession({
  imageUrl,
  subject,
  onConceptPicked,
  onSaid,
}: {
  imageUrl: string
  subject: string
  /** El cliente eligió una idea: de aquí en adelante manda la generación. */
  onConceptPicked: (concept: { title: string; visual: string; needsCharacter: boolean }) => void
  /**
   * Lo que el cliente escribió o eligió, en crudo.
   *
   * La forma sale de aquí, no de un selector: "para Instagram" o "historia"
   * ya dice el recorte. Un control manual de aspect-ratio le pide al cliente
   * que traduzca su intención a una fracción.
   */
  onSaid?: (text: string) => void
}) {
  const [surfaces, setSurfaces] = useState<Surface[]>([])
  const [thinking, setThinking] = useState(false)
  const [failed, setFailed] = useState(false)
  const [draft, setDraft] = useState('')

  /**
   * Espeja el transcripto para que `send` arme el siguiente sin usar un
   * updater funcional: React los corre durante el render, y disparar la
   * petición ahí adentro es exactamente el "cannot update a component while
   * rendering" que esto ya provocó en la web.
   */
  const entriesRef = useRef<DirectorEntry[]>([])

  const advance = useCallback(
    async (transcript: DirectorEntry[]) => {
      setThinking(true)
      setFailed(false)
      try {
        const reply = await askDirector({ imageUrl, subject, transcript })
        // La ruta ya validó y parseó: devuelve la superficie con `components`
        // aplanado a objeto para poder viajar como JSON. Solo hay que rearmar
        // el Map. Pasarla por `parseSurface` —que espera mensajes A2UI
        // crudos— la rechazaba entera y todo turno salía como fallo.
        const surface = reply.surface
          ? {
              surfaceId: reply.surface.surfaceId,
              order: reply.surface.order,
              components: new Map(Object.entries(reply.surface.components)) as Surface['components'],
            }
          : null
        if (!surface || !reply.messages) {
          // Falla hablada, no un silencio: la web colapsaba al menú plano y
          // el usuario no sabía que algo se había roto.
          setFailed(true)
          return
        }
        entriesRef.current = [...transcript, { from: 'director', messages: reply.messages }]
        setSurfaces((prev) => [...prev, surface])
      } catch {
        setFailed(true)
      } finally {
        setThinking(false)
      }
    },
    [imageUrl, subject],
  )

  // Primer turno: el brief completo sobre lo que subió.
  useEffect(() => {
    if (entriesRef.current.length === 0) void advance([])
  }, [advance])

  const send = useCallback(
    (action: ReturnType<typeof userAction>) => {
      const next: DirectorEntry[] = [...entriesRef.current, { from: 'user', action }]
      entriesRef.current = next
      void advance(next)
    },
    [advance],
  )

  const lastSurfaceId = surfaces.length ? surfaces[surfaces.length - 1].surfaceId : 'turn-0'

  const say = useCallback(
    (text: string) => {
      const t = text.trim()
      if (!t) return
      setDraft('')
      onSaid?.(t)
      send(userAction('client_text', lastSurfaceId, 'client-input', { text: t }))
    },
    [lastSurfaceId, onSaid, send],
  )

  const onConcept = useCallback(
    (c: Extract<DirectorComponent, { component: 'Concept' }>, surfaceId: string) => {
      onConceptPicked({ title: c.title, visual: c.visual, needsCharacter: c.needsCharacter })
      send(userAction('concept_selected', surfaceId, c.id, { conceptId: c.id }))
    },
    [onConceptPicked, send],
  )

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {surfaces.map((surface, i) => (
        <View key={surface.surfaceId + i} style={styles.turn}>
          <SurfaceView
            surface={surface}
            disabled={thinking || i < surfaces.length - 1}
            onConcept={(c) => onConcept(c, surface.surfaceId)}
            onChoice={(c, option) => {
              onSaid?.(`${option.id} ${option.label}`)
              send(
                userAction('choice_selected', surface.surfaceId, c.id, {
                  choiceId: c.id,
                  optionId: option.id,
                  label: option.label,
                }),
              )
            }}
          />
        </View>
      ))}

      {thinking ? (
        <View style={styles.thinking}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={styles.thinkingLabel}>
            {surfaces.length === 0
              ? `Viendo ${(subject || 'tu imagen').toLowerCase()}`
              : 'El director está escribiendo'}
          </Text>
        </View>
      ) : null}

      {!thinking && surfaces.length > 0 ? (
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Dile algo al director…"
            placeholderTextColor={theme.colors.textDim}
            style={styles.input}
            onSubmitEditing={() => say(draft)}
            returnKeyType="send"
          />
          <Pressable
            onPress={() => say(draft)}
            disabled={!draft.trim()}
            accessibilityRole="button"
            accessibilityLabel="Enviar"
            style={[styles.send, !draft.trim() && styles.dim]}
          >
            <Text style={styles.sendLabel}>Enviar</Text>
          </Pressable>
        </View>
      ) : null}

      {failed && !thinking ? (
        <View style={styles.turn}>
          <Text style={styles.said}>No pude terminar esa idea.</Text>
          <Pressable
            style={styles.retry}
            onPress={() => void advance(entriesRef.current)}
            accessibilityRole="button"
          >
            <Text style={styles.retryLabel}>Reintentar</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xl },
  turn: { gap: theme.spacing.sm },
  said: { ...theme.typography.body, color: theme.colors.text },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  thinkingLabel: { ...theme.typography.bodySm, color: theme.colors.textDim },
  retry: {
    alignSelf: 'flex-start',
    minHeight: theme.minTap,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceRaised,
  },
  retryLabel: { ...theme.typography.cta, color: theme.colors.text },
  composer: { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' },
  input: {
    flex: 1,
    minHeight: theme.minTap,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    ...theme.typography.body,
  },
  send: {
    minHeight: theme.minTap,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceRaised,
  },
  sendLabel: { ...theme.typography.cta, color: theme.colors.text },
  dim: { opacity: 0.4 },
})
