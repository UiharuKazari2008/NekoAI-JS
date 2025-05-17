// Export main client
export { NovelAI } from "./client";

// Export image class
export { Image } from "./image";

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
  createCustomHost,
} from "./constants";

// Export types
export type {
  CharacterCaption,
  CharacterPrompt,
  CustomHost,
  DirectorRequest,
  HostInstance,
  ImageOptions,
  Metadata,
  NovelAIError,
  NovelAIOptions,
  NovelAIResponse,
  PositionCoords,
  RetryConfig,
  User,
  V4CaptionFormat,
  V4NegativePromptFormat,
  V4PromptFormat,
} from "./types";

// Export utilities
export {
  calculateCost,
  createFilename,
  DEFAULT_RETRY_CONFIG,
  deduplicateTags,
  ensureDirectoryExists,
  formatFileSize,
  parseImage,
  prepareMetadataForApi,
  saveBinaryFile,
  base64ToUint8Array,
  uint8ArrayToBase64,
  withRetry,
  extractImageMetadata,
  getImageSummary,
} from "./utils";
