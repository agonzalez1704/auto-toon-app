import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Text } from '@/components/text'
import { theme } from '@/constants/theme'
import { askDirector, type DirectorEntry } from '@/lib/api'
import { parseSurface, userAction, type DirectorComponent, type Surface } from '@/lib/create/a2ui'
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
}: {
  imageUrl: string
  subject: string
  /** El cliente eligió una idea: de aquí en adelante manda la generación. */
  onConceptPicked: (concept: { title: string; visual: string; needsCharacter: boolean }) => void
}) {
  const [surfaces, setSurfaces] = useState<Surface[]>([])
  const [thinking, setThinking] = useState(false)
  const [failed, setFailed] = useState(false)

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
        const surface = parseSurface(reply.surface ?? reply.messages, `turn-${transcript.length + 1}`)
        if (!surface) {
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
            onChoice={(c, option) =>
              send(
                userAction('choice_selected', surface.surfaceId, c.id, {
                  choiceId: c.id,
                  optionId: option.id,
                  label: option.label,
                }),
              )
            }
          />
        </View>
      ))}

      {thinking ? (
        <View style={styles.thinking}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={styles.thinkingLabel}>
            {surfaces.length === 0 ? `Viendo ${subject.toLowerCase()}` : 'El director está escribiendo'}
          </Text>
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
})
