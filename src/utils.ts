import { ImageInput, Metadata, NovelAIResponse, ParsedImage, RetryConfig } from "./types";
import { Action, Model, Sampler } from "./constants";

// Define types for Node.js modules to be used conditionally
type FSModule = typeof import("fs");
type PathModule = typeof import("path");

// Helper function to safely use Node.js modules
function getNodeModules(): { fs: FSModule | null; path: PathModule | null } {
  if (typeof window === "undefined") {
    // Node.js environment
    return {
      fs: require("fs"),
      path: require("path")
    };
  }
  // Browser environment
  return { fs: null, path: null };
}

/**
 * Get the Node.js path module, if available
 * @returns The path module or null if in browser environment
 */
export function getNodePath(): PathModule | null {
  const { path } = getNodeModules();
  return path;
}

/**
 * Handles API response and checks status codes
 * @param response - Fetch API response
 * @returns NovelAIResponse object
 * @throws Error if response is not OK
 */
export async function handleResponse(
  response: Response,
): Promise<NovelAIResponse> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  if (!response.ok) {
    const error = new Error(
      `HTTP Error: ${response.status} ${response.statusText}`,
    );
    (error as any).status = response.status;
    (error as any).statusText = response.statusText;
    throw error;
  }

  // For binary responses, we need to clone the response and buffer all the data
  if (
    response.headers.get("Content-Type")?.includes("application/zip") ||
    response.headers.get("Content-Type")?.includes("application/octet-stream")
  ) {
    // Clone response to avoid consuming it
    const clonedResponse = response.clone();
    // Get the array buffer directly
    const buffer = await clonedResponse.arrayBuffer();

    return {
      statusCode: response.status,
      statusText: response.statusText,
      headers,
      data: buffer, // Return buffer directly for binary data
    };
  }

  // For non-binary responses, return the body stream
  return {
    statusCode: response.status,
    statusText: response.statusText,
    headers,
    data: response.body,
  };
}

/**
 * Parse an image from various input types and return width, height, and base64 data
 * Supports browser and Node.js environments with various input formats
 *
 * @param input - Various image input formats (path, Blob, File, ArrayBuffer, etc.)
 * @returns Promise resolving to a ParsedImage object with width, height, and base64 data
 */
