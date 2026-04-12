// ⚠️  SYNC: exact copy of toon-converter/lib/ai-models.ts
// When adding or changing models/credits, update the web file first then copy here.

export type AiProvider = 'google' | 'openai' | 'replicate' | 'minimax' | 'kling' | 'ideogram';

export type AiModelType = 'text' | 'image' | 'analysis' | 'video';

export interface AiModelConfig {
  id: string; // The ID used in the code/API calls
  name: string; // Human readable name
  provider: AiProvider;
  type: AiModelType;
  cost: {
    inputToken?: number; // Cost per 1k input tokens (text models)
    outputToken?: number; // Cost per 1k output tokens (text models)
    perImage?: number; // Cost per generated image
    perSecond?: number; // Cost per second of video (video models)
  };
  credits?: number; // Number of user credits deducted per generation
  /** Price charged to pay-per-use customers per unit (image or second), in USD. 1.8x markup over cost. */
  payPerUseRate?: number;
  inputConfig?: {
    maxTokens?: number;
    defaultResolution?: string;
    maxImages?: number; // For batch generation
  };
}

export const AI_MODELS = {
  // Text & Analysis Models
  GEMINI_FLASH: {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    type: 'text',
    cost: {
      inputToken: 0.0001, // Approximate, check latest pricing
      outputToken: 0.0004 // Approximate
    }
  },
  GTP_4o: {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    type: 'text',
    cost: {
      inputToken: 0.0005, // Placeholder/Estimate
      outputToken: 0.0015 // Placeholder/Estimate
    }
  },
  GPT_5_NANO: {
    id: 'gpt-5-nano',
    name: 'GPT-5 Nano',
    provider: 'openai',
    type: 'text',
    cost: {
      inputToken: 0.0005, // Placeholder/Estimate
      outputToken: 0.0015 // Placeholder/Estimate
    }
  },
  GPT_4O_MINI: {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    type: 'text',
    cost: {
      inputToken: 0.00015, // $0.15 per 1M tokens
      outputToken: 0.0006  // $0.60 per 1M tokens
    }
  },
  GEMINI_3_IMAGE: {
    id: 'gemini-3-pro-image-preview',
    name: 'Nano Banana Pro',
    provider: 'google',
    type: 'image',
    credits: 3,
    cost: {
      perImage: 0.0672
    },
    payPerUseRate: 0.121, // $0.0672 × 1.8
    inputConfig: {
      defaultResolution: '2K'
    }
  },
  GEMINI_3_1_FLASH_IMAGE: {
    id: 'gemini-3.1-flash-image-preview',
    name: 'Nano Banana 2',
    provider: 'google',
    type: 'image',
    credits: 2,
    cost: {
      perImage: 0.04
    },
    payPerUseRate: 0.072, // $0.04 × 1.8
    inputConfig: {
      defaultResolution: '2K'
    }
  },
  GEMINI_NANO_BANANA_REPLICATE: {
    id: 'google/nano-banana-pro',
    name: 'Nano Banana Pro (Replicate)',
    provider: 'replicate',
    type: 'image',
    credits: 3,
    cost: {
      perImage: 0.04 // "fallback" resolution tier on Replicate
    },
    payPerUseRate: 0.072, // $0.04 × 1.8
  },
  SEEDREAM_4_5: {
    id: 'bytedance/seedream-4.5',
    name: 'SeeDream 4.5',
    provider: 'replicate',
    type: 'image',
    credits: 1,
    cost: {
      perImage: 0.034
    },
    payPerUseRate: 0.061, // $0.034 × 1.8
  },
  SEEDREAM_5_LITE: {
    id: 'bytedance/seedream-5-lite',
    name: 'SeeDream 5 Lite',
    provider: 'replicate',
    type: 'image',
    credits: 2,
    cost: {
      perImage: 0.04
    },
    payPerUseRate: 0.072, // $0.04 × 1.8
    inputConfig: {
      defaultResolution: '2K',
      maxImages: 1
    }
  },
  SEEDREAM_4: {
    id: 'bytedance/seedream-4',
    name: 'SeeDream 4.0',
    provider: 'replicate',
    type: 'image',
    cost: {
      perImage: 0.04 // Replicate run cost estimate
    },
    payPerUseRate: 0.072, // $0.04 × 1.8
  },
  QWEN_IMAGE_EDIT: {
    id: 'qwen/qwen-image-edit-plus',
    name: 'Qwen Image Edit Plus',
    provider: 'replicate',
    type: 'image',
    cost: {
      perImage: 0.04 // Replicate run cost estimate
    },
    payPerUseRate: 0.072, // $0.04 × 1.8
  },
  QWEN_IMAGE_EDIT_2511: {
    id: 'qwen/qwen-image-edit-2511',
    name: 'Qwen Image Edit 2511',
    provider: 'replicate',
    type: 'image',
    cost: {
      perImage: 0.04 // Replicate run cost estimate
    },
    payPerUseRate: 0.072, // $0.04 × 1.8
  },
  Z_IMAGE_TURBO: {
    id: 'prunaai/z-image-turbo',
    name: 'Z-Image Turbo',
    provider: 'replicate',
    type: 'image',
    cost: {
      perImage: 0.04
    },
    payPerUseRate: 0.072, // $0.04 × 1.8
  },
  FLUX_2_PRO: {
    id: 'black-forest-labs/flux-2-pro',
    name: 'Flux 2 Pro',
    provider: 'replicate',
    type: 'image',
    cost: {
      perImage: 0.06 // Estimate
    },
    payPerUseRate: 0.108, // $0.06 × 1.8
  },
  // Ideogram V3 Models
  IDEOGRAM_V3_TURBO: {
    id: 'ideogram-v3-turbo',
    name: 'Ideogram V3 Turbo',
    provider: 'ideogram',
    type: 'image',
    credits: 1,
    cost: {
      perImage: 0.03
    },
    payPerUseRate: 0.054, // $0.03 × 1.8
    inputConfig: {
      maxImages: 8,
    },
  },
  IDEOGRAM_V3_DEFAULT: {
    id: 'ideogram-v3-default',
    name: 'Ideogram V3',
    provider: 'ideogram',
    type: 'image',
    credits: 2,
    cost: {
      perImage: 0.06
    },
    payPerUseRate: 0.108, // $0.06 × 1.8
    inputConfig: {
      maxImages: 8,
    },
  },
  IDEOGRAM_V3_QUALITY: {
    id: 'ideogram-v3-quality',
    name: 'Ideogram V3 Quality',
    provider: 'ideogram',
    type: 'image',
    credits: 3,
    cost: {
      perImage: 0.09
    },
    payPerUseRate: 0.162, // $0.09 × 1.8
    inputConfig: {
      maxImages: 8,
    },
  },
  // Video Models
  KLING_V3: {
    id: 'kling-v3',
    name: 'Kling V3',
    provider: 'kling',
    type: 'video',
    credits: 10, // Per 5s clip
    cost: {
      perSecond: 0.084 // $0.084/s standard mode
    },
    payPerUseRate: 0.151, // $0.084 × 1.8 per second
  },
  KLING_V21_PRO_REPLICATE: {
    id: 'klingai/kling-v2-1-pro',
    name: 'Kling V2.1 Pro',
    provider: 'replicate',
    type: 'video',
    credits: 8, // Per 5s clip
    cost: {
      perSecond: 0.098 // Replicate run cost estimate
    },
    payPerUseRate: 0.176, // $0.098 × 1.8 per second
  },
} as const;

