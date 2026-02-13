// AI Abstraction Layer
// Clean interface for future AI integration

export * from './types';
export * from './aiProvider';
export { StubAIProvider } from './providers/stub';
export { OpenAIProvider } from './providers/openai';
