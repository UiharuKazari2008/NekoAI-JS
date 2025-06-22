/**
 * Utilities module for NekoAI-JS
 * Exports functions grouped by their domains of responsibility
 */

// Re-export all utility functions from individual modules
export * from "./platform-utils";
export * from "./fs-utils";
export * from "./http-utils";
export * from "./retry-utils";
export * from "./image-utils";
export * from "./metadata-utils";
export * from "./tag-utils";

export {
  extractImageMetadata,
  extractRawMetadata,
  getImageSummary,
  MetadataType,
  type MetadataEntry,
  type ImageMetadata,
  type ImageSummary,
} from "./parse-utils";

export {
  generateXCorrelationId,
  generateXInitiatedAt,
  prepHeaders,
  handleResponse,
  StreamingMsgpackParser,
  parseMsgpackEvents,
  parseMsgpackMessage,
  createMsgpackEvent,
} from "./http-utils";
