// ─── Types ──────────────────────────────────────────────────────────

export type GenerationMode = 'use-face' | 'describe-generate'

export interface FaceAnalysis {
  subjectDescriptor: string
  phenotype: string
  style: string
  fullPrompt: string
}

export interface BodyAnalysis {
  isPerson: boolean
  bodyType: string
  clothing: string
  pose: string
  accessories: string
  footwear: string
}

export interface SavedModel {
  id: string
  name: string
  imageUrl: string
  prompt: string
  facePhotoUrl?: string
  bodyPhotoUrl?: string
  characterSheetUrl?: string
  createdAt: string
}