// Derive a union type of all image model keys (e.g. 'GEMINI_3_IMAGE' | 'SEEDREAM_4_5' | ...)
type ImageModelKey = {
  [K in keyof typeof AI_MODELS]: (typeof AI_MODELS)[K]['type'] extends 'image' ? K : never;
}[keyof typeof AI_MODELS];

// Union type of all image model IDs (e.g. 'gemini-3-pro-image-preview' | 'bytedance/seedream-4.5' | ...)
export type ImageModelId = (typeof AI_MODELS)[ImageModelKey]['id'];

// All available image model IDs for selectors/validation
export const IMAGE_MODEL_IDS = Object.values(AI_MODELS)
  .filter(m => m.type === 'image')
  .map(m => m.id) as ImageModelId[];

// Check if a model ID is a Seedream model
export function isSeedreamModel(modelId: string): boolean {
  return modelId.includes('seedream');
}

// Check if a model ID is an Ideogram model
export function isIdeogramModel(modelId: string): boolean {
  return modelId.startsWith('ideogram-');
}

// Get the Ideogram rendering speed from a model ID
export function getIdeogramRenderingSpeed(modelId: string): 'TURBO' | 'DEFAULT' | 'QUALITY' {
  if (modelId.includes('turbo')) return 'TURBO'
  if (modelId.includes('quality')) return 'QUALITY'
  return 'DEFAULT'
}

