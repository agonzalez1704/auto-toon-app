/**
 * Icon set for create flow — goal icons, brand icons, chrome icons.
 * All use theme tokens. Tree-shakable.
 */
import Svg, {
  Circle,
  Defs,
  Rect,
  Stop,
  LinearGradient as SvgLinearGradient,
  Path as SvgPath,
} from 'react-native-svg'
import { theme } from '@/constants/theme'

const VIOLET = theme.palette.violet
const VIOLET_LIGHT = theme.palette.violetLight
const CYAN = theme.palette.cyan

// ── Aspect ratio rectangle ──────────────────────────────────────────────

export function AspectRatioIcon({ w, h, color = '#fff' }: { w: number; h: number; color?: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20">
      <Rect
        x={(20 - w) / 2}
        y={(20 - h) / 2}
        width={w}
        height={h}
        rx={1.5}
        fill={color}
        fillOpacity={0.15}
        stroke={color}
        strokeWidth={1.5}
      />
    </Svg>
  )
}

// ── Goal icons ──────────────────────────────────────────────────────────

export function InstagramIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="2" width="20" height="20" rx="5" fill="none" stroke={VIOLET} strokeWidth="2" />
      <Circle cx="12" cy="12" r="5" fill="none" stroke={VIOLET} strokeWidth="2" />
      <Circle cx="17.5" cy="6.5" r="1.5" fill={VIOLET} />
    </Svg>
  )
}

export function SparkleGoalIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"
        fill="none"
        stroke={CYAN}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function PaletteIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" fill="none" stroke={VIOLET_LIGHT} strokeWidth="2" />
      <Circle cx="8" cy="10" r="1.5" fill={VIOLET} />
      <Circle cx="12" cy="7" r="1.5" fill={CYAN} />
      <Circle cx="16" cy="10" r="1.5" fill={VIOLET_LIGHT} />
      <Circle cx="14" cy="15" r="1.5" fill={VIOLET} />
    </Svg>
  )
}

export function PosterIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke={VIOLET} strokeWidth="2" />
      <SvgPath
        d="M3 15l5-5 4 4 3-3 6 6"
        stroke={VIOLET}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  )
}

export function FoodIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="14" r="8" fill="none" stroke={VIOLET_LIGHT} strokeWidth="2" />
      <SvgPath d="M12 6V2M8 7l-2-3M16 7l2-3" stroke={VIOLET_LIGHT} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  )
}

export function CameraGoalIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
        fill="none"
        stroke={CYAN}
        strokeWidth="2"
      />
      <Circle cx="12" cy="13" r="4" fill="none" stroke={CYAN} strokeWidth="2" />
    </Svg>
  )
}

export function CubeGoalIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"
        fill="none"
        stroke={CYAN}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <SvgPath d="M3.27 6.96L12 12l8.73-5.04M12 22V12" fill="none" stroke={CYAN} strokeWidth="2" strokeLinejoin="round" />
    </Svg>
  )
}

// ── Upload chrome ───────────────────────────────────────────────────────

export function GalleryUploadIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      <Circle cx="8.5" cy="8.5" r="2" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      <SvgPath d="M21 15l-5-5L5 21" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  )
}

export function CameraUploadIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
        fill="none"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="1.5"
      />
      <Circle cx="12" cy="13" r="4" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
    </Svg>
  )
}

export function EditPencilIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function ChevronDownIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M6 9l6 6 6-6"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

export function CloseIcon({ size = 20, color = 'rgba(255,255,255,0.6)' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <SvgPath d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  )
}

export function SettingsIcon({ color = VIOLET }: { color?: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M12 15.5A3.5 3.5 0 1012 8.5a3.5 3.5 0 000 7z"
        stroke={color}
        strokeWidth="2"
      />
      <SvgPath
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
        stroke={color}
        strokeWidth="2"
      />
    </Svg>
  )
}

export function SparklesIcon({ size = 18, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <SvgPath
        d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"
        fill={color}
        stroke={color}
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// ── AI provider brand icons ─────────────────────────────────────────────

export function GeminiIcon({ size = 14 }: { size?: number }) {
  const d = "M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z"
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <SvgLinearGradient id="gf0" x1="7" y1="15.5" x2="11" y2="12" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#08B962" />
          <Stop offset="1" stopColor="#08B962" stopOpacity={0} />
        </SvgLinearGradient>
        <SvgLinearGradient id="gf1" x1="8" y1="5.5" x2="11.5" y2="11" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#F94543" />
          <Stop offset="1" stopColor="#F94543" stopOpacity={0} />
        </SvgLinearGradient>
        <SvgLinearGradient id="gf2" x1="3.5" y1="13.5" x2="17.5" y2="12" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FABC12" />
          <Stop offset="0.46" stopColor="#FABC12" stopOpacity={0} />
        </SvgLinearGradient>
      </Defs>
      <SvgPath d={d} fill="#3186FF" />
      <SvgPath d={d} fill="url(#gf0)" />
      <SvgPath d={d} fill="url(#gf1)" />
      <SvgPath d={d} fill="url(#gf2)" />
    </Svg>
  )
}

export function IdeogramIcon({ size = 14 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 900 900" fill="none">
      <SvgPath d="M377.87 204.44H237.22" stroke="white" strokeWidth={70} strokeLinecap="round" strokeLinejoin="round" />
      <SvgPath d="M377.87 696.3H237.22" stroke="white" strokeWidth={70} strokeLinecap="round" strokeLinejoin="round" />
      <SvgPath d="M44.01 450.58H378.23" stroke="white" strokeWidth={70} strokeLinecap="round" strokeLinejoin="round" />
      <SvgPath d="m390.12 816.41h-34.3zm0-244.02c67.39 0 122.01 54.63 122.01 122.01s-54.63 122.01-122.01 122.01m0-732.92h-34.3zm0 488.9H117.42m272.7 0H117.42m272.7 0c9.26 0 18.28 1.88 26.94 3.83 54.42 12.27 95.07 60.9 95.07 119.03 0 67.39-54.63 122.01-122.01 122.01m0-488.9c67.39 0 122.01 54.63 122.01 122.01s-54.63 122.01-122.01 122.01" stroke="white" strokeWidth={70} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

export function MidjourneyIcon({ size = 14 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024" fill="none">
      <SvgPath d="m 267.7,229.5 c 128.6,55 305,208.1 337.4,412 -148.3,-59.8 -261.2,-27.9 -339.8,20.6 119.9,-152.4 66.1,-325.7 2.4,-432.6 z" fill="none" stroke="white" strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" />
      <SvgPath d="m 242.4,752.2 -22.9,-43.8 590,-38 c -46.4,42.2 -106,76.4 -166.3,104.4" fill="none" stroke="white" strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" />
      <SvgPath d="M 454.4,300.4 C 554.8,331.1 695.2,479.4 743,638.8 716.8,628.5 697.2,618 660.4,627.4 624.8,497.9 561.1,374.2 454.4,300.4 Z" fill="none" stroke="white" strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}
