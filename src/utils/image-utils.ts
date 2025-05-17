import { ImageInput, ParsedImage } from "../types";
import { isNodeEnvironment, loadNodeCanvas } from "./platform-utils";

/**
 * Parse an image from various input types and return width, height, and base64 data
 * Supports browser and Node.js environments with various input formats
 *
 * @param input - Various image input formats (path, Blob, File, ArrayBuffer, etc.)
 * @returns Promise resolving to a ParsedImage object with width, height, and base64 data
 */
export async function parseImage(input: ImageInput): Promise<ParsedImage> {
  // Handle Node.js environment
  if (isNodeEnvironment()) {
    return parseImageInNodeJs(input);
  } else {
    return parseImageInBrowser(input);
  }
}

/**
 * Parse an image in Node.js environment
 *
 * @param input - Various image input formats in Node.js
 * @returns Promise resolving to a ParsedImage object
 */
async function parseImageInNodeJs(input: ImageInput): Promise<ParsedImage> {
  // Node.js environment
  if (typeof input === "string") {
    // Path to file in Node.js
    try {
      const fs = require("fs");

      // Load the canvas module (Node.js only)
      const canvasModule = loadNodeCanvas();
      if (!canvasModule) {
        throw new Error(
          "Canvas module not available. Please install it with: npm install canvas",
        );
      }

      const { createCanvas, loadImage } = canvasModule;

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
    const canvasModule = loadNodeCanvas();
    if (!canvasModule) {
      throw new Error(
        "Canvas module not available. Please install it with: npm install canvas",
      );
    }

    const { createCanvas, loadImage } = canvasModule;
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
      throw new Error(`Failed to load image from Uint8Array: ${errorMessage}`);
    }
  } else if (input instanceof ArrayBuffer) {
    // Convert ArrayBuffer to Uint8Array
    return parseImageInNodeJs(new Uint8Array(input));
  } else if (typeof input === "object" && input !== null) {
    // Handle object formats
    if ("data" in input && input.data instanceof Uint8Array) {
      return parseImageInNodeJs(input.data);
    } else if ("url" in input && typeof input.url === "string") {
      return parseImageInNodeJs(input.url);
    }
  }

  throw new Error("Unsupported image input format in Node.js environment");
}

/**
 * Parse an image in browser environment
 *
 * @param input - Various image input formats in browser
 * @returns Promise resolving to a ParsedImage object
 */
async function parseImageInBrowser(input: ImageInput): Promise<ParsedImage> {
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
      return parseImageInBrowser(blob);
    } else if (typeof input === "object" && input !== null) {
      // Handle object formats
      if ("data" in input && input.data instanceof Uint8Array) {
        return parseImageInBrowser(input.data);
      } else if ("url" in input && typeof input.url === "string") {
        return parseImageInBrowser(input.url);
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