export async function parseImage(input: ImageInput): Promise<ParsedImage> {
  // Handle Node.js environment
  if (typeof window === "undefined") {
    // Node.js environment
    if (typeof input === "string") {
      // Path to file in Node.js
      const { fs } = getNodeModules();
      if (!fs) {
        throw new Error("File system module not available");
      }
      
      // Load the canvas module (Node.js only)
      const canvas = loadNodeCanvas();
      if (!canvas) {
        throw new Error("Canvas module not available. Please install it with: npm install canvas");
      }
      
      const { createCanvas, loadImage } = canvas;

      try {
        const image = await loadImage(input);
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0);

        // Determine content type based on file extension
        const isJpeg =
          input.toLowerCase().endsWith(".jpg") ||
          input.toLowerCase().endsWith(".jpeg");
        const contentType = isJpeg ? "image/jpeg" : "image/png";

        const base64Data = canvas
          .toDataURL(contentType)
          .replace(new RegExp(`^data:${contentType};base64,`), "");

        return {
          width: image.width,
          height: image.height,
          base64: base64Data,
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to load image from path: ${errorMessage}`);
      }
    } else if (input instanceof Uint8Array) {
      // Direct Uint8Array data in Node.js
      // Load the canvas module (Node.js only)
      const canvas = loadNodeCanvas();
      if (!canvas) {
        throw new Error("Canvas module not available. Please install it with: npm install canvas");
      }
      
      const { createCanvas, loadImage } = canvas;
      const tempBuffer = Buffer.from(input);

      try {
        const image = await loadImage(tempBuffer);
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0);

        const base64Data = canvas
          .toDataURL("image/png")
          .replace(/^data:image\/png;base64,/, "");

        return {
          width: image.width,
          height: image.height,
          base64: base64Data,
        };
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(
          `Failed to load image from Uint8Array: ${errorMessage}`,
        );
      }
    } else if (input instanceof ArrayBuffer) {
      // Convert ArrayBuffer to Uint8Array
      return parseImage(new Uint8Array(input));
    } else if (typeof input === "object" && input !== null) {
      // Handle object formats
      if ("data" in input && input.data instanceof Uint8Array) {
        return parseImage(input.data);
      } else if ("url" in input && typeof input.url === "string") {
        return parseImage(input.url);
      }
    }

    throw new Error("Unsupported image input format in Node.js environment");
  }

  // Handle browser environment
  try {
    // Create a canvas element for processing
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get canvas rendering context");
    }

    let imageElement: HTMLImageElement | null = null;

    if (input instanceof HTMLImageElement) {
      // Direct image element
      imageElement = input;
    } else if (input instanceof HTMLCanvasElement) {
      // Canvas element - extract data directly
      return {
        width: input.width,
        height: input.height,
        base64: input
          .toDataURL("image/png")
          .replace(/^data:image\/png;base64,/, ""),
      };
    } else if (typeof input === "string") {
      // String could be a data URL or a remote URL
      imageElement = new Image();
      if (
        input.startsWith("data:") ||
        input.startsWith("blob:") ||
        input.startsWith("http")
      ) {
        // Already a URL format
        imageElement.src = input;
      } else {
        // Might be a path, which won't work in browser - warn the user
        throw new Error(
          "File paths are not supported in browser environment. Use a Blob, File, or Data URL instead.",
        );
      }

      // Wait for the image to load
      await new Promise<void>((resolve, reject) => {
        if (imageElement) {
          imageElement.onload = () => resolve();
          imageElement.onerror = () =>
            reject(new Error("Failed to load image from URL"));
        } else {
          reject(new Error("Image element is not initialized"));
        }
      });
    } else if (input instanceof Blob || input instanceof File) {
      // Convert Blob/File to an image element
      const url = URL.createObjectURL(input);
      imageElement = new Image();
      imageElement.src = url;

      // Wait for the image to load
      await new Promise<void>((resolve, reject) => {
        if (imageElement) {
          imageElement.onload = () => resolve();
          imageElement.onerror = () =>
            reject(new Error("Failed to load image from Blob/File"));
        } else {
          reject(new Error("Image element is not initialized"));
        }
      });

      // Clean up the object URL
      URL.revokeObjectURL(url);
    } else if (input instanceof ArrayBuffer || input instanceof Uint8Array) {
      // Convert ArrayBuffer/Uint8Array to Blob, then to image
      const buffer =
        input instanceof ArrayBuffer ? new Uint8Array(input) : input;
      const blob = new Blob([buffer], { type: "image/png" });
      return parseImage(blob);
    } else if (typeof input === "object" && input !== null) {
      // Handle object formats
      if ("data" in input && input.data instanceof Uint8Array) {
        return parseImage(input.data);
      } else if ("url" in input && typeof input.url === "string") {
        return parseImage(input.url);
      }
    } else {
      throw new Error("Unsupported image input format");
    }

    // Check if imageElement was successfully initialized
    if (!imageElement) {
      throw new Error("Failed to create image element");
    }

    // Draw the image to canvas and extract data
    canvas.width = imageElement.width;
    canvas.height = imageElement.height;
    ctx.drawImage(imageElement, 0, 0);

    return {
      width: imageElement.width,
      height: imageElement.height,
      base64: canvas
        .toDataURL("image/png")
        .replace(/^data:image\/png;base64,/, ""),
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to parse image in browser: ${errorMessage}`);
  }
}

/**
 * Creates a timestamp-based filename
 * @param prefix - Optional prefix for the filename
 * @param extension - File extension (default: 'png')
 * @returns Formatted filename
 */
export function createFilename(prefix?: string, extension = "png"): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace("T", "_")
    .substring(0, 15);

  return `${prefix ? prefix + "_" : ""}${timestamp}.${extension}`;
}

/**
 * Ensures a directory exists, creating it if necessary
 * @param dir - Directory path
 */
