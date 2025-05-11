import JSZip from "jszip";
import {
  Action,
  HEADERS,
  Host,
  HOST_INSTANCES,
  Endpoint,
  DirectorTools,
  EmotionOptions,
  EmotionLevel,
  Model,
  Noise,
  Sampler,
} from "./constants";
import { Image } from "./image";
import {
  DirectorRequest,
  HostInstance,
  ImageInput,
  Metadata,
  NovelAIOptions,
  PositionCoords,
  CharacterCaption,
  CharacterPrompt,
  RetryConfig,
} from "./types";
import {
  calculateCost,
  createFilename,
  deduplicateTags,
  handleResponse,
  parseImage,
  prepareMetadataForApi,
  withRetry,
} from "./utils";

/**
 * NovelAI client for interacting with the NovelAI image generation API
 */
export class NovelAI {
  private token: string;
  private timeout: number;
  private headers: Record<string, string>;
  private retryConfig?: RetryConfig;

  /**
   * Create a new NovelAI client
   *
   * @param options - Client configuration options
   * @param options.token - NovelAI access token
   * @param options.timeout - Request timeout in milliseconds (default: 30000)
   * @param options.retry - Configuration for request retries (default: enabled with 3 retries)
   */
  constructor(options: NovelAIOptions) {
    this.token = options.token;
    this.timeout = options.timeout || 30000;
    this.retryConfig = options.retry;

    // Set up default headers
    this.headers = {
      ...HEADERS,
      Authorization: `Bearer ${this.token}`,
    };
  }

