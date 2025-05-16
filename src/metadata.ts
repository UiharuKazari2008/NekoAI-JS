import {
  Action,
  Model,
  Sampler,
  Noise,
} from "./constants";
import {
  Metadata,
  CharacterCaption,
} from "./types";
import { deduplicateTags } from "./utils";

/**
 * Class responsible for processing and validating metadata before sending to API
 */
export class MetadataProcessor {
  /**
   * Process and validate metadata before sending to API
   *
   * @param metadata - User-provided metadata
   * @returns Processed metadata object
   */
  processMetadata(metadata: Metadata): Metadata {
    // Create a deep copy to avoid modifying the original
    const result = JSON.parse(JSON.stringify(metadata)) as Metadata;

    // Apply resolution preset if width/height not provided
    if (result.resPreset && (!result.width || !result.height)) {
      const dimensions = this.getResolutionDimensions(result.resPreset);
      result.width = result.width || dimensions[0];
      result.height = result.height || dimensions[1];
    }

    this.applyDefaultValues(result);
    this.handleUcPreset(result);
    this.handleQualityTags(result);
    
    // Deduplicate tags
    result.prompt = result.prompt ? deduplicateTags(result.prompt) : "";
    result.negativePrompt = result.negativePrompt ? deduplicateTags(result.negativePrompt) : "";

    // Handle img2img and inpaint specific parameters
    this.handleActionSpecificParameters(result);

    // Handle character-related parameters
    this.handleUseCoords(result);
    this.handleCharacterPrompts(result);
    this.handleV4Prompt(result);
    this.handleV4NegativePrompt(result);

    // Handle model-specific settings
    this.handleModelSpecificSettings(result);

    // Handle sampler-specific settings
    this.handleSamplerSpecificSettings(result);

    return result;
  }

  /**
   * Apply default values to metadata
   * 
   * @param metadata - Metadata to update
   * @private
   */
  private applyDefaultValues(metadata: Metadata): void {
    metadata.model = metadata.model || Model.V4;
    metadata.action = metadata.action || Action.GENERATE;
    metadata.ucPreset = metadata.ucPreset ?? 0;
    metadata.qualityToggle = metadata.qualityToggle ?? true;
    metadata.nSamples = metadata.nSamples || 1;
    metadata.steps = metadata.steps || 28;
    metadata.scale = metadata.scale || 6.0;
    metadata.dynamicThresholding = metadata.dynamicThresholding || false;
    metadata.seed = metadata.seed || Math.floor(Math.random() * 4294967288);
    metadata.sampler = metadata.sampler || Sampler.EULER_ANC;
    metadata.cfgRescale = metadata.cfgRescale || 0;
    metadata.noiseSchedule = metadata.noiseSchedule || Noise.KARRAS;
    metadata.controlnetStrength = metadata.controlnetStrength || 1;
    metadata.addOriginalImage = metadata.addOriginalImage ?? true;
    metadata.autoSmea = metadata.autoSmea || false;
    metadata.paramsVersion = metadata.paramsVersion || 3;
    metadata.prompt = metadata.prompt || "1girl, cute";
    metadata.negativePrompt = metadata.negativePrompt || "";
    metadata.characterPrompts = metadata.characterPrompts || [];
  }

  /**
   * Handle action-specific parameters (img2img and inpaint)
   * 
   * @param metadata - Metadata to update
   * @private
   */
  private handleActionSpecificParameters(metadata: Metadata): void {
    if (metadata.action === Action.IMG2IMG || metadata.action === Action.INPAINT) {
      metadata.sm = false;
      metadata.smDyn = false;
      metadata.strength = metadata.strength || 0.3;
      metadata.noise = metadata.noise || 0;
      metadata.extraNoiseSeed =
        metadata.extraNoiseSeed || Math.floor(Math.random() * 4294967288);
    }
  }

  /**
   * Handle model-specific settings
   * 
   * @param metadata - Metadata to update
   * @private
   */
  private handleModelSpecificSettings(metadata: Metadata): void {
    const v4Models = [
      Model.V4, 
      Model.V4_INP, 
      Model.V4_CUR, 
      Model.V4_CUR_INP, 
      Model.V4_5_CUR, 
      Model.V4_5_CUR_INP
    ];

    // Drop sm and sm_dyn for V4+ models
    if (metadata.model && v4Models.includes(metadata.model)) {
      metadata.sm = undefined;
      metadata.smDyn = undefined;
    }
  }

  /**
   * Handle sampler-specific settings
   * 
   * @param metadata - Metadata to update
   * @private
   */
  private handleSamplerSpecificSettings(metadata: Metadata): void {
    if (metadata.sampler === Sampler.EULER_ANC) {
      metadata.deliberateEulerAncestralBug = false;
      metadata.preferBrownian = true;
    }
  }

