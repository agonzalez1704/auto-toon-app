/** Central app configuration */
export const CONFIG = {
  /** Base URL for the toon-converter API */
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'https://autotoon.com',

  /** Clerk publishable key */
  CLERK_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '',

  /** App URL scheme for deep linking */
  APP_SCHEME: 'autotoonapp',
} as const
