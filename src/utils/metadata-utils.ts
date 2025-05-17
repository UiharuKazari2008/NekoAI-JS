import { Action, Model } from "../constants";
import { CharacterPrompt, Metadata } from "../types";
import {
  camelToSnakeCase,
  convertObjectKeysToSnakeCase,
} from "./convert-utils";

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

  // Fields that should remain in camelCase format
  const camelCaseFields = [
    "ucPreset",
    "qualityToggle",
    "autoSmea",
    "characterPrompts",
    "v4_prompt",
    "v4_negative_prompt",
  ];

  // Process all parameters
  Object.entries(parameters).forEach(([key, value]) => {
    try {
      // Skip undefined values
      if (value === undefined) return;

      // Handle special nested objects
      if (key === "v4Prompt") {
        const convertedPrompt = convertV4Prompt(value);
        if (convertedPrompt) {
          formattedParams.v4_prompt = convertedPrompt;
        }
        return;
      }

      if (key === "v4NegativePrompt") {
        const convertedNegPrompt = convertV4NegativePrompt(value);
        if (convertedNegPrompt) {
          formattedParams.v4_negative_prompt = convertedNegPrompt;
        }
        return;
      }

      if (key === "characterPrompts" && Array.isArray(value)) {
        formattedParams.characterPrompts = convertCharacterPrompts(value);
        return;
      }

      // Determine if this field should be in camelCase or snake_case
      const targetKey = camelCaseFields.includes(key)
        ? key
        : camelToSnakeCase(key);

      // Handle nested objects recursively
      if (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
      ) {
        formattedParams[targetKey] = convertObjectKeysToSnakeCase(
          value,
          camelCaseFields,
        );
      } else {
        formattedParams[targetKey] = value;
      }
    } catch (error) {
      console.error(`Error processing metadata field "${key}":`, error);
      // Still include the value even if conversion failed
      const targetKey = camelCaseFields.includes(key)
        ? key
        : camelToSnakeCase(key);
      formattedParams[targetKey] = value;
    }
  });

  // Create the payload
  const payload: any = {
    input: metadata.prompt,
    model,
    action,
    parameters: formattedParams,
  };

  return payload;
}

/**
 * Converts V4Prompt structure to the format expected by the API
 *
 * @param v4Prompt - The V4Prompt object to convert
 * @returns Converted object in the format expected by the API
 */
export function convertV4Prompt(v4Prompt: any): any {
  if (!v4Prompt) return undefined;

  // Convert the structure according to the expected API format
  // Special handling for the nested structure
  const result = {
    caption: {
      base_caption: v4Prompt.caption?.baseCaption || "",
      char_captions: [],
    },
    use_coords: v4Prompt.useCoords || false,
    use_order: v4Prompt.useOrder || true,
  };

  // Handle character captions
  if (
    v4Prompt.caption?.charCaptions &&
    Array.isArray(v4Prompt.caption.charCaptions)
  ) {
    result.caption.char_captions = v4Prompt.caption.charCaptions.map(
      (charCaption: any) => ({
        char_caption: charCaption.charCaption || "",
        centers: charCaption.centers || [],
      }),
    );
  }

  return result;
}

/**
 * Converts V4NegativePrompt structure to the format expected by the API
 *
 * @param v4NegativePrompt - The V4NegativePrompt object to convert
 * @returns Converted object in the format expected by the API
 */
export function convertV4NegativePrompt(v4NegativePrompt: any): any {
  if (!v4NegativePrompt) return undefined;

  // Convert the structure according to the expected API format
  // Special handling for the nested structure
  const result = {
    caption: {
      base_caption: v4NegativePrompt.caption?.baseCaption || "",
      char_captions: [],
    },
    legacy_uc: v4NegativePrompt.legacyUc || false,
  };

  // Handle character captions
  if (
    v4NegativePrompt.caption?.charCaptions &&
    Array.isArray(v4NegativePrompt.caption.charCaptions)
  ) {
    result.caption.char_captions = v4NegativePrompt.caption.charCaptions.map(
      (charCaption: any) => ({
        char_caption: charCaption.charCaption || "",
        centers: charCaption.centers || [],
      }),
    );
  }

  return result;
}

/**
 * Converts CharacterPrompts array to the format expected by the API
 *
 * @param characterPrompts - The array of CharacterPrompt objects to convert
 * @returns Converted array in the format expected by the API
 */
export function convertCharacterPrompts(characterPrompts: any[]): any[] {
  if (!characterPrompts || !Array.isArray(characterPrompts)) return [];

  // Character prompts fields that should remain in camelCase
  const camelCaseFields = ["prompt", "uc", "enabled"];

  // Convert each CharacterPrompt object to snake_case recursively while preserving camelCase fields
  return characterPrompts.map((prompt) =>
    convertObjectKeysToSnakeCase(prompt, camelCaseFields),
  );
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
