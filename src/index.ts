// Export main client
export { NovelAI } from "./client";

// Export image class
export { Image, MsgpackEvent, EventType } from "./image";

// Export constants
export {
  Action,
  Controlnet,
  DirectorTools,
  EmotionLevel,
  EmotionOptions,
  Host,
  Model,
  Noise,
  Resolution,
  RESOLUTION_DIMENSIONS,
  Sampler,
  TextModel,
} from "./constants";

// Export types
export type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatMessage,
  ChatRole,
  CharacterCaption,
  CharacterPrompt,
  Completion,
  DirectorRequest,
  EnhanceOptions,
  ImageInput,
  ImageOptions,
  Metadata,
  NovelAIOptions,
  NovelAIResponse,
  ParsedImage,
  PositionCoords,
  RetryConfig,
  TagSuggestion,
  TextGenerationOptions,
  V4CaptionFormat,
  V4ConditionInput,
  V4NegativePromptFormat,
  V4PromptFormat,
} from "./types";

// Export utilities
export {
  NovelAIApiError,
  SSEStream,
  StreamingMsgpackParser,
  StreamingSSEParser,
  calculateCost,
  createFilename,
  DEFAULT_RETRY_CONFIG,
  deduplicateTags,
  ensureDirectoryExists,
  formatFileSize,
  parseImage,
  parseStreamEvents,
  prepareMetadataForApi,
  scaleDimensions,
  MAX_PIXELS,
  saveBinaryFile,
  base64ToUint8Array,
  uint8ArrayToBase64,
  withRetry,
  extractImageMetadata,
  getImageSummary,
} from "./utils";
