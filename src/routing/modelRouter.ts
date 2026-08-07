import { resolveApiKey, ResolvedKeyContext } from './apiKeyResolver';

export type ModelTier = 'flagship' | 'tier2' | 'tier3' | 'user_key';

export interface ModelRoutingResult {
  modelUsed: string;
  tierUsed: ModelTier;
  text?: string;
}

export const MODEL_TIERS: Record<Exclude<ModelTier, 'user_key'>, string[]> = {
  flagship: ['gemini-3.1-pro-preview', 'gemini-3.1-pro', 'gemini-2.5-pro'],
  tier2: ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'],
  tier3: ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite'],
};

/**
 * Evaluates the model to use and maps execution tier based on user choice,
 * cascading fallback state, and API key source.
 */
export function getModelRoutingPlan(
  userRequestedModel: string,
  customApiKeyInput?: string
): { keyContext: ResolvedKeyContext; targetModels: string[]; primaryTier: ModelTier } {
  const keyContext = resolveApiKey(customApiKeyInput);

  if (keyContext.source === 'user_key') {
    const candidateModels = Array.from(
      new Set([
        userRequestedModel,
        ...MODEL_TIERS.tier2,
        ...MODEL_TIERS.tier3,
      ])
    ).filter(Boolean);

    return {
      keyContext,
      targetModels: candidateModels,
      primaryTier: 'user_key',
    };
  }

  // Determine tier based on model name requested
  let primaryTier: ModelTier = 'tier2';
  if (MODEL_TIERS.flagship.some((m) => m === userRequestedModel)) {
    primaryTier = 'flagship';
  } else if (MODEL_TIERS.tier3.some((m) => m === userRequestedModel)) {
    primaryTier = 'tier3';
  }

  const targetModels = Array.from(
    new Set([
      userRequestedModel,
      ...MODEL_TIERS.flagship,
      ...MODEL_TIERS.tier2,
      ...MODEL_TIERS.tier3,
    ])
  ).filter(Boolean);

  return {
    keyContext,
    targetModels,
    primaryTier,
  };
}

/**
 * Maps a specific model used to its corresponding execution tier
 */
export function getTierForModel(modelName: string, isUserKey: boolean): ModelTier {
  if (isUserKey) return 'user_key';
  if (MODEL_TIERS.flagship.includes(modelName)) return 'flagship';
  if (MODEL_TIERS.tier3.includes(modelName)) return 'tier3';
  return 'tier2';
}
