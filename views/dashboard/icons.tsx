/**
 * Icon set — single source of truth for dashboard SVG icons.
 * All icons accept `size` and `color` so they're tree-shakable + themable.
 */
import Svg, { Circle, Path as SvgPath } from 'react-native-svg'
import { theme } from '@/constants/theme'

interface IconProps {
  size?: number
  color?: string
}

export function CoinsIcon({ size = 14, color = theme.palette.amber }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
      <SvgPath d="M12 7v10M9 9.5l3-2.5 3 2.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  )
}

export function SparklesIcon({ size = 14, color = theme.palette.violet }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"
        stroke={color}
        strokeWidth={2}
        fill="none"
      />
    </Svg>
  )
}

export function PlusIcon({ size = 14, color = theme.colors.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M12 5v14M5 12h14" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  )
}

export function ArrowRightIcon({ size = 12, color = theme.colors.textDim }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M5 12h14M13 6l6 6-6 6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// ── Tab bar icons (cross-platform replacement for SF Symbols) ─────────
export function GridIcon({ size = 24, color = theme.colors.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"
        fill={color}
      />
    </Svg>
  )
}

export function WandIcon({ size = 24, color = theme.colors.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M15 4l1.5 3 3 1.5-3 1.5L15 13l-1.5-3-3-1.5 3-1.5L15 4z"
        fill={color}
      />
      <SvgPath
        d="M5 21l8-8M11 11l2 2"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </Svg>
  )
}

export function PhotoStackIcon({ size = 24, color = theme.colors.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M5 8h12a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9a2 2 0 012-2z"
        fill={color}
      />
      <SvgPath
        d="M7 5h12a2 2 0 012 2v1H5V7a2 2 0 012-2z"
        fill={color}
        opacity={0.7}
      />
    </Svg>
  )
}

export function MoreIcon({ size = 24, color = theme.colors.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" fill={color} />
      <Circle cx="7.5" cy="12" r="1.4" fill={theme.colors.bg} />
      <Circle cx="12" cy="12" r="1.4" fill={theme.colors.bg} />
      <Circle cx="16.5" cy="12" r="1.4" fill={theme.colors.bg} />
    </Svg>
  )
}

export function EmptySparkle({ size = 32, color = 'rgba(255,255,255,0.15)' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"
        stroke={color}
        strokeWidth={1.5}
        fill="none"
      />
    </Svg>
  )
}
