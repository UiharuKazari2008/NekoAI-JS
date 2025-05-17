import JSZip from "jszip";
import {
  HEADERS,
  Host,
  HOST_INSTANCES,
  Endpoint,
  DirectorTools,
  EmotionOptions,
  EmotionLevel,
  Model,
} from "./constants";
import { Image } from "./image";
import {
  DirectorRequest,
  HostInstance,
  ImageInput,
  Metadata,
  NovelAIOptions,
  NovelAIResponse,
  RetryConfig,
} from "./types";
import {
  calculateCost,
  createFilename,
  handleResponse,
  parseImage,
  prepareMetadataForApi,
  withRetry,
} from "./utils";
import { metadataProcessor } from "./metadata";

/**
 * NovelAI client for interacting with the NovelAI image generation API
 */
export class NovelAI {
  private token: string;
  private timeout: number;
  private headers: Record<string, string>;
  private retryConfig?: RetryConfig;

  /**
   * Cache of vibe tokens to avoid re-encoding the same images
   * @private
   */
  private vibeCache: Map<string, string> = new Map();

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

    // Handle vibe transfer for V4 models
    await this.encodeVibe(processedMetadata);

    // Get host instance details
    const hostInstance =
      typeof host === "string" ? HOST_INSTANCES[host as Host] : host;

    // Prepare the API request payload
    const payload = prepareMetadataForApi(processedMetadata);

    return withRetry(async () => {
      try {
        // Make the API request with timeout handling
        const response = await this.makeRequest(
          `${hostInstance.url}${Endpoint.IMAGE}`,
          payload,
          hostInstance.accept,
        );

        // Process the response into Image objects
        return this.processImageResponse(
          response,
          hostInstance,
          processedMetadata,
        );
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
   * Makes a request to the NovelAI API with appropriate headers and timeout handling
   *
   * @param url - The endpoint URL to send the request to
   * @param payload - The request payload
   * @param acceptHeader - The Accept header value for the response
   * @returns Promise resolving to the API response
   * @private
   */
  private async makeRequest(
    url: string,
    payload: any,
    acceptHeader: string,
  ): Promise<NovelAIResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    const jsonPayload = JSON.stringify(payload);

    console.log("✨ Sending request to NovelAI API... with:", jsonPayload);

    try {
      // Make the API request
      const response = await fetch(url, {
        method: "POST",
        headers: {
          ...this.headers,
          Accept: acceptHeader,
        },
        body: jsonPayload,
        signal: controller.signal,
      });

      // Handle the response
      const apiResponse = await handleResponse(response);

      // Ensure we got the expected content type
      if (response.headers.get("Content-Type") !== acceptHeader) {
        throw new Error(
          `Invalid response content type. Expected '${acceptHeader}', got '${response.headers.get("Content-Type")}'.`,
        );
      }

      return apiResponse;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Processes the API response into Image objects
   *
   * @param apiResponse - The API response to process
   * @param hostInstance - The host instance used for the request
   * @param metadata - The metadata to include with the images
   * @returns Promise resolving to an array of Image objects
   * @private
   */
  private async processImageResponse(
    apiResponse: NovelAIResponse,
    hostInstance: HostInstance,
    metadata: Metadata,
  ): Promise<Image[]> {
    // Get host name for filename
    const hostName = hostInstance.name.toLowerCase();

    // Use the data directly if it's already an ArrayBuffer, otherwise get it from the stream
    let arrayBuffer: ArrayBuffer;
    if (apiResponse.data instanceof ArrayBuffer) {
      arrayBuffer = apiResponse.data;
    } else if (apiResponse.data) {
      arrayBuffer = await new Response(apiResponse.data).arrayBuffer();
    } else {
      throw new Error("No data received from API");
    }

    // Load and process the ZIP file
    const zip = await JSZip.loadAsync(arrayBuffer);
    const images: Image[] = [];
    let index = 0;

    // Extract each file from the ZIP
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
            metadata: metadata,
          }),
        );

        index++;
      }
    }

