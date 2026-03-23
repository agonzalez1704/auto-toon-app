import { useEffect, useRef, useState, memo } from 'react'
import { View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'

// ─── Types ──────────────────────────────────────────────────────────────

type Point3D = [number, number, number]
type Phase = 'generating' | 'complete' | 'idle'

interface ParticleSphereProps {
  width: number
  height: number
  phase: Phase
}

interface ProjectedParticle {
  x: number
  y: number
  r: number
  opacity: number
  color: string
}

// ─── Constants ──────────────────────────────────────────────────────────

const PARTICLE_COUNT = 30
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
const MORPH_CYCLE_DURATION = 3.0
const LERP_SPEED = 4.0
const ROTATION_SPEED = 0.8
const PERSPECTIVE = 4.0
const FPS_CAP = 30 // Cap at 30fps for mobile perf
const FRAME_INTERVAL = 1000 / FPS_CAP

const CONFETTI_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
]

// ─── Morph targets ──────────────────────────────────────────────────────

function generateSpherePoints(count: number): Point3D[] {
  const points: Point3D[] = []
  for (let i = 0; i < count; i++) {
    const y = 1 - (2 * i) / (count - 1)
    const radiusAtY = Math.sqrt(1 - y * y)
    const theta = GOLDEN_ANGLE * i
    const x = Math.cos(theta) * radiusAtY
    const z = Math.sin(theta) * radiusAtY
    points.push([x, y, z])
  }
  return points
}

function generateGridPoints(count: number): Point3D[] {
  const points: Point3D[] = []
  const gridPositions: [number, number][] = []
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      gridPositions.push([-0.7 + col * 0.7, -0.7 + row * 0.7])
    }
  }
  const perCluster = Math.floor(count / 9)
  const remainder = count - perCluster * 9
  for (let g = 0; g < 9; g++) {
    const [cx, cy] = gridPositions[g]
    const n = g < remainder ? perCluster + 1 : perCluster
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n + Math.random() * 0.3
      const radius = Math.random() * 0.22
      points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius, (Math.random() - 0.5) * 0.08])
    }
  }
  return points.slice(0, count)
}

function generateCameraPoints(count: number): Point3D[] {
  const points: Point3D[] = []
  const bodySegs: [number, number, number, number][] = [
    [-0.7, -0.4, 0.7, -0.4], [0.7, -0.4, 0.7, 0.4],
    [0.7, 0.4, -0.7, 0.4], [-0.7, 0.4, -0.7, -0.4],
  ]
  const finderSegs: [number, number, number, number][] = [
    [-0.2, 0.4, -0.2, 0.6], [-0.2, 0.6, 0.2, 0.6], [0.2, 0.6, 0.2, 0.4],
  ]
  const allSegs = [...bodySegs, ...finderSegs]
  const totalLen = allSegs.reduce((s, [x1, y1, x2, y2]) => s + Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2), 0)
  const bodyCount = Math.floor(count * 0.5)
  const lensCount = Math.floor(count * 0.35)
  let placed = 0
  for (const [x1, y1, x2, y2] of allSegs) {
    const segLen = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
    const segCount = Math.round((segLen / totalLen) * bodyCount)
    for (let i = 0; i < segCount && placed < bodyCount; i++) {
      const t = i / Math.max(segCount - 1, 1)
      points.push([x1 + (x2 - x1) * t + (Math.random() - 0.5) * 0.04, y1 + (y2 - y1) * t + (Math.random() - 0.5) * 0.04, (Math.random() - 0.5) * 0.06])
      placed++
    }
  }
  for (let i = 0; i < lensCount; i++) {
    const angle = (Math.PI * 2 * i) / lensCount
    const r = 0.28 * (0.7 + Math.random() * 0.3)
    points.push([Math.cos(angle) * r, Math.sin(angle) * r, (Math.random() - 0.5) * 0.06])
  }
  while (points.length < count) points.push([(Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, 0])
  return points.slice(0, count)
}