  /**
   * Handle quality tags based on the model
   * If qualityToggle is true, append quality tags to the prompt
   * 
   * @param metadata - Metadata to update
   * @private
   */
  handleQualityTags(metadata: Metadata): void {
    if (!metadata.qualityToggle) {
      return;
    }

    let qualityTags = "";

    if (metadata.model === Model.V4_5_CUR || metadata.model === Model.V4_5_CUR_INP) {
      qualityTags = ", location, masterpiece, no text, -0.8::feet::, rating:general";
    } else if (metadata.model === Model.V4 || metadata.model === Model.V4_INP) {
      qualityTags = ", no text, best quality, very aesthetic, absurdres";
    } else if (metadata.model === Model.V4_CUR || metadata.model === Model.V4_CUR_INP) {
      qualityTags = ", rating:general, amazing quality, very aesthetic, absurdres";
    } else if (metadata.model === Model.V3 || metadata.model === Model.V3_INP) {
      qualityTags = ", best quality, amazing quality, very aesthetic, absurdres";
    } else if (metadata.model === Model.FURRY || metadata.model === Model.FURRY_INP) {
      qualityTags = ", {best quality}, {amazing quality}";
    }

    metadata.prompt += qualityTags;
  }

  /**
   * Handle UC preset based on model
   * Appends model-specific negative prompt tags based on the ucPreset value
   * 
   * @param metadata - Metadata to update
   * @private
   */
  handleUcPreset(metadata: Metadata): void {
    let uc = "";

    if (metadata.model === Model.V4_5_CUR || metadata.model === Model.V4_5_CUR_INP) {
      if (metadata.ucPreset === 0) {
        uc = ", blurry, lowres, upscaled, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, halftone, multiple views, logo, too many watermarks, negative space, blank page";
      } else if (metadata.ucPreset === 1) {
        uc = ", blurry, lowres, upscaled, artistic error, scan artifacts, jpeg artifacts, logo, too many watermarks, negative space, blank page";
      } else if (metadata.ucPreset === 2) {
        uc = ", blurry, lowres, upscaled, artistic error, film grain, scan artifacts, bad anatomy, bad hands, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, halftone, multiple views, logo, too many watermarks, @_@, mismatched pupils, glowing eyes, negative space, blank page";
      }
    } else if (metadata.model === Model.V4 || metadata.model === Model.V4_INP) {
      if (metadata.ucPreset === 0) {
        uc = ", blurry, lowres, upscaled, artistic error, film grain, scan artifacts, bad anatomy, bad hands, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, halftone, multiple views, logo, too many watermarks, @_@, mismatched pupils, glowing eyes, negative space, blank page";
      } else if (metadata.ucPreset === 1) {
        uc = ", blurry, lowres, error, worst quality, bad quality, jpeg artifacts, very displeasing";
      }
    } else if (metadata.model === Model.V4_CUR || metadata.model === Model.V4_CUR_INP) {
      if (metadata.ucPreset === 0) {
        uc = ", blurry, lowres, error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, logo, dated, signature, multiple views, gigantic breasts";
      } else if (metadata.ucPreset === 1) {
        uc = ", blurry, lowres, error, worst quality, bad quality, jpeg artifacts, very displeasing, logo, dated, signature";
      }
    } else if (metadata.model === Model.V3 || metadata.model === Model.V3_INP) {
      if (metadata.ucPreset === 0) {
        uc = ", lowres, {bad}, error, fewer, extra, missing, worst quality, jpeg artifacts, bad quality, watermark, unfinished, displeasing, chromatic aberration, signature, extra digits, artistic error, username, scan, [abstract],";
      } else if (metadata.ucPreset === 1) {
        uc = ", lowres, jpeg artifacts, worst quality, watermark, blurry, very displeasing,";
      } else if (metadata.ucPreset === 2) {
        uc = ", lowres, {bad}, error, fewer, extra, missing, worst quality, jpeg artifacts, bad quality, watermark, unfinished, displeasing, chromatic aberration, signature, extra digits, artistic error, username, scan, [abstract], bad anatomy, bad hands, @_@, mismatched pupils, heart-shaped pupils, glowing eyes,";
      }
    } else if (metadata.model === Model.FURRY || metadata.model === Model.FURRY_INP) {
      if (metadata.ucPreset === 0) {
        uc = ", {{worst quality}}, [displeasing], {unusual pupils}, guide lines, {{unfinished}}, {bad}, url, artist name, {{tall image}}, mosaic, {sketch page}, comic panel, impact (font), [dated], {logo}, ych, {what}, {where is your god now}, {distorted text}, repeated text, {floating head}, {1994}, {widescreen}, absolutely everyone, sequence, {compression artifacts}, hard translated, {cropped}, {commissioner name}, unknown text, high contrast,";
      } else if (metadata.ucPreset === 1) {
        uc = ", {worst quality}, guide lines, unfinished, bad, url, tall image, widescreen, compression artifacts, unknown text,";
      }
    }

    metadata.negativePrompt += uc;
  }