// Check if a model ID is the Flash-tier Gemini image model (Nano Banana 2)
export function isFlashImageModel(modelId: string): boolean {
  return modelId === AI_MODELS.GEMINI_3_1_FLASH_IMAGE.id;
}

// Helper to get config by ID
export function getModelConfig(modelId: string): AiModelConfig | undefined {
  return Object.values(AI_MODELS).find(model => model.id === modelId);
}

// Helper to get all available models for a specific type
export function getModelsByType(type: AiModelType): AiModelConfig[] {
  return Object.values(AI_MODELS).filter(model => model.type === type);
}

// Helper to get the credit cost for a model by ID.
// Falls back to `defaultCredits` (default 2) if the model or credits field is not found.
export function getModelCredits(modelId: string, defaultCredits = 2): number {
  const config = getModelConfig(modelId)
  return config?.credits ?? defaultCredits
}

// Helper to get the pay-per-use rate (USD) for a model.
// For image models: per image. For video models: per second.
export function getPayPerUseRate(modelId: string): number | undefined {
  const config = getModelConfig(modelId)
  return config?.payPerUseRate
}

// Resolution premium added on top of base model credits
export const RESOLUTION_PREMIUM: Record<string, number> = { '2K': 0, '4K': 2 }

// Get total credit cost for a model + resolution combo
export function getModelCreditsWithResolution(modelId: string, resolution: string): number {
  return getModelCredits(modelId) + (RESOLUTION_PREMIUM[resolution] ?? 0)
}

// Video duration multiplier (base credits are for 5s, 10s costs 2x)
export const VIDEO_DURATION_MULTIPLIER: Record<number, number> = { 5: 1, 10: 2 }

// Get total credit cost for a video model + duration combo
export function getVideoCredits(modelId: string, durationSeconds: number): number {
  return getModelCredits(modelId) * (VIDEO_DURATION_MULTIPLIER[durationSeconds] ?? 1)
}

// Derive video model IDs
type VideoModelKey = {
  [K in keyof typeof AI_MODELS]: (typeof AI_MODELS)[K]['type'] extends 'video' ? K : never;
}[keyof typeof AI_MODELS];

export type VideoModelId = (typeof AI_MODELS)[VideoModelKey]['id'];

export const VIDEO_MODEL_IDS = Object.values(AI_MODELS)
  .filter(m => m.type === 'video')
  .map(m => m.id) as VideoModelId[];

// ─── Pay-per-use display helpers ───────────────────────────────────────

/** Format a USD rate for display (e.g. 0.072 → "$0.07") */
export function formatUsdRate(usd: number): string {
  return `$${usd.toFixed(2)}`
}

/**
 * Get the display label for a model's cost based on the user's plan.
 * Pay-per-use users see "$0.07" while credit-plan users see "3 credits".
 */
export function getCostLabel(
  modelId: string,
  isPayPerUse: boolean,
  opts?: { resolution?: string; videoDuration?: number }
): string {
  if (isPayPerUse) {
    const rate = getPayPerUseRate(modelId)
    if (!rate) return 'metered'
    if (opts?.videoDuration) {
      return formatUsdRate(rate * opts.videoDuration)
    }
    return formatUsdRate(rate)
  }

  // Credit-based plans
  let credits: number
  if (opts?.videoDuration) {
    credits = getVideoCredits(modelId, opts.videoDuration)
  } else if (opts?.resolution) {
    credits = getModelCreditsWithResolution(modelId, opts.resolution)
  } else {
    credits = getModelCredits(modelId)
  }
  return `${credits} credit${credits !== 1 ? 's' : ''}`
}
