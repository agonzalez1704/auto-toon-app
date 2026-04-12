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
  const { data } = await api.post<{ success: boolean; result: AnalysisResult }>('/api/analyze-product', { imageUrl })
  return data.result
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

// Restore
export interface RestoreRequest {
  imageUrl: string
  aiModel?: string
  resolution: '2K' | '4K'
}
export interface RestoreResponse {
  success: boolean
  restoredImageUrl: string
  creditsRemaining: number
}
export async function restoreImage(data: RestoreRequest) {
  const { data: result } = await api.post<RestoreResponse>('/api/restore', data)
  return result
}

// Assets
export interface Asset {
  id: string
  productName: string
  heroImageUrl: string | null
  vignetteImageUrl: string | null
  originalImageUrl?: string | null // original image for restore before/after
  upscaledUrls: string[]
  secondImageType: 'vignette' | 'elements' | 'poster' | '3x3' | 'food' | 'none' | 'upscale_batch' | 'restore' | 'fashion_editorial'
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
export async function getRecentCreations(limit = 30, offset = 0) {
  const { data } = await api.get<{ images: string[]; total: number }>(
    `/api/user/recent-creations?limit=${limit}&offset=${offset}`
  )
  return data
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

// Generate fashion model
export interface GenerateModelRequest {
  prompt: string
  width?: number
  height?: number
  output_format?: 'jpg' | 'png' | 'webp'
  guidance_scale?: number
  output_quality?: number
  num_inference_steps?: number
  aiModelId?: string
  image?: string
  imageBase64?: string
}
export interface GenerateModelResponse {
  imageUrl: string
  creditsRemaining: number
  success: boolean
}
export async function generateFashionModel(data: GenerateModelRequest) {
  const { data: result } = await api.post<GenerateModelResponse>(
    '/api/generate-fashion-model',
    data
  )
  return result
}

// Generate character sheet
export interface CharacterSheetRequest {
  referenceImageUrl: string
  modelName?: string
  prompt: string
  config?: Record<string, unknown>
}
export interface CharacterSheetResponse {
  model: {
    id: string
    name: string
    imageUrl: string
    characterSheetUrl: string
    prompt: string
    config?: Record<string, unknown>
  }
  creditsRemaining: number
}
export async function generateCharacterSheet(data: CharacterSheetRequest) {
  const { data: result } = await api.post<CharacterSheetResponse>(
    '/api/fashion-model/generate-character-sheet',
    data,
    { timeout: 300_000 } // 5 min timeout for character sheet generation
  )
  return result
}

// List fashion models from database
export interface FashionModelListItem {
  id: string
  name: string
  imageUrl: string
  prompt: string
  config?: Record<string, unknown>
  characterSheetUrl: string | null
  createdAt: string
}
export async function listFashionModels() {
  const { data } = await api.get<{ models: FashionModelListItem[] }>('/api/fashion-model/list')
  return data.models
}

// Analyze face photo (OpenAI Vision)
export interface FaceAnalysisResponse {
  subjectDescriptor: string
  phenotype: string
  style: string
  fullPrompt: string
}
export async function analyzeFacePhoto(imageBase64: string) {
  const { data } = await api.post<{ analysis: string }>(
    '/api/fashion-model/analyze-photo',
    { imageBase64 }
  )
  return JSON.parse(data.analysis) as FaceAnalysisResponse
}

// Analyze body photo (Gemini Vision)
export interface BodyAnalysisResponse {
  isPerson: boolean
  bodyType: string
  clothing: string
  pose: string
  accessories: string
  footwear: string
}
export async function analyzeBodyPhoto(imageBase64: string) {
  const { data } = await api.post<{ analysis: BodyAnalysisResponse }>(
    '/api/fashion-model/analyze-body',
    { imageBase64 }
  )
  return data.analysis
}

// Video analysis (AI-driven prompt generation)
export interface VideoAnalysisResult {
  productName: string
  productCategory: string
  motionPrompt: string
  cameraPreset: string
  duration: 5 | 10
  aspectRatio: '16:9' | '9:16' | '1:1'
  creativeBrief: string
  confidence: number
}

export async function analyzeProductForVideo(
  imageUrl: string,
  productName?: string,
  productCategory?: string
) {
  const { data } = await api.post<{ success: boolean; result: VideoAnalysisResult }>(
    '/api/fashion-editorial/video/analyze',
    { imageUrl, productName, productCategory }
  )
  return data.result
}

// Video generation
export interface VideoGenerateRequest {
  sourceImageUrl: string
  tailImageUrl?: string
  motionPrompt?: string
  duration?: 5 | 10
  aspectRatio?: '16:9' | '9:16' | '1:1'
  cameraPreset?: string
  aiModel?: string
}

export interface VideoProgressEvent {
  type: 'progress'
  message: string
  percent: number
}

export interface VideoSuccessEvent {
  type: 'success'
  videoUrl: string
  videoGenerationId: string
  lastFrameUrl: string | null
  provider: string
}

export interface VideoErrorEvent {
  type: 'error'
  message: string
}

export interface VideoGeneration {
  id: string
  status: 'processing' | 'completed' | 'failed'
  sourceImageUrl: string
  videoUrl: string | null
  duration: number
  aspectRatio: string
  motionPrompt: string | null
  creditsCharged: number
  createdAt: string
}

/**
 * Start video generation via SSE stream.
 * Uses XMLHttpRequest for React Native SSE compatibility.
 * Returns an abort controller to cancel the request.
 */
export function generateVideoSSE(
  params: VideoGenerateRequest,
  callbacks: {
    onProgress: (event: VideoProgressEvent) => void
    onSuccess: (event: VideoSuccessEvent) => void
    onError: (message: string) => void
    onComplete?: () => void
  }
): { abort: () => void } {
  const xhr = new XMLHttpRequest()
  let buffer = ''

  const parseSSEBuffer = () => {
    const lines = buffer.split('\n')
    buffer = lines.pop() || '' // Keep incomplete line in buffer

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data: ')) continue

      try {
        const data = JSON.parse(trimmed.slice(6))
        if (data.type === 'progress') {
          callbacks.onProgress(data as VideoProgressEvent)
        } else if (data.type === 'success') {
          callbacks.onSuccess(data as VideoSuccessEvent)
        } else if (data.type === 'error') {
          callbacks.onError((data as VideoErrorEvent).message)
        } else if (data.type === 'complete') {
          callbacks.onComplete?.()
        }
      } catch {
        // Ignore malformed JSON lines
      }
    }
  }

  // We need to get the auth token before opening the request
  const startRequest = async () => {
    let authToken: string | null = null
    if (tokenGetter) {
      authToken = await tokenGetter()
    }

    xhr.open('POST', `${CONFIG.API_BASE_URL}/api/fashion-editorial/video/generate`)
    xhr.setRequestHeader('Content-Type', 'application/json')
    if (authToken) {
      xhr.setRequestHeader('Authorization', `Bearer ${authToken}`)
    }

    let lastIndex = 0
    let errorHandled = false

    xhr.onreadystatechange = () => {
      // When request completes, check for non-SSE error responses
      if (xhr.readyState === 4 && !errorHandled) {
        if (xhr.status !== 200) {
          errorHandled = true
          let message = 'Video generation failed'
          try {
            const body = JSON.parse(xhr.responseText)
            message = body.error || message
          } catch {
            // Not JSON — use status text
            if (xhr.statusText) message = xhr.statusText
          }
          callbacks.onError(`${message} (${xhr.status})`)
          return
        }
      }

      // Stream SSE data as it arrives
      if (xhr.readyState >= 3 && xhr.responseText) {
        const newText = xhr.responseText.substring(lastIndex)
        lastIndex = xhr.responseText.length
        if (newText) {
          buffer += newText
          parseSSEBuffer()
        }
      }
    }

    xhr.onerror = () => {
      if (!errorHandled) {
        errorHandled = true
        callbacks.onError('Network error during video generation')
      }
    }

    xhr.ontimeout = () => {
      if (!errorHandled) {
        errorHandled = true
        callbacks.onError('Video generation request timed out')
      }
    }

    xhr.timeout = 600_000 // 10 min timeout

    xhr.send(JSON.stringify(params))
  }

  startRequest().catch((err) => {
    callbacks.onError(err?.message || 'Failed to start video generation')
  })

  return {
    abort: () => {
      try { xhr.abort() } catch { /* ignore */ }
    },
  }
}

// Get user's generated videos
export async function getUserVideos() {
  const { data } = await api.get<{ videos: VideoGeneration[] }>('/api/fashion-editorial/videos')
  return data.videos ?? []
}

// ─── Fashion Editorial ─────────────────────────────────────────────

export interface FashionImageAnalysis {
  productName: string
  productType: string
  clothingAnalysis: string
  itemCount: number
}

export async function analyzeFashionImage(imageUrl: string) {
  const { data } = await api.post<{ success: boolean } & FashionImageAnalysis>(
    '/api/fashion-editorial/analyze-image',
    { imageUrl }
  )
  return data
}

export interface MakeupAnalysis {
  analysis: string
  mode: 'face' | 'product'
}

export async function analyzeMakeup(imageBase64: string) {
  const { data } = await api.post<MakeupAnalysis>(
    '/api/fashion-editorial/analyze-makeup',
    { imageBase64 }
  )
  return data
}

export interface HairstyleAnalysis {
  styleAnalysis: string
  colorAnalysis: string
  mode: 'face' | 'product'
}

export async function analyzeHairstyle(imageBase64: string) {
  const { data } = await api.post<HairstyleAnalysis>(
    '/api/fashion-editorial/analyze-hairstyle',
    { imageBase64 }
  )
  return data
}

export interface FashionEditorialRequest {
  modelId: string
  clothingImageUrls: string[]
  makeupAnalysis?: string
  hairstyleAnalysis?: string
  styleData?: { style: string; customStyle?: string }
  backgroundData?: { background: string; customBackground?: string }
  promptModifier?: string
  aiModel?: string
  aspectRatio?: string
  /** Inline model data — used by mobile app where models aren't in the DB */
  models?: { modelId: string; clothingImageUrls: string[]; imageUrl?: string; prompt?: string; characterSheetUrl?: string }[]
}

export async function generateFashionEditorial(params: FashionEditorialRequest) {
  const { data } = await api.post<{ imageUrl: string; creditsRemaining: number }>(
    '/api/fashion-editorial/generate',
    params,
    { timeout: 300_000 }
  )
  return data
}

export interface FashionVariationsRequest {
  baseImageUrl: string
  modelImageUrls?: string[]
  clothingImageUrls?: string[]
  poseStyle: string
  aspectRatio?: string
  mainProductInfo?: { productName: string; productType?: string; clothingAnalysis?: string }
  makeupAnalysis?: string
  hairstyleAnalysis?: string
  model?: string
}

export async function generateFashionVariations(params: FashionVariationsRequest) {
  const { data } = await api.post<{ success: boolean; variations: string[] }>(
    '/api/fashion-editorial/variations',
    params,
    { timeout: 300_000 }
  )
  return data
}

// Relight
export type RelightMode = 'object' | 'character'

export interface RelightRequest {
  baseImageUrl: string
  mode: RelightMode
  presetId: string
  customText?: string
}

export interface RelightResponse {
  success: boolean
  relitImageUrl: string
}

export async function relightImage(params: RelightRequest): Promise<RelightResponse> {
  const { data } = await api.post<RelightResponse>(
    '/api/relight/generate',
    params,
    { timeout: 300_000 }
  )
  return data
}

// Push notifications
export async function registerPushToken(pushToken: string, platform: string) {
  await api.post('/api/notifications/register', { pushToken, platform })
}

export async function updateNotificationSettings(enabled: boolean) {
  const { data } = await api.put('/api/notifications/settings', { enabled })
  return data
}

// Showcase images — fetched from API with hardcoded fallback
const SHOWCASE_FALLBACK = [
  'https://auto-toon.com/previews/generation.png',
  'https://auto-toon.com/previews/pro-photo.png',
  'https://auto-toon.com/previews/vignette.png',
  'https://auto-toon.com/previews/elements.png',
  'https://auto-toon.com/previews/3x3.png',
  'https://auto-toon.com/previews/elements-image.png',
  'https://auto-toon.com/previews/fashion-editorial-1.png',
  'https://auto-toon.com/previews/fashion-editorial-2.png',
  'https://auto-toon.com/previews/fashion-editorial-3.png',
  'https://auto-toon.com/previews/fashion-editorial-4.png',
  'https://auto-toon.com/previews/upscaled_1773202961651_2.jpg',
  'https://auto-toon.com/previews/upscaled_1773202996947_3.jpg',
]

export async function getShowcaseImages(): Promise<string[]> {
  try {
    const { data } = await api.get<{ images: string[] }>('/api/showcase')
    if (data.images?.length) return data.images
  } catch {
    // Fall back to hardcoded list
  }
  return SHOWCASE_FALLBACK
}

// Dashboard
export interface DashboardData {
  credits: number
  plan: string
  status: string | null
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
  generationsThisMonth: number
  apiKeys: {
    id: string
    label: string | null
    prefix: string
    lastEight: string
    createdAt: string
    lastUsedAt: string | null
  }[]
  recentImages: { url: string; date: string; name: string }[]
}

export async function getDashboard() {
  const { data } = await api.get<DashboardData>('/api/dashboard')
  return data
}

// Usage (pay-per-use billing)
export interface UsageData {
  currentPeriodSpendCents: number
  spendingLimitCents: number
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  recentTransactions: {
    amount: number
    metadata: Record<string, unknown>
    createdAt: string
  }[]
}

export async function getCurrentUsage() {
  const { data } = await api.get<UsageData>('/api/usage/current')
  return data
}