  /**
   * Generate images using NovelAI's API
   *
   * @param metadata - Generation parameters
   * @param host - API host to use (can be Host enum or HostInstance, default: WEB)
   * @param verbose - Whether to log cost information (default: false)
   * @param isOpus - Whether the user has Opus subscription (for cost calculation, default: false)
   * @returns Promise resolving to an array of Image objects
   */
  async generateImage(
    metadata: Metadata,
    host: Host | HostInstance = Host.WEB,
    verbose: boolean = false,
    isOpus: boolean = false,
  ): Promise<Image[]> {
    // Process and validate the metadata
    const processedMetadata = this.processMetadata(metadata);

    // Calculate and log cost if verbose
    if (verbose) {
      const cost = calculateCost(processedMetadata, isOpus);
      console.info(`Generating image... estimated Anlas cost: ${cost}`);
    }

    // Prepare the API request payload
    const payload = prepareMetadataForApi(processedMetadata);

    // Remove debug logging in production
    // console.log(JSON.stringify(payload));

    // Get host instance details
    const hostInstance =
      typeof host === "string" ? HOST_INSTANCES[host as Host] : host;

    return withRetry(async () => {
      try {
        // Set up AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
          // Make the API request
          const response = await fetch(`${hostInstance.url}${Endpoint.IMAGE}`, {
            method: "POST",
            headers: {
              ...this.headers,
              Accept: hostInstance.accept,
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });

          // Clear the timeout
          clearTimeout(timeoutId);

          // Handle the response
          const apiResponse = await handleResponse(response);

          // Ensure we got the expected content type
          if (response.headers.get("Content-Type") !== hostInstance.accept) {
            throw new Error(
              `Invalid response content type. Expected '${hostInstance.accept}', got '${response.headers.get("Content-Type")}'.`,
            );
          }

          // Parse the ZIP file response
          const hostName = hostInstance.name.toLowerCase();

          // Use the data directly if it's already an ArrayBuffer, otherwise get it from the stream
          let arrayBuffer;
          if (apiResponse.data instanceof ArrayBuffer) {
            arrayBuffer = apiResponse.data;
          } else if (apiResponse.data) {
            arrayBuffer = await new Response(apiResponse.data).arrayBuffer();
          } else {
            throw new Error("No data received from API");
          }

          const zip = await JSZip.loadAsync(arrayBuffer);

          // Process each file in the ZIP
          const images: Image[] = [];
          let index = 0;

          for (const filename of Object.keys(zip.files)) {
            const zipObj = zip.files[filename];
            if (!zipObj.dir) {
              const data = await zipObj.async("uint8array");
              const timestamp = new Date()
                .toISOString()
                .replace(/[-:]/g, "")
                .replace("T", "_")
                .substring(0, 15);

              images.push(
                new Image({
                  filename: `${timestamp}_${hostName}_p${index}.png`,
                  data: data,
                  metadata: processedMetadata,
                }),
              );

              index++;
            }
          }

          return images;
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (error) {
        if ((error as any).name === "AbortError") {
          throw new Error(
            "Request timed out, please try again. If the problem persists, consider setting a higher 'timeout' value when initiating the NovelAI client.",
          );
        }
        throw error;
      }
    }, this.retryConfig);
  }

  /**
   * Process and validate metadata before sending to API
   *
   * @param metadata - User-provided metadata
   * @returns Processed metadata object
   */
  private processMetadata(metadata: Metadata): Metadata {
    // Create a deep copy to avoid modifying the original
    const result = JSON.parse(JSON.stringify(metadata)) as Metadata;

    // Apply resolution preset if width/height not provided
    if (result.resPreset && (!result.width || !result.height)) {
      const dimensions = this.getResolutionDimensions(result.resPreset);
      result.width = result.width || dimensions[0];
      result.height = result.height || dimensions[1];
    }

    // Apply default values if not provided
    result.model = result.model || Model.V4;
    result.action = result.action || Action.GENERATE;
    result.ucPreset = result.ucPreset ?? 0;
    result.qualityToggle = result.qualityToggle ?? true;
    result.nSamples = result.nSamples || 1;
    result.steps = result.steps || 28;
    result.scale = result.scale || 6.0;
    result.dynamicThresholding = result.dynamicThresholding || false;
    result.seed = result.seed || Math.floor(Math.random() * 4294967288);
    result.sampler = result.sampler || Sampler.EULER_ANC;
    result.cfgRescale = result.cfgRescale || 0;
    result.noiseSchedule = result.noiseSchedule || Noise.KARRAS;
    result.controlnetStrength = result.controlnetStrength || 1;
    result.addOriginalImage = result.addOriginalImage ?? true;
    result.autoSmea = result.autoSmea || false;

    // Default prompt if not provided
    result.prompt = result.prompt || "1girl, cute";
    result.negativePrompt = result.negativePrompt || "";
    result.characterPrompts = result.characterPrompts || [];

    // Modify negative prompt if ucPreset is provided
    if (result.ucPreset === 0) {
      // Heavy
      result.negativePrompt = `${result.negativePrompt}, lowres, {bad}, error, fewer, extra, missing, worst quality, jpeg artifacts, bad quality, watermark, unfinished, displeasing, chromatic aberration, signature, extra digits, artistic error, username, scan, [abstract]`;
    } else if (result.ucPreset === 1) {
      // Light
      result.negativePrompt = `${result.negativePrompt}, lowres, jpeg artifacts, worst quality, watermark, blurry, very displeasing`;
    } else if (result.ucPreset === 2) {
      // Human Focus
      result.negativePrompt = `${result.negativePrompt}, lowres, {bad}, error, fewer, extra, missing, worst quality, jpeg artifacts, bad quality, watermark, unfinished, displeasing, chromatic aberration, signature, extra digits, artistic error, username, scan, [abstract], bad anatomy, bad hands, @_@, mismatched pupils, heart-shaped pupils, glowing eyes`;
    }

    // Append quality tags if qualityToggle is enabled
    if (result.qualityToggle) {
      result.prompt = `${result.prompt}, best quality, amazing quality, very aesthetic, absurdres`;
    }

    // Deduplicate tags
    result.prompt = deduplicateTags(result.prompt);
    result.negativePrompt = deduplicateTags(result.negativePrompt);

    // Handle img2img and inpaint specific parameters
    if (result.action === Action.IMG2IMG || result.action === Action.INPAINT) {
      result.sm = false;
      result.smDyn = false;
      result.strength = result.strength || 0.3;
      result.noise = result.noise || 0;
      result.extraNoiseSeed =
        result.extraNoiseSeed || Math.floor(Math.random() * 4294967288);
    }

    // V4/V4.5 model specific handling
    if (
      result.model === Model.V4 ||
      result.model === Model.V4_CUR ||
      result.model === Model.V4_5_CUR
    ) {
      // Drop sm and sm_dyn for V4+ models
      result.sm = undefined;
      result.smDyn = undefined;

      // Set params_version to 3 for V4 models
      result.paramsVersion = 3;

      // calculate useCoords based on the characterPrompts[*].center x and y values, if any of them are not 0.5, set useCoords to true
      result.useCoords =
        result.characterPrompts.some(
          (cp) => cp.center.x !== 0.5 || cp.center.y !== 0.5,
        ) || false;

      
      // handle characterPrompts default values
      result.characterPrompts.forEach((cp) => {
        cp.enabled = cp.enabled || true;
        cp.uc = cp.uc || "lowres, aliasing,";
        cp.center = cp.center || { x: 0.5, y: 0.5 };
      });

      

      // For V4/V4.5, set up default v4_prompt if not provided
      if (!result.v4Prompt) {
        const charCaptions: CharacterCaption[] = [];
        
        // handle charCaptions default values based on characterPrompts 
        result.characterPrompts.forEach((cp) => {
          charCaptions.push({
            charCaption: cp.prompt,
            centers: [cp.center],
          });
        });

        result.v4Prompt = {
          caption: {
            baseCaption: result.prompt,
            charCaptions: charCaptions,
          },
          useCoords: result.useCoords || false,
          useOrder: true,
        };
      }

      // For V4/V4.5, set up default v4_negative_prompt if not provided
      if (!result.v4NegativePrompt) {
        const charCaptions: CharacterCaption[] = [];

        // handle charCaptions default values based on characterPrompts
        result.characterPrompts.forEach((cp) => {
          charCaptions.push({
            charCaption: cp.uc,
            centers: [cp.center],
          });
        });

        result.v4NegativePrompt = {
          caption: {
            baseCaption: result.negativePrompt,
            charCaptions: charCaptions,
          },
          legacyUc: false,
        };
      }

      // Handle sampler-specific settings
      if (result.sampler === Sampler.EULER_ANC) {
        result.deliberateEulerAncestralBug = false;
        result.preferBrownian = true;
      }
    } else {
      // For V3 models, set params_version to 1
      result.autoSmea = undefined;
      result.paramsVersion = 1;
    }

    return result;
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

  /**
   * Use a Director tool with the specified request
   *
   * @param request - Director tool request
   * @param host - Host to use for the request (can be Host enum or HostInstance, default: WEB)
   * @returns Promise resolving to an Image object
   */
  async useDirectorTool(
    request: DirectorRequest,
    host: Host | HostInstance = Host.WEB,
  ): Promise<Image> {
    const hostInstance =
      typeof host === "string" ? HOST_INSTANCES[host as Host] : host;

    return withRetry(async () => {
      try {
        // Set up AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        try {
          // Make the API request
          const response = await fetch(
            `${hostInstance.url}${Endpoint.DIRECTOR}`,
            {
              method: "POST",
              headers: this.headers,
              body: JSON.stringify(request),
              signal: controller.signal,
            },
          );

          // Clear the timeout
          clearTimeout(timeoutId);

          // Handle the response
          const apiResponse = await handleResponse(response);
          
          if (!apiResponse.data) {
            throw new Error("Received empty response from the server.");
          }

          // Process the response data
          let arrayBuffer;
          if (apiResponse.data instanceof ArrayBuffer) {
            arrayBuffer = apiResponse.data;
          } else if (apiResponse.data) {
            arrayBuffer = await new Response(apiResponse.data).arrayBuffer();
          } else {
            throw new Error("No data received from API");
          }
          
          // Handle decompression of the ZIP file
          const data = await this.handleDirectorDecompression(arrayBuffer);
          
          // Create and return the image
          return new Image({
            filename: createFilename(request.req_type),
            data,
          });
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (error) {
        if ((error as any).name === "AbortError") {
          throw new Error(
            "Request timed out, please try again. If the problem persists, consider setting a higher 'timeout' value when initiating the NovelAI client.",
          );
        }
        throw error;
      }
    }, this.retryConfig);
  }

  /**
   * Handle decompression of ZIP response from Director API
   * 
   * @param compressedData - Compressed ZIP data as ArrayBuffer
   * @returns Promise resolving to decompressed Uint8Array image data
   * @private
   */
  private async handleDirectorDecompression(compressedData: ArrayBuffer): Promise<Uint8Array> {
    try {
      // Load the ZIP file using JSZip
      const zip = await JSZip.loadAsync(compressedData);
      
      // Get the list of files in the ZIP
      const fileNames = Object.keys(zip.files);
      
      if (fileNames.length === 0) {
        throw new Error("ZIP file is empty or invalid");
      }
      
      // Extract the first file (Director tools typically return a single image)
      const firstFileName = fileNames[0];
      const fileData = await zip.file(firstFileName)?.async("uint8array");
      
      if (!fileData) {
        throw new Error(`Failed to extract file ${firstFileName} from ZIP`);
      }
      
      return fileData;
    } catch (error) {
      // If not a valid ZIP or only contains a single uncompressed image,
      // return the raw data as-is
      if (error instanceof Error && 
          (error.message.includes("invalid zip") || 
           error.message.includes("Central Directory header not found"))) {
        return new Uint8Array(compressedData);
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Convert an image to line art
   *
   * @param image - Image input (path, Blob, File, URL, etc.)
   * @param host - Host to use for the request (optional)
   * @returns Promise resolving to an Image object
   */
  async lineArt(image: ImageInput, host?: Host | HostInstance): Promise<Image> {
    const parsedImage = await parseImage(image);

    const request: DirectorRequest = {
      req_type: DirectorTools.LINEART,
      width: parsedImage.width,
      height: parsedImage.height,
      image: parsedImage.base64,
    };

    return this.useDirectorTool(request, host);
  }

  /**
   * Convert an image to sketch
   *
   * @param image - Image input (path, Blob, File, URL, etc.)
   * @param host - Host to use for the request (optional)
   * @returns Promise resolving to an Image object
   */
  async sketch(image: ImageInput, host?: Host | HostInstance): Promise<Image> {
    const parsedImage = await parseImage(image);

    const request: DirectorRequest = {
      req_type: DirectorTools.SKETCH,
      width: parsedImage.width,
      height: parsedImage.height,
      image: parsedImage.base64,
    };

    return this.useDirectorTool(request, host);
  }

  /**
   * Remove the background from an image
   *
   * @param image - Image input (path, Blob, File, URL, etc.)
   * @param host - Host to use for the request (optional)
   * @returns Promise resolving to an Image object
   */
  async backgroundRemoval(
    image: ImageInput,
    host?: Host | HostInstance,
  ): Promise<Image> {
    const parsedImage = await parseImage(image);

    const request: DirectorRequest = {
      req_type: DirectorTools.BACKGROUND_REMOVAL,
      width: parsedImage.width,
      height: parsedImage.height,
      image: parsedImage.base64,
    };

    return this.useDirectorTool(request, host);
  }

  /**
   * Declutter an image (remove noise, distractions, etc.)
   *
   * @param image - Image input (path, Blob, File, URL, etc.)
   * @param host - Host to use for the request (optional)
   * @returns Promise resolving to an Image object
   */
  async declutter(
    image: ImageInput,
    host?: Host | HostInstance,
  ): Promise<Image> {
    const parsedImage = await parseImage(image);

    const request: DirectorRequest = {
      req_type: DirectorTools.DECLUTTER,
      width: parsedImage.width,
      height: parsedImage.height,
      image: parsedImage.base64,
    };

    return this.useDirectorTool(request, host);
  }

  /**
   * Colorize a sketch or line art
   *
   * @param image - Image input (path, Blob, File, URL, etc.)
   * @param host - Host to use for the request (optional)
   * @param prompt - Additional prompt to add to the request
   * @param defry - Defry value (0-5, default: 0)
   * @returns Promise resolving to an Image object
   */
  async colorize(
    image: ImageInput,
    host?: Host | HostInstance,
    prompt: string = "",
    defry: number = 0,
  ): Promise<Image> {
    const parsedImage = await parseImage(image);

    const request: DirectorRequest = {
      req_type: DirectorTools.COLORIZE,
      width: parsedImage.width,
      height: parsedImage.height,
      image: parsedImage.base64,
      prompt,
      defry,
    };

    return this.useDirectorTool(request, host);
  }

  /**
   * Change the emotion of a character in an image
   *
   * @param image - Image input (path, Blob, File, URL, etc.)
   * @param host - Host to use for the request (optional)
   * @param emotion - Target emotion to change to
   * @param prompt - Additional prompt to add to the request
   * @param emotionLevel - Level of emotion change (0-5, optional)
   * @returns Promise resolving to an Image object
   */
  async changeEmotion(
    image: ImageInput,
    host?: Host | HostInstance,
    emotion: string = EmotionOptions.NEUTRAL,
    prompt: string = "",
    emotionLevel: EmotionLevel = EmotionLevel.NORMAL,

  ): Promise<Image> {
    const parsedImage = await parseImage(image);

    const final_prompt = `${emotion};;${prompt}`;

    const request: DirectorRequest = {
      req_type: DirectorTools.EMOTION,
      width: parsedImage.width,
      height: parsedImage.height,
      image: parsedImage.base64,
      prompt: final_prompt,
      defry: emotionLevel ?? EmotionLevel.NORMAL,
    };

    return this.useDirectorTool(request, host);
  }
}
