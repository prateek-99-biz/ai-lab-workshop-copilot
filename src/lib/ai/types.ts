// ============================================================================
// AI Provider Types
// Abstraction layer for future AI integration
// ============================================================================

/**
 * Message role for chat-style interactions
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * Chat message structure
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
}

/**
 * Options for AI completion requests
 */
export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
}

/**
 * Completion response structure
 */
export interface CompletionResponse {
  content: string;
  finishReason: 'stop' | 'length' | 'content_filter' | 'error';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Prompt improvement suggestion
 */
export interface PromptSuggestion {
  original: string;
  improved: string;
  explanation: string;
  category: 'clarity' | 'specificity' | 'structure' | 'context';
}

/**
 * Prompt clustering result
 */
export interface PromptCluster {
  name: string;
  description: string;
  prompts: string[];
  count: number;
}

/**
 * Session summary result
 */
export interface SessionSummary {
  totalParticipants: number;
  completionRate: number;
  topThemes: string[];
  highlights: string[];
  recommendations: string[];
}

/**
 * AI Provider interface
 * All AI providers must implement this interface
 */
export interface AIProvider {
  /**
   * Provider name identifier
   */
  readonly name: string;

  /**
   * Check if the provider is configured and available
   */
  isAvailable(): boolean;

  /**
   * Generate a completion from messages
   */
  complete(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResponse>;

  /**
   * Generate prompt improvement suggestions
   */
  suggestPromptImprovements(
    prompt: string
  ): Promise<PromptSuggestion[]>;

  /**
   * Cluster similar prompts together
   */
  clusterPrompts(
    prompts: string[]
  ): Promise<PromptCluster[]>;

  /**
   * Generate session summary
   */
  generateSessionSummary(
    submissions: string[],
    context: {
      sessionName: string;
      participantCount: number;
    }
  ): Promise<SessionSummary>;
}

/**
 * Error thrown when AI provider is not available
 */
export class AIProviderNotAvailableError extends Error {
  constructor(providerName: string) {
    super(`AI provider '${providerName}' is not available. Please configure the required API keys.`);
    this.name = 'AIProviderNotAvailableError';
  }
}

/**
 * Error thrown when AI request fails
 */
export class AIRequestError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'AIRequestError';
  }
}
