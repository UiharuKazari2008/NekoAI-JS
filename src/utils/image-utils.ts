import { ImageInput, ParsedImage } from "../types";
import { isNodeEnvironment, loadNodeCanvas } from "./platform-utils";

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
  const chunkSize = 0x8000;
  for (let i = 0; i < array.length; i += chunkSize) {
    binary += String.fromCharCode(...array.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/**
 * Parse an image from various input types and return width, height, and base64 data
 * Supports browser and Node.js environments with various input formats
 *
 * @param input - Various image input formats (path, Blob, File, ArrayBuffer, etc.)
 * @returns Promise resolving to a ParsedImage object with width, height, and base64 data
 */
export async function parseImage(input: ImageInput): Promise<ParsedImage> {
  return isNodeEnvironment()
    ? parseImageInNodeJs(input)
    : parseImageInBrowser(input);
}

/**
 * Parse an image in Node.js environment using the optional canvas module
 */
async function parseImageInNodeJs(input: ImageInput): Promise<ParsedImage> {
  if (typeof input === "string" || input instanceof Uint8Array) {
    const canvasModule = await loadNodeCanvas();
    if (!canvasModule) {
      throw new Error(
        "Canvas module not available. Please install it with: npm install canvas",
      );
    }

    const { createCanvas, loadImage } = canvasModule;
    const source =
      typeof input === "string" ? input : Buffer.from(input.buffer, input.byteOffset, input.byteLength);

    try {
      const image = await loadImage(source);
      const canvas = createCanvas(image.width, image.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);

      const base64 = canvas
        .toDataURL("image/png")
        .replace(/^data:image\/png;base64,/, "");

      return { width: image.width, height: image.height, base64 };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to load image: ${errorMessage}`);
    }
  } else if (input instanceof ArrayBuffer) {
    return parseImageInNodeJs(new Uint8Array(input));
  } else if (typeof input === "object" && input !== null) {
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
 */
async function parseImageInBrowser(input: ImageInput): Promise<ParsedImage> {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get canvas rendering context");
    }

    let imageElement: HTMLImageElement | null = null;

    if (input instanceof HTMLImageElement) {
      imageElement = input;
    } else if (input instanceof HTMLCanvasElement) {
      return {
        width: input.width,
        height: input.height,
        base64: input
          .toDataURL("image/png")
          .replace(/^data:image\/png;base64,/, ""),
      };
    } else if (typeof input === "string") {
      if (
        input.startsWith("data:") ||
        input.startsWith("blob:") ||
        input.startsWith("http")
      ) {
        imageElement = await loadImageElement(input);
      } else {
        throw new Error(
          "File paths are not supported in browser environment. Use a Blob, File, or Data URL instead.",
        );
      }
    } else if (input instanceof Blob || input instanceof File) {
      const url = URL.createObjectURL(input);
      try {
        imageElement = await loadImageElement(url);
      } finally {
        URL.revokeObjectURL(url);
      }
    } else if (input instanceof ArrayBuffer || input instanceof Uint8Array) {
      const buffer =
        input instanceof ArrayBuffer ? new Uint8Array(input) : input;
      return parseImageInBrowser(new Blob([buffer], { type: "image/png" }));
    } else if (typeof input === "object" && input !== null) {
      if ("data" in input && input.data instanceof Uint8Array) {
        return parseImageInBrowser(input.data);
      } else if ("url" in input && typeof input.url === "string") {
        return parseImageInBrowser(input.url);
      } else {
        throw new Error("Unsupported image input format");
      }
    } else {
      throw new Error("Unsupported image input format");
    }

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

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image from ${src.slice(0, 64)}`));
    img.src = src;
  });
}