function generateCheckmarkPoints(count: number): Point3D[] {
  const points: Point3D[] = []
  const shortLeg: [number, number, number, number] = [-0.5, 0, -0.1, -0.5]
  const longLeg: [number, number, number, number] = [-0.1, -0.5, 0.6, 0.5]
  const shortLen = Math.sqrt((shortLeg[2] - shortLeg[0]) ** 2 + (shortLeg[3] - shortLeg[1]) ** 2)
  const longLen = Math.sqrt((longLeg[2] - longLeg[0]) ** 2 + (longLeg[3] - longLeg[1]) ** 2)
  const totalLen = shortLen + longLen
  const shortCount = Math.round((shortLen / totalLen) * count)
  const longCount = count - shortCount
  for (let i = 0; i < shortCount; i++) {
    const t = i / Math.max(shortCount - 1, 1)
    points.push([
      shortLeg[0] + (shortLeg[2] - shortLeg[0]) * t + (Math.random() - 0.5) * 0.08,
      shortLeg[1] + (shortLeg[3] - shortLeg[1]) * t + (Math.random() - 0.5) * 0.08,
      (Math.random() - 0.5) * 0.06,
    ])
  }
  for (let i = 0; i < longCount; i++) {
    const t = i / Math.max(longCount - 1, 1)
    points.push([
      longLeg[0] + (longLeg[2] - longLeg[0]) * t + (Math.random() - 0.5) * 0.08,
      longLeg[1] + (longLeg[3] - longLeg[1]) * t + (Math.random() - 0.5) * 0.08,
      (Math.random() - 0.5) * 0.06,
    ])
  }
  return points.slice(0, count)
}

const SHAPES = ['sphere', 'grid', 'camera', 'sphere'] as const
type ShapeName = (typeof SHAPES)[number]