    return images;
  }

  /**
   * Process and validate metadata before sending to API
   *
   * @param metadata - User-provided metadata
   * @returns Processed metadata object
   */
  private processMetadata(metadata: Metadata): Metadata {
    // Use the metadata processor to handle all processing logic
    return metadataProcessor.processMetadata(metadata);
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
  private async handleDirectorDecompression(
    compressedData: ArrayBuffer,
  ): Promise<Uint8Array> {
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
      if (
        error instanceof Error &&
        (error.message.includes("invalid zip") ||
          error.message.includes("Central Directory header not found"))
      ) {
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

  /**
   * Encode images to vibe tokens using the /encode-vibe endpoint
   * Uses caching to avoid unnecessary API calls for previously processed images
   *
   * @param metadata - Metadata object to update with vibe tokens
   * @returns Promise resolving when encoding is complete
   * @private
   */
  private async encodeVibe(metadata: Metadata): Promise<void> {
    // Skip if model is not V4 or V4 Curated
    const v4Models = [Model.V4, Model.V4_CUR];
    if (!metadata.model || !v4Models.includes(metadata.model)) {
      return;
    }

    // Skip if no reference images
    if (
      !metadata.referenceImageMultiple ||
      metadata.referenceImageMultiple.length === 0
    ) {
      return;
    }

    const referenceImageMultiple: string[] = [];

    // Process each reference image
    for (let i = 0; i < metadata.referenceImageMultiple.length; i++) {
      const refImage = metadata.referenceImageMultiple[i];

      const refInfoExtracted =
        metadata.referenceInformationExtractedMultiple &&
        metadata.referenceInformationExtractedMultiple[i] !== undefined
          ? metadata.referenceInformationExtractedMultiple[i]
          : 1.0;

      // Create a unique hash from the image data for caching
      const imageHash = await this.getImageHash(refImage);
      const cacheKey = `${imageHash}:${refInfoExtracted}:${metadata.model}`;

      let vibeToken: string;

      // Check if we have this image in cache
      if (this.vibeCache.has(cacheKey)) {
        vibeToken = this.vibeCache.get(cacheKey)!;
      } else {
        // Make an API call to encode the vibe
        const payload = {
          image: refImage,
          information_extracted: refInfoExtracted,
          model: metadata.model,
        };

        // Use the web host for vibe encoding
        const hostInstance = HOST_INSTANCES[Host.WEB];

        try {
          // Make the API request using our central request method
          const response = await this.makeRequest(
            `${hostInstance.url}${Endpoint.ENCODE_VIBE}`,
            payload,
            hostInstance.accept,
          );

          // Convert response to string
          let vibeData: string;
          if (response.data instanceof ArrayBuffer) {
            vibeData = new TextDecoder().decode(response.data);
          } else if (response.data) {
            const buffer = await new Response(response.data).arrayBuffer();
            vibeData = new TextDecoder().decode(buffer);
          } else {
            throw new Error("No vibe token data received from API");
          }

          // Cache the vibe token
          vibeToken = vibeData;
          this.vibeCache.set(cacheKey, vibeToken);
        } catch (error) {
          if ((error as any).name === "AbortError") {
            throw new Error(
              "Vibe encoding request timed out. If the problem persists, consider setting a higher 'timeout' value.",
            );
          }
          throw error;
        }
      }

      // Add both the original image and its vibe token
      referenceImageMultiple.push(vibeToken);
    }

    // Update metadata with both reference images and their vibe tokens
    metadata.referenceImageMultiple = [...referenceImageMultiple];

    // Clean up legacy fields
    metadata.referenceInformationExtractedMultiple = undefined;
  }

  /**
   * Create a hash for an image to use as a cache key
   *
   * @param base64Image - Base64 encoded image data
   * @returns Promise resolving to a hash string
   * @private
   */
  private async getImageHash(base64Image: string): Promise<string> {
    // Handle Node.js environment
    if (typeof window === "undefined") {
      try {
        const crypto = require("crypto");
        const imageBytes = Buffer.from(base64Image, "base64");
        return crypto.createHash("sha256").update(imageBytes).digest("hex");
      } catch (e) {
        throw new Error("Failed to hash image: " + e);
      }
    }
    // Handle browser environment
    else {
      try {
        const imageBytes = atob(base64Image);
        const uint8Array = new Uint8Array(imageBytes.length);
        for (let i = 0; i < imageBytes.length; i++) {
          uint8Array[i] = imageBytes.charCodeAt(i);
        }

        const hashBuffer = await crypto.subtle.digest("SHA-256", uint8Array);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      } catch (e) {
        throw new Error("Failed to hash image: " + e);
      }
    }
  }
}
