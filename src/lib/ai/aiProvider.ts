// ============================================================================
// AI Provider Factory
// Central access point for AI functionality
// ============================================================================

import type { AIProvider } from './types';
import { StubAIProvider } from './providers/stub';
import { OpenAIProvider } from './providers/openai';

export type AIProviderName = 'stub' | 'openai' | 'anthropic';

// Singleton instances
let stubProvider: StubAIProvider | null = null;
let openaiProvider: OpenAIProvider | null = null;

/**
 * Get AI provider by name
 * Returns stub provider by default (v1 behavior)
 */
export function getAIProvider(name: AIProviderName = 'stub'): AIProvider {
  switch (name) {
    case 'openai':
      if (!openaiProvider) {
        openaiProvider = new OpenAIProvider();
      }
      return openaiProvider;

    case 'anthropic':
      // TODO: Implement Anthropic provider
      throw new Error('Anthropic provider not yet implemented');

    case 'stub':
    default:
      if (!stubProvider) {
        stubProvider = new StubAIProvider();
      }
      return stubProvider;
  }
}

/**
 * Get the default AI provider based on configuration
 * In v1, always returns stub provider
 * In v2, will check for available providers
 */
export function getDefaultAIProvider(): AIProvider {
  // Check if OpenAI is configured
  if (process.env.OPENAI_API_KEY) {
    const provider = getAIProvider('openai');
    if (provider.isAvailable()) {
      return provider;
    }
  }

  // Fall back to stub provider
  return getAIProvider('stub');
}

/**
 * Check if any AI provider is available for actual AI calls
 * (not counting stub provider)
 */
export function isAIAvailable(): boolean {
  const openai = getAIProvider('openai');
  return openai.isAvailable();
}

/**
 * Get list of available AI providers
 */
export function getAvailableProviders(): AIProviderName[] {
  const available: AIProviderName[] = ['stub']; // Stub is always available

  if (process.env.OPENAI_API_KEY) {
    available.push('openai');
  }

  return available;
}
