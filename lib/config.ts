/** Central app configuration */

const clerkKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
if (!clerkKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY — set it in .env before building.'
  )
}

export const CONFIG = {
  /** Base URL for the toon-converter API */
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'https://auto-toon.com',

  /** Clerk publishable key */
  CLERK_PUBLISHABLE_KEY: clerkKey,

  /** App URL scheme for deep linking */
  APP_SCHEME: 'autotoonapp',
} as const