function getShapePoints(shape: ShapeName): Point3D[] {
  switch (shape) {
    case 'sphere': return generateSpherePoints(PARTICLE_COUNT)
    case 'grid': return generateGridPoints(PARTICLE_COUNT)
    case 'camera': return generateCameraPoints(PARTICLE_COUNT)
    default: return generateSpherePoints(PARTICLE_COUNT)
  }
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

// ─── Component ──────────────────────────────────────────────────────────

export const ParticleSphere = memo(function ParticleSphere({ width, height, phase }: ParticleSphereProps) {
  const [particles, setParticles] = useState<ProjectedParticle[]>([])
  const stateRef = useRef({
    x: new Float32Array(PARTICLE_COUNT),
    y: new Float32Array(PARTICLE_COUNT),
    z: new Float32Array(PARTICLE_COUNT),
    vx: new Float32Array(PARTICLE_COUNT),
    vy: new Float32Array(PARTICLE_COUNT),
    vz: new Float32Array(PARTICLE_COUNT),
    colorIdx: new Uint8Array(PARTICLE_COUNT),
    rotationY: 0,
    morphTimer: 0,
    shapeIndex: 0,
    targets: generateSpherePoints(PARTICLE_COUNT),
    lastTime: 0,
    lastRender: 0,
    confettiActive: false,
    confettiTimer: 0,
    initialized: false,
    prevPhase: 'idle' as string,
  })

  useEffect(() => {
    const s = stateRef.current
    if (!s.initialized) {
      const spherePoints = generateSpherePoints(PARTICLE_COUNT)
      s.targets = spherePoints
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        s.x[i] = spherePoints[i][0]
        s.y[i] = spherePoints[i][1]
        s.z[i] = spherePoints[i][2]
        s.colorIdx[i] = Math.floor(Math.random() * CONFETTI_COLORS.length)
      }
      s.initialized = true
    }
    s.lastTime = performance.now()
    s.lastRender = 0

    let rafId: number

    const animate = (now: number) => {
      const dt = Math.min((now - s.lastTime) / 1000, 0.05)
      s.lastTime = now

      // Phase transitions
      if (phase !== s.prevPhase) {
        if (phase === 'complete' && s.prevPhase === 'generating') {
          s.targets = generateCheckmarkPoints(PARTICLE_COUNT)
          s.confettiActive = false
          s.confettiTimer = 0
        }
        if (phase === 'generating') {
          s.shapeIndex = 0
          s.morphTimer = 0
          s.confettiActive = false
          s.targets = getShapePoints(SHAPES[0])
        }
        s.prevPhase = phase
      }

      // Morph cycling during generation
      if (phase === 'generating') {
        s.morphTimer += dt
        if (s.morphTimer >= MORPH_CYCLE_DURATION) {
          s.morphTimer = 0
          s.shapeIndex = (s.shapeIndex + 1) % SHAPES.length
          s.targets = getShapePoints(SHAPES[s.shapeIndex])
        }
      }

      // Confetti after checkmark
      if (phase === 'complete' && !s.confettiActive) {
        let converged = 0
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const dx = s.x[i] - s.targets[i][0]
          const dy = s.y[i] - s.targets[i][1]
          if (dx * dx + dy * dy < 0.01) converged++
        }
        if (converged > PARTICLE_COUNT * 0.8) {
          s.confettiActive = true
          s.confettiTimer = 0
          for (let i = 0; i < PARTICLE_COUNT; i++) {
            s.vx[i] = (Math.random() - 0.5) * 4
            s.vy[i] = -Math.random() * 3 - 1
            s.vz[i] = (Math.random() - 0.5) * 2
            s.colorIdx[i] = Math.floor(Math.random() * CONFETTI_COLORS.length)
          }
        }
      }

      // Rotation
      const rotSpeed = phase === 'generating'
        ? (SHAPES[s.shapeIndex] === 'sphere' ? ROTATION_SPEED : 0.1)
        : 0.1
      s.rotationY += rotSpeed * dt

      // Update positions
      if (s.confettiActive) {
        s.confettiTimer += dt
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          s.vy[i] += 3 * dt
          s.x[i] += s.vx[i] * dt
          s.y[i] += s.vy[i] * dt
          s.z[i] += s.vz[i] * dt
        }
        if (s.confettiTimer > 2.0) {
          s.confettiActive = false
          s.targets = generateCheckmarkPoints(PARTICLE_COUNT)
        }
      } else {
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          s.x[i] += (s.targets[i][0] - s.x[i]) * LERP_SPEED * dt
          s.y[i] += (s.targets[i][1] - s.y[i]) * LERP_SPEED * dt
          s.z[i] += (s.targets[i][2] - s.z[i]) * LERP_SPEED * dt
        }
      }

      // Throttle renders to FPS_CAP
      if (now - s.lastRender < FRAME_INTERVAL) {
        rafId = requestAnimationFrame(animate)
        return
      }
      s.lastRender = now

      // Project to 2D
      const cx = width / 2
      const cy = height / 2
      const cosR = Math.cos(s.rotationY)
      const sinR = Math.sin(s.rotationY)
      const radius = Math.min(width, height) * 0.38

      const projected: ProjectedParticle[] = []
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const rx = s.x[i] * cosR + s.z[i] * sinR
        const rz = -s.x[i] * sinR + s.z[i] * cosR
        const ry = s.y[i]

        const scale = PERSPECTIVE / (PERSPECTIVE + rz)
        const screenX = cx + rx * scale * radius
        const screenY = cy + ry * scale * radius
        const particleSize = Math.max(1, 3 * scale)
        const alpha = 0.4 + 0.6 * Math.min(1, Math.max(0, scale))

        let color: string
        let finalAlpha = alpha
        if (s.confettiActive) {
          color = CONFETTI_COLORS[s.colorIdx[i]]
          finalAlpha = Math.max(0, alpha * (1 - s.confettiTimer / 2))
        } else if (phase === 'complete') {
          color = hslToHex(150, 70, 55)
        } else {
          const hue = 210 + rz * 30
          color = hslToHex(hue, 80, 60)
        }

        projected.push({ x: screenX, y: screenY, r: particleSize, opacity: finalAlpha, color })
      }

      // Sort back to front for correct overlap
      projected.sort((a, b) => a.r - b.r)
      setParticles(projected)

      if (phase !== 'idle') {
        rafId = requestAnimationFrame(animate)
      }
    }

    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [width, height, phase])

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {particles.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={p.r} fill={p.color} opacity={p.opacity} />
        ))}
        {/* Glow layer */}
        {particles.map((p, i) => (
          <Circle key={`g${i}`} cx={p.x} cy={p.y} r={p.r * 2.5} fill={p.color} opacity={p.opacity * 0.15} />
        ))}
      </Svg>
    </View>
  )
})
