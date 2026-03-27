// ⚠️  SYNC: exact copy of toon-converter/lib/ai-models.ts
// When adding or changing models/credits, update the web file first then copy here.

export type AiProvider = 'google' | 'openai' | 'replicate' | 'minimax' | 'kling';

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
      perImage: 0.04 // Estimate
    },
    inputConfig: {
      defaultResolution: '2K'
    }
  },
  GEMINI_3_1_FLASH_IMAGE: {
    id: 'gemini-3.1-flash-image-preview',
    name: 'Nano Banana 2',
    provider: 'google',
    type: 'image',
    credits: 3,
    cost: {
      perImage: 0.0672 // $0.0672 per image output
    },
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
    }
  },
  SEEDREAM_4_5: {
    id: 'bytedance/seedream-4.5',
    name: 'SeeDream 4.5',
    provider: 'replicate',
    type: 'image',
    credits: 1,
    cost: {
      perImage: 0.04 // Replicate run cost estimate
    }
  },
  SEEDREAM_5_LITE: {
    id: 'bytedance/seedream-5-lite',
    name: 'SeeDream 5 Lite',
    provider: 'replicate',
    type: 'image',
    credits: 2,
    cost: {
      perImage: 0.034 // Replicate run cost estimate (lite tier)
    },
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
    }
  },
  QWEN_IMAGE_EDIT: {
    id: 'qwen/qwen-image-edit-plus',
    name: 'Qwen Image Edit Plus',
    provider: 'replicate',
    type: 'image',
    cost: {
      perImage: 0.04 // Replicate run cost estimate
    }
  },
  QWEN_IMAGE_EDIT_2511: {
    id: 'qwen/qwen-image-edit-2511',
    name: 'Qwen Image Edit 2511',
    provider: 'replicate',
    type: 'image',
    cost: {
      perImage: 0.04 // Replicate run cost estimate
    }
  },
  Z_IMAGE_TURBO: {
    id: 'prunaai/z-image-turbo',
    name: 'Z-Image Turbo',
    provider: 'replicate',
    type: 'image',
    cost: {
      perImage: 0.04
    }
  },
  FLUX_2_PRO: {
    id: 'black-forest-labs/flux-2-pro',
    name: 'Flux 2 Pro',
    provider: 'replicate',
    type: 'image',
    cost: {
      perImage: 0.06 // Estimate
    }
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
    }
  },
  KLING_V21_PRO_REPLICATE: {
    id: 'klingai/kling-v2-1-pro',
    name: 'Kling V2.1 Pro',
    provider: 'replicate',
    type: 'video',
    credits: 8, // Per 5s clip
    cost: {
      perSecond: 0.098 // Replicate run cost estimate
    }
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