  /**
   * Determine if coordinates should be used based on character prompt positions
   * 
   * @param metadata - Metadata to update
   * @private
   */
  handleUseCoords(metadata: Metadata): void {
    if (!metadata.characterPrompts?.length) {
      metadata.useCoords = false;
      return;
    }

    // Set useCoords to true if any character prompt has non-default center coordinates
    metadata.useCoords = metadata.characterPrompts.some(
      cp => (cp.center?.x !== 0.5 || cp.center?.y !== 0.5)
    );
  }

  /**
   * Set default values for character prompts and deduplicate tags
   * 
   * @param metadata - Metadata to update
   * @private
   */
  handleCharacterPrompts(metadata: Metadata): void {
    if (!metadata.characterPrompts?.length) {
      return;
    }
    
    // Set default values for each character prompt
    metadata.characterPrompts.forEach(cp => {
      cp.enabled = cp.enabled ?? true;
      cp.prompt = cp.prompt ? deduplicateTags(cp.prompt) : "1girl, cute";
      cp.uc = cp.uc ? deduplicateTags(cp.uc) : "lowres, aliasing,";
      
      // Ensure center coordinates exist with defaults
      cp.center = cp.center || { x: 0.5, y: 0.5 };
      cp.center.x = cp.center.x ?? 0.5;
      cp.center.y = cp.center.y ?? 0.5;
    });
  }

  /**
   * Handle the V4 prompt format for V4/V4.5 models
   * 
   * @param metadata - Metadata to update
   * @private
   */
  handleV4Prompt(metadata: Metadata): void {
    // Skip if v4Prompt is already set
    if (metadata.v4Prompt) {
      return;
    }

    // Skip if model is not V4/V4.5
    const v4Models = [
      Model.V4, 
      Model.V4_INP, 
      Model.V4_CUR, 
      Model.V4_CUR_INP, 
      Model.V4_5_CUR, 
      Model.V4_5_CUR_INP
    ];
    
    if (!metadata.model || !v4Models.includes(metadata.model)) {
      return;
    }

    const charCaptions: CharacterCaption[] = [];
    
    // Create character captions based on enabled character prompts
    metadata.characterPrompts?.forEach(cp => {
      if (cp.enabled) {
        charCaptions.push({
          charCaption: cp.prompt,
          centers: [cp.center],
        });
      }
    });

    // Set up V4 prompt format
    metadata.v4Prompt = {
      caption: {
        baseCaption: metadata.prompt || "",
        charCaptions: charCaptions,
      },
      useCoords: metadata.useCoords || false,
      useOrder: true,
    };
  }

  /**
   * Handle the V4 negative prompt format for V4/V4.5 models
   * 
   * @param metadata - Metadata to update
   * @private
   */
  handleV4NegativePrompt(metadata: Metadata): void {
    // Skip if v4NegativePrompt is already set
    if (metadata.v4NegativePrompt) {
      return;
    }

    // Skip if model is not V4/V4.5
    const v4Models = [
      Model.V4, 
      Model.V4_INP, 
      Model.V4_CUR, 
      Model.V4_CUR_INP, 
      Model.V4_5_CUR, 
      Model.V4_5_CUR_INP
    ];
    
    if (!metadata.model || !v4Models.includes(metadata.model)) {
      return;
    }

    const charCaptions: CharacterCaption[] = [];
    
    // Create character captions based on enabled character prompts with UC
    metadata.characterPrompts?.forEach(cp => {
      if (cp.enabled && cp.uc) {
        charCaptions.push({
          charCaption: cp.uc,
          centers: [cp.center],
        });
      }
    });

    // Set up V4 negative prompt format
    metadata.v4NegativePrompt = {
      caption: {
        baseCaption: metadata.negativePrompt || "",
        charCaptions: charCaptions,
      },
      legacyUc: metadata.legacyUc || false,
    };
  }

  /**
   * Get width and height from a resolution preset
   *
   * @param preset - Resolution preset
   * @returns [width, height] tuple
   */
  private getResolutionDimensions(preset: string): [number, number] {
    const dimensionsMap: Record<string, [number, number]> = {
      small_portrait: [512, 768],
      small_landscape: [768, 512],
      small_square: [640, 640],
      normal_portrait: [832, 1216],
      normal_landscape: [1216, 832],
      normal_square: [1024, 1024],
      large_portrait: [1024, 1536],
      large_landscape: [1536, 1024],
      large_square: [1472, 1472],
      wallpaper_portrait: [1088, 1920],
      wallpaper_landscape: [1920, 1088],
    };

    return dimensionsMap[preset] || [1024, 1024];
  }
}

// Singleton instance for easy access
export const metadataProcessor = new MetadataProcessor();