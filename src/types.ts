import {
  Action,
  Controlnet,
  EmotionLevel,
  EmotionOptions,
  Host,
  Model,
  Noise,
  Resolution,
  Sampler,
} from "./constants";

// Host related types
export interface HostInstance {
  url: string;
  accept: string;
  name: string;
}

export interface CustomHost extends HostInstance {}

// User related types
export interface User {
  token: string;
}

/**
 * Configuration for API request retries
 */
export interface RetryConfig {
  /**
   * Whether to enable retry for failed requests
   * @default true
   */
  enabled?: boolean;

  /**
   * Maximum number of retry attempts
   * @default 3
   */
  maxRetries?: number;

  /**
   * Base delay between retries in milliseconds
   * Will be used with exponential backoff
   * @default 1000 (1 second)
   */
  baseDelay?: number;

  /**
   * Maximum delay between retries in milliseconds
   * @default 30000 (30 seconds)
   */
  maxDelay?: number;

  /**
   * HTTP status codes that should trigger a retry
   * By default, retries on rate limits (429) and server errors (500-599)
   * @default [429, 500, 501, 502, 503, 504, 507, 508, 509]
   */
  retryStatusCodes?: number[];
}

// Character prompts types
export interface PositionCoords {
  x: number;
  y: number;
}

/**
 * Flexible image input types
 * This allows images to be passed in various formats for cross-platform compatibility
 */
export type ImageInput =
  | string // Path (Node.js) or Data URL (browser)
  | Blob // Browser native Blob
  | File // Browser File API
  | ArrayBuffer // Raw binary data
  | Uint8Array // Raw binary data
  | { data: Uint8Array } // Internal format
  | { url: string } // Remote URL
  | HTMLImageElement // Browser DOM Image element
  | HTMLCanvasElement; // Browser Canvas element

/**
 * Result from parsing an image
 */
export interface ParsedImage {
  width: number;
  height: number;
  base64: string;
}

/**
 * Character caption for V4 prompts
 * Maps to char_caption and centers in the API
 */
export interface CharacterCaption {
  charCaption: string; // Will be converted to char_caption
  centers: PositionCoords[];
}

/**
 * Character prompt for V4.5 multi-character generation
 */
export interface CharacterPrompt {
  prompt: string;
  uc: string;
  center: PositionCoords;
  enabled?: boolean;
}

/**
 * V4 caption format for prompts
 * Maps to base_caption and char_captions in the API
 */
export interface V4CaptionFormat {
  baseCaption: string; // Will be converted to base_caption
  charCaptions: CharacterCaption[]; // Will be converted to char_captions
}

/**
 * V4 prompt format with multi-character support
 * Maps to caption, use_coords and use_order in the API
 */
export interface V4PromptFormat {
  caption: V4CaptionFormat;
  useCoords: boolean; // Will be converted to use_coords
  useOrder: boolean; // Will be converted to use_order
}

/**
 * V4 format for negative prompts
 * Maps to caption and legacy_uc in the API
 */
export interface V4NegativePromptFormat {
  caption: V4CaptionFormat;
  legacyUc: boolean; // Will be converted to legacy_uc
}

// Core metadata
export interface Metadata {
  // General parameters
  prompt: string;
  model?: Model;
  action?: Action;
  resPreset?: Resolution;

  // Prompt settings
  negativePrompt?: string; // Will be converted to negative_prompt
  qualityToggle?: boolean;
  ucPreset?: 0 | 1 | 2 | 3;

  // Image settings
  width?: number;
  height?: number;
  nSamples?: number; // Will be converted to n_samples

  // AI settings
  steps?: number;
  scale?: number;
  dynamicThresholding?: boolean; // Will be converted to dynamic_thresholding
  seed?: number;
  extraNoiseSeed?: number; // Will be converted to extra_noise_seed
  sampler?: Sampler;
  sm?: boolean;
  smDyn?: boolean; // Will be converted to sm_dyn
  cfgRescale?: number; // Will be converted to cfg_rescale
  noiseSchedule?: Noise; // Will be converted to noise_schedule

  // img2img settings
  image?: string;
  strength?: number;
  noise?: number;
  controlnetStrength?: number; // Will be converted to controlnet_strength
  controlnetCondition?: string; // Will be converted to controlnet_condition
  controlnetModel?: Controlnet; // Will be converted to controlnet_model

  // Inpaint settings
  addOriginalImage?: boolean; // Will be converted to add_original_image
  mask?: string;

  // Vibe Transfer settings
  referenceImageMultiple?: string[]; // Will be converted to reference_image_multiple
  referenceInformationExtractedMultiple?: number[]; // Will be converted to reference_information_extracted_multiple
  referenceStrengthMultiple?: number[]; // Will be converted to reference_strength_multiple

  // V4/V4.5 specific settings
  paramsVersion?: 1 | 2 | 3; // Will be converted to params_version
  autoSmea?: boolean;
  characterPrompts?: CharacterPrompt[];
  v4Prompt?: V4PromptFormat; // Will be converted to v4_prompt
  v4NegativePrompt?: V4NegativePromptFormat; // Will be converted to v4_negative_prompt
  skipCfgAboveSigma?: number | null; // Will be converted to skip_cfg_above_sigma
  useCoords?: boolean; // Will be converted to use_coords
  legacyUc?: boolean; // Will be converted to legacy_uc
  normalizeReferenceStrengthMultiple?: boolean; // Will be converted to normalize_reference_strength_multiple
  deliberateEulerAncestralBug?: boolean; // Will be converted to deliberate_euler_ancestral_bug
  preferBrownian?: boolean; // Will be converted to prefer_brownian

  // V4.5 specific settings
  inpaintImg2ImgStrength?: number; // Will be converted to inpaint_img2img_strength, default to 1

  // Misc settings
  legacy?: boolean;
  legacyV3Extend?: boolean; // Will be converted to legacy_v3_extend


}

// Image related types
export interface ImageOptions {
  filename: string;
  data: Uint8Array;
  metadata?: Metadata;
}

// Director Tools options

export interface DirectorRequestBase {
  req_type: string;
  width: number;
  height: number;
  image: string;
}

export interface LineArtRequest extends DirectorRequestBase {
  req_type: "lineart";
}

export interface SketchRequest extends DirectorRequestBase {
  req_type: "sketch";
}

export interface BackgroundRemovalRequest extends DirectorRequestBase {
  req_type: "bg-removal";
}

export interface DeclutterRequest extends DirectorRequestBase {
  req_type: "declutter";
}

export interface ColorizeRequest extends DirectorRequestBase {
  req_type: "colorize";
  prompt: string;
  defry: number;
}

export interface EmotionRequest extends DirectorRequestBase {
  req_type: "emotion";
  prompt: string;
  defry: number;
}

export type DirectorRequest =
  | LineArtRequest
  | SketchRequest
  | BackgroundRemovalRequest
  | DeclutterRequest
  | ColorizeRequest
  | EmotionRequest;

export interface NovelAIOptions {
  token: string;
  timeout?: number;
  retry?: RetryConfig;
}

// API response types
export interface NovelAIResponse {
  statusCode: number;
  statusText: string;
  headers: Record<string, string>;
  data: ArrayBuffer | ReadableStream<Uint8Array> | null;
}

// Error types
export interface NovelAIError extends Error {
  status?: number;
  statusText?: string;
}
