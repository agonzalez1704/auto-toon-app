import { useEffect, useRef, useState } from 'react'
import { StatusBar, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ParticleSphere } from '@/components/particle-sphere'
import { theme } from '@/constants/theme'

interface GeneratingViewProps {
  phase: 'uploading' | 'generating'
}

function GeneratingTimer({ phase }: { phase: string }) {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(Date.now())

  useEffect(() => {
    startRef.current = Date.now()
    setElapsed(0)
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000)
    return () => clearInterval(id)
  }, [phase])

  return (
    <Text style={styles.timer}>
      {phase === 'uploading' ? 'Uploading...' : `Enhancing... ${elapsed}s`}
    </Text>
  )
}

export function GeneratingView({ phase }: GeneratingViewProps) {
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.center}>
          <ParticleSphere width={160} height={160} phase="generating" />
          <GeneratingTimer phase={phase} />
          <Text style={styles.phase}>
            {phase === 'uploading' ? 'Uploading image...' : 'Enhancing your product...'}
          </Text>
          <Text style={styles.hint}>This usually takes 15-30 seconds</Text>
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  safeArea: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.lg,
    paddingBottom: 60,
  },
  timer: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
    fontVariant: ['tabular-nums'],
  },
  phase: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.textMuted,
  },
  hint: {
    fontSize: 13,
    color: theme.colors.textDisabled,
    marginTop: theme.spacing.xs,
  },
})
