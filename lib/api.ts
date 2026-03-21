import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { CONFIG } from './config'

/** Typed API client with Bearer token interceptor */
const api = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  timeout: 120_000,
  headers: { 'Content-Type': 'application/json' },
})

// Auth token getter — set by ClerkProvider on mount
let tokenGetter: (() => Promise<string | null>) | null = null

export function setTokenGetter(getter: () => Promise<string | null>) {
  tokenGetter = getter
}

// Request interceptor: attach Bearer token
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  if (tokenGetter) {
    const token = await tokenGetter()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Response interceptor: normalize errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string; message?: string }>) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'Something went wrong'
    return Promise.reject(new ApiError(message, error.response?.status))
  }
)

export class ApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export default api

// ─── Typed API methods ───────────────────────────────────────────────

// Credits
export async function getCreditsBalance() {
  const { data } = await api.get<{ balance: number; success: boolean }>('/api/credits/balance')
  return data
}

// Subscription
export interface SubscriptionInfo {
  plan: string
  status?: string
  termsAccepted?: boolean
}
export async function getSubscription() {
  const { data } = await api.get<SubscriptionInfo>('/api/subscription')
  return data
}

// Terms
export async function acceptTerms() {
  const { data } = await api.post('/api/terms-consent')
  return data
}

export async function checkTerms() {
  const { data } = await api.get<{ accepted: boolean }>('/api/terms-consent')
  return data
}

// Upload
export interface UploadUrlRequest {
  filename: string
  hash?: string
  fileSize?: number
  mimeType?: string
}
export interface UploadUrlResponse {
  signedUrl?: string
  path?: string
  token?: string
  exists: boolean
  publicUrl?: string
  uploadMeta?: {
    hash: string
    fileSize: number
    mimeType: string
    path: string
    userId: string
  }
}
export async function getUploadUrl(data: UploadUrlRequest) {
  const { data: result } = await api.post<UploadUrlResponse>('/api/upload-url', data)
  return result
}

export async function confirmUpload(data: {
  hash: string
  storagePath: string
  publicUrl: string
  fileSize: number
  mimeType: string
  userId: string
}) {
  const { data: result } = await api.post('/api/upload-complete', data)
  return result
}

// Analyze product
export interface AnalysisResult {
  productName: string
  productCategory: string
  hasText: boolean
  extractedText?: string[]
  suggestedModel: string
  suggestedStyle: string
  suggestedHero?: {
    background?: string
    lighting?: string
    composition?: string
  }
  suggestedElementsConfig?: {
    keyElements: string[]
    enhancers: string[]
  }
  suggestedPosterConfig?: Record<string, unknown>
  categoryAttributes?: Record<string, string>
  suggestedStyleVariant?: string
  confidence: number
}
export async function analyzeProduct(imageUrl: string) {
  const { data } = await api.post<AnalysisResult>('/api/analyze-product', { imageUrl })
  return data
}

// Enhance product
export interface EnhanceRequest {
  imageUrl: string
  productName: string
  model?: string
  generationMode?: 'enhance-only' | 'style-only' | 'both'
  secondImageConfig?: {
    type: 'vignette' | 'elements' | 'poster' | '3x3' | 'food'
    elementsConfig?: { keyElements: string[]; enhancers: string[] }
    posterConfig?: Record<string, unknown>
  }
  promptCustomizations?: {
    background?: string
    lighting?: string
    composition?: string
    camera?: string
    style?: string
  }
  seedreamConfig?: { aspect_ratio?: string }
  seasonalEnabled?: boolean
  skipHeroImage?: boolean
  skipSecondImage?: boolean
  categoryAttributes?: Record<string, string>
  suggestedStyleVariant?: string | null
  styleVariantOverride?: string | null
  extractedText?: string[]
}
export interface EnhanceResponse {
  text: string
  heroImageUrl?: string
  vignetteImageUrl?: string
  labels?: string[]
  creditsRemaining: number
  success: boolean
}
export async function enhanceProduct(data: EnhanceRequest) {
  const { data: result } = await api.post<EnhanceResponse>('/api/enhance-product', data)
  return result
}

// Assets
export interface Asset {
  id: string
  productName: string
  heroImageUrl: string | null
  vignetteImageUrl: string | null
  upscaledUrls: string[]
  secondImageType: 'vignette' | 'elements' | 'poster' | '3x3' | 'upscale_batch'
  createdAt: string
}
export async function getAssets() {
  const { data } = await api.get<{ assets: Asset[] }>('/api/assets')
  return data.assets
}

export async function deleteAsset(id: string) {
  await api.delete(`/api/assets/${id}`)
}

// Recent creations
export async function getRecentCreations() {
  const { data } = await api.get<{ images: string[] }>('/api/user/recent-creations')
  return data.images ?? []
}

// Stripe checkout
export async function createCheckoutSession(plan: string, period: string, returnUrl: string) {
  const { data } = await api.post<{ url: string }>('/api/stripe/checkout', {
    plan,
    period,
    returnUrl,
  })
  return data
}

// Credit purchase
export async function purchaseCredits(amount: string, returnUrl: string) {
  const { data } = await api.post<{ url: string; sessionId: string }>('/api/credits/purchase', {
    amount,
    returnUrl,
  })
  return data
}

// Upscale grid
export async function upscaleGrid(imageUrl: string, indices: number[], productName: string, aspectRatio?: string) {
  const { data } = await api.post('/api/upscale-grid', {
    imageUrl,
    indices,
    productName,
    aspectRatio,
  })
  return data
}

// Showcase (public, no auth required)
export async function getShowcaseImages(): Promise<string[]> {
  const { data } = await axios.get<{ images: string[] }>(`${CONFIG.API_BASE_URL}/api/showcase`)
  return data.images
}
