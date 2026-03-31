import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

/** Query keys for consistent cache invalidation */
export const queryKeys = {
  credits: ['credits'] as const,
  subscription: ['subscription'] as const,
  assets: ['assets'] as const,
  recentCreations: ['recent-creations'] as const,
  videos: ['videos'] as const,
}