export function ensureDirectoryExists(dir: string): void {
  if (typeof window === "undefined") {
    // Node.js environment
    const { fs } = getNodeModules();
    if (fs && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Deduplicate tags in a comma-separated string
 * @param prompt - Prompt string with tags separated by commas
 * @returns Deduplicated prompt string
 */
export function deduplicateTags(prompt: string): string {
  if (!prompt) return prompt;

  // Split by commas, strip whitespace
  const tags = prompt
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  // Convert to lowercase for case-insensitive comparison
  // But keep original case for the final output
  const lowercaseToOriginal: { [key: string]: string } = {};

  for (const tag of tags) {
    const lowercase = tag.toLowerCase();
    // If we have multiple versions of the same tag, keep the first one
    if (!(lowercase in lowercaseToOriginal)) {
      lowercaseToOriginal[lowercase] = tag;
    }
  }

  // Reconstruct deduplicated prompt with original case
  const deduplicatedTags = Object.values(lowercaseToOriginal);
  return deduplicatedTags.join(", ");
}

/**
 * Prepares metadata for API request
 * @param metadata - Metadata object with parameters
 * @returns Formatted API request payload
 */
export function prepareMetadataForApi(metadata: Metadata): any {
  // Handle default parameters
  const model = metadata.model || Model.V3;
  const action = metadata.action || Action.GENERATE;

  // Copy metadata object without reserved properties
  const {
    prompt,
    model: _,
    action: __,
    resPreset: ___,
    ...parameters
  } = metadata;

  // Create formatted parameters object matching NovelAI's expected format
  const formattedParams: Record<string, any> = {};

  // Fields to convert to snake_case based on the NovelAI API expectations
  // Some fields remain camelCase in the actual API
  const snakeCaseFields = [
    "dynamicThresholding",
    "controlnetStrength",
    "addOriginalImage",
    "cfgRescale",
    "noiseSchedule",
    "smDyn",
    "extraNoiseSeed",
    "skipCfgAboveSigma",
    "normalizeReferenceStrengthMultiple",
    "deliberateEulerAncestralBug",
    "legacyV3Extend",
    "referenceImageMultiple",
    "referenceInformationExtractedMultiple",
    "referenceStrengthMultiple",
    "controlnetCondition",
    "controlnetModel",
  ];

  // Fields to rename (either to snake_case or special naming)
  const fieldMappings: Record<string, string> = {
    nSamples: "n_samples",
    dynamicThresholding: "dynamic_thresholding",
    controlnetStrength: "controlnet_strength",
    addOriginalImage: "add_original_image",
    cfgRescale: "cfg_rescale",
    noiseSchedule: "noise_schedule",
    smDyn: "sm_dyn",
    extraNoiseSeed: "extra_noise_seed",
    negativePrompt: "negative_prompt",
    paramsVersion: "params_version",
    skipCfgAboveSigma: "skip_cfg_above_sigma",
    useCoords: "use_coords",
    legacyUc: "legacy_uc",
    normalizeReferenceStrengthMultiple: "normalize_reference_strength_multiple",
    deliberateEulerAncestralBug: "deliberate_euler_ancestral_bug",
    preferBrownian: "prefer_brownian",
    legacyV3Extend: "legacy_v3_extend",
    referenceImageMultiple: "reference_image_multiple",
    referenceInformationExtractedMultiple:
      "reference_information_extracted_multiple",
    referenceStrengthMultiple: "reference_strength_multiple",
    controlnetCondition: "controlnet_condition",
    controlnetModel: "controlnet_model",
  };

  // Process all parameters
  Object.entries(parameters).forEach(([key, value]) => {
    // Skip undefined values and v4 specific fields which will be handled separately
    if (value === undefined || key === "v4Prompt" || key === "v4NegativePrompt")
      return;

    // Use the mapping if available
    const targetKey = fieldMappings[key] || key;
    formattedParams[targetKey] = value;
  });

  // Ensure params_version is set correctly based on model
  if (
    model === Model.V4 ||
    model === Model.V4_CUR ||
    model === Model.V4_5_CUR
  ) {
    formattedParams.params_version = 3;
  } else {
    formattedParams.params_version = formattedParams.params_version || 1;
  }

  // Create the payload
  const payload: any = {
    input: metadata.prompt,
    model,
    action,
    parameters: formattedParams,
  };

  // Handle V4/V4.5 specific formats
  if (
    model === Model.V4 ||
    model === Model.V4_CUR ||
    model === Model.V4_5_CUR
  ) {
    // V4 prompt handling
    if (metadata.v4Prompt) {
      // Convert character captions to the expected format if they exist
      const charCaptions =
        metadata.v4Prompt.caption.charCaptions?.map((cc) => ({
          char_caption: cc.charCaption,
          centers: cc.centers,
        })) || [];

      payload.parameters.v4_prompt = {
        caption: {
          base_caption: metadata.v4Prompt.caption.baseCaption,
          char_captions: charCaptions,
        },
        use_coords: metadata.v4Prompt.useCoords,
        use_order: metadata.v4Prompt.useOrder,
      };
    } else {
      // Create default v4_prompt from the input prompt
      payload.parameters.v4_prompt = {
        caption: {
          base_caption: metadata.prompt,
          char_captions: [],
        },
        use_coords: parameters.useCoords || false,
        use_order: true,
      };
    }

    // V4 negative prompt handling
    if (metadata.v4NegativePrompt) {
      // Convert character captions to the expected format if they exist
      const charCaptions =
        metadata.v4NegativePrompt.caption.charCaptions?.map((cc) => ({
          char_caption: cc.charCaption,
          centers: cc.centers,
        })) || [];

      payload.parameters.v4_negative_prompt = {
        caption: {
          base_caption: metadata.v4NegativePrompt.caption.baseCaption,
          char_captions: charCaptions,
        },
        legacy_uc: metadata.v4NegativePrompt.legacyUc,
      };
    } else if (formattedParams.negative_prompt) {
      // Create default v4_negative_prompt from the negative prompt
      payload.parameters.v4_negative_prompt = {
        caption: {
          base_caption: formattedParams.negative_prompt,
          char_captions: [],
        },
        legacy_uc: false,
      };
    }

    // For V4 models, both negative_prompt and v4_negative_prompt can coexist per the original payload
  }

  return payload;
}

/**
 * Converts file size to human-readable format
 * @param bytes - Size in bytes
 * @returns Formatted size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024)
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
}

/**
 * Calculates the Anlas cost based on parameters
 * @param metadata - Metadata object with parameters
 * @param isOpus - Whether user has Opus subscription
 * @returns Estimated Anlas cost
 */
export function calculateCost(metadata: Metadata, isOpus = false): number {
  const steps = metadata.steps || 28;
  const nSamples = metadata.nSamples || 1;
  const width = metadata.width || 1024;
  const height = metadata.height || 1024;
  const strength =
    metadata.action === Action.IMG2IMG && metadata.strength
      ? metadata.strength
      : 1.0;

  // Handle SMEA factor for both V3 and V4+ models
  let smeaFactor = 1.0;
  if (
    metadata.model === Model.V4 ||
    metadata.model === Model.V4_CUR ||
    metadata.model === Model.V4_5_CUR
  ) {
    // V4/V4.5 uses autoSmea
    if (metadata.autoSmea) {
      smeaFactor = 1.2;
    }
  } else {
    // V3 uses sm/sm_dyn
    if (metadata.smDyn) {
      smeaFactor = 1.4;
    } else if (metadata.sm) {
      smeaFactor = 1.2;
    }
  }

  const resolution = Math.max(width * height, 65536);

  // For normal resolutions, square is adjusted to the same price as portrait/landscape
  let adjustedResolution = resolution;
  if (resolution > 832 * 1216 && resolution <= 1024 * 1024) {
    adjustedResolution = 832 * 1216;
  }

  let perSample =
    Math.ceil(
      2951823174884865e-21 * adjustedResolution +
        5.753298233447344e-7 * adjustedResolution * steps,
    ) * smeaFactor;

  perSample = Math.max(Math.ceil(perSample * strength), 2);

  const opusDiscount =
    isOpus && steps <= 28 && adjustedResolution <= 1024 * 1024;

  return perSample * (nSamples - (opusDiscount ? 1 : 0));
}

/**
 * Convert a base64 string to a Uint8Array
 * @param base64 - Base64 encoded string
 * @returns Uint8Array of the data
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert a Uint8Array to a base64 string
 * @param array - Uint8Array data
 * @returns Base64 encoded string
 */
export function uint8ArrayToBase64(array: Uint8Array): string {
  let binary = "";
  const len = array.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(array[i]);
  }
  return btoa(binary);
}

/**
 * Save binary data to a file (Node.js environment only)
 * @param data - Binary data as Uint8Array
 * @param filepath - File path to save to
 */
export function saveBinaryFile(data: Uint8Array, filepath: string): void {
  if (typeof window === "undefined") {
    // Node.js environment
    const { fs, path } = getNodeModules();
    if (!fs || !path) {
      throw new Error("File system modules not available");
    }
    
    const dir = path.dirname(filepath);
    ensureDirectoryExists(dir);
    fs.writeFileSync(filepath, Buffer.from(data));
  } else {
    // Browser environment
    throw new Error("Cannot save files directly in browser environment");
  }
}

/**
 * Try to load the Node.js canvas module
 * This is separated to avoid bundling issues in browser environments
 */
function loadNodeCanvas() {
  try {
    if (typeof window === "undefined") {
      return require("canvas");
    }
    return null;
  } catch (error) {
    console.warn("Failed to load Node.js canvas module:", error);
    return null;
  }
}

// Default retry configuration
export const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  enabled: true,
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  retryStatusCodes: [429]
};

/**
 * Execute a function with retry logic
 * 
 * @param fn - Async function to execute with retry logic
 * @param retryConfig - Configuration for retry behavior
 * @returns Promise that resolves with the result of the function
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retryConfig?: RetryConfig
): Promise<T> {
  // Use default retry config if not provided
  const config: Required<RetryConfig> = {
    ...DEFAULT_RETRY_CONFIG,
    ...(retryConfig || {})
  };

  // If retries are disabled, just execute the function once
  if (!config.enabled) {
    return fn();
  }

  let lastError: Error | null = null;
  
  // Try up to maxRetries times
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      // Execute the function
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Check if we should retry based on the error
      const shouldRetry = shouldRetryRequest(error, config, attempt);
      
      // If we shouldn't retry or we've reached the max retries, throw the error
      if (!shouldRetry || attempt >= config.maxRetries) {
        throw error;
      }
      
      // Calculate delay with exponential backoff with jitter
      const delay = calculateRetryDelay(attempt, config);
      
      console.warn(`Request failed with error: ${lastError.message}. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${config.maxRetries})`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never happen (we should always either return or throw)
  throw lastError || new Error("Failed after retries");
}

/**
 * Determine if a request should be retried based on the error and config
 * 
 * @param error - The error from the request
 * @param config - Retry configuration
 * @param attempt - Current attempt number (0-based)
 * @returns Whether to retry the request
 */
function shouldRetryRequest(
  error: any,
  config: Required<RetryConfig>,
  attempt: number
): boolean {
  // Don't retry if we've reached the max retries
  if (attempt >= config.maxRetries) {
    return false;
  }
  
  // Check for rate limiting (HTTP 429 status)
  if (error && error.status && config.retryStatusCodes.includes(error.status)) {
    return true;
  }
  
  // Check for network errors (fetch will throw a TypeError for network errors)
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }
  
  // Check for timeout errors
  if (error.name === 'AbortError') {
    return true;
  }
  
  return false;
}

/**
 * Calculate retry delay with exponential backoff and jitter
 * 
 * @param attempt - Current attempt number (0-based)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 */
function calculateRetryDelay(attempt: number, config: Required<RetryConfig>): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = config.baseDelay * Math.pow(2, attempt);
  
  // Add jitter (random value between 0 and 1000ms) to prevent thundering herd
  const jitter = Math.random() * 1000;
  
  // Cap the delay at maxDelay
  return Math.min(exponentialDelay + jitter, config.maxDelay);
}
