/**
 * Image Metadata Parser for AI-generated images
 * Extracts metadata from various AI image generation tools (Stable Diffusion WebUI, NovelAI, etc.)
 * Supports multiple image formats and metadata storage methods
 */

import { parseImage } from "./image-utils";
import { ImageInput } from "../types";
import { isNodeEnvironment } from "./platform-utils";
import pako from "pako";
import extractChunks from "png-chunks-extract";
import * as pngChunkText from "png-chunk-text";
import ExifReader from "exifreader";

/**
 * Metadata types that can be extracted from AI-generated images
 */
export enum MetadataType {
  STABLE_DIFFUSION_WEBUI = "SD-WEBUI",
  NOVELAI = "NOVELAI",
  UNKNOWN = "UNKNOWN",
  NONE = "NONE",
}

/**
 * Structured metadata with keyword and text pairs
 */
export interface MetadataEntry {
  keyword: string;
  text: string;
}

/**
 * Result of metadata extraction including type and entries
 */
export interface ImageMetadata {
  type: MetadataType;
  entries: MetadataEntry[];
  raw?: any;
}

/**
 * DataReader class for extracting stealth metadata from image bits
 */
class DataReader {
  data: number[];
  index: number;

  constructor(data: number[]) {
    this.data = data;
    this.index = 0;
  }

  readBit(): number {
    return this.data[this.index++];
  }

  readNBits(n: number): number[] {
    const bits: number[] = [];
    for (let i = 0; i < n; i++) {
      bits.push(this.readBit());
    }
    return bits;
  }

  readByte(): number {
    let byte = 0;
    for (let i = 0; i < 8; i++) {
      byte |= this.readBit() << (7 - i);
    }
    return byte;
  }

  readNBytes(n: number): number[] {
    const bytes: number[] = [];
    for (let i = 0; i < n; i++) {
      bytes.push(this.readByte());
    }
    return bytes;
  }

  readInt32(): number {
    const bytes = this.readNBytes(4);
    return new DataView(new Uint8Array(bytes).buffer).getInt32(0, false);
  }
}

/**
 * Summary of basic image metadata and AI generation information
 */
export interface ImageSummary {
  dimensions: {
    width: number;
    height: number;
  };
  hasMetadata: boolean;
  metadataType: MetadataType;
  generationTool?: string;
  positivePrompt?: string;
  negativePrompt?: string;
  parameters?: Record<string, any>;
  rawEntries: MetadataEntry[];
}

// All modules are now imported statically at the top of the file

/**
 * Extract PNG metadata using chunk extraction
 * @param buffer - Array buffer containing PNG data
 * @param modules - Loaded modules object
 * @returns Array of metadata entries
 */
async function extractPngMetadata(
  buffer: ArrayBuffer,
  modules: Record<string, any>,
): Promise<MetadataEntry[]> {
  if (!modules.extractChunks || !modules.pngChunkText) {
    console.warn("PNG chunk extraction modules not available");
    return [];
  }

  try {
    const chunks = modules.extractChunks(new Uint8Array(buffer));
    const textChunks = chunks
      .filter((chunk: any) => chunk.name === "tEXt" || chunk.name === "iTXt")
      .map((chunk: any) => {
        if (chunk.name === "iTXt") {
          // Convert to typed array to make TypeScript happy
          const typedData = new Uint8Array(chunk.data);
          const dataArray = Array.from(typedData).filter((x) => x !== 0);

          const headerBytes = dataArray.slice(0, 11);
          const decoder = new TextDecoder();
          let header = decoder.decode(new Uint8Array(headerBytes));

          if (header === "Description") {
            const contentBytes = dataArray.slice(11);
            let txt = decoder.decode(new Uint8Array(contentBytes));
            return { keyword: "Description", text: txt };
          } else {
            let txt = decoder.decode(new Uint8Array(dataArray));
            return { keyword: "Unknown", text: txt };
          }
        } else {
          return modules.pngChunkText.decode(chunk.data);
        }
      });

    return textChunks;
  } catch (err) {
    console.error("Failed to extract PNG chunks:", err);
    return [];
  }
}

/**
 * Extract EXIF metadata from image file
 * @param file - Image file or blob
 * @param modules - Loaded modules object
 * @returns Array of metadata entries
 */
async function extractExifMetadata(
  file: File | Blob,
  modules: Record<string, any>,
): Promise<MetadataEntry[]> {
  if (!modules.ExifReader) {
    console.warn("ExifReader module not available");
    return [];
  }

  try {
    const data = await modules.ExifReader.load(file);

    if (data.UserComment && data.UserComment.value) {
      // Convert to number array to ensure type safety
      const commentValues = Array.from(data.UserComment.value).map((v) =>
        Number(v),
      );

      // Convert code points to string and remove null chars
      const metadata = String.fromCodePoint(...commentValues)
        .replace(/\0/g, "") // Replace all null chars
        .slice(7); // Skip UNICODE prefix

      return [{ keyword: "parameters", text: metadata }];
    }

    return [];
  } catch (err) {
    console.error("Failed to extract EXIF metadata:", err);
    return [];
  }
}

/**
 * Extract stealth metadata hidden in image LSBs (used by NovelAI)
 * @param imageData - Parsed image data
 * @param modules - Loaded modules object
 * @returns Extracted metadata object or null
 */
async function extractStealthMetadata(
  imageData: { width: number; height: number; base64: string },
  modules: Record<string, any>,
): Promise<any> {
  if (!modules.pako) {
    console.warn("pako module not available, cannot extract stealth metadata");
    return null;
  }

  let canvas: HTMLCanvasElement | any;
  let ctx: CanvasRenderingContext2D | any;
  let img: HTMLImageElement | any;

  try {
    if (isNodeEnvironment()) {
      // Node.js environment
      try {
        // Dynamic import for Node.js only to prevent browser bundling issues
        const canvasModule = await import("canvas").catch(() => {
          console.error("Canvas module not installed in Node environment");
          throw new Error("Canvas module required for stealth metadata extraction in Node");
        });
        
        img = await canvasModule.loadImage(
          `data:image/png;base64,${imageData.base64}`,
        );
        canvas = canvasModule.createCanvas(img.width, img.height);
        ctx = canvas.getContext("2d");
      } catch (err) {
        console.error("Failed to load canvas module in Node.js:", err);
        return null;
      }
    } else {
      // Browser environment
      canvas = document.createElement("canvas");
      // Use standard options for better compatibility across browsers
      ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        console.error("Failed to get canvas 2d context");
        return null;
      }

      img = new Image();
      // Set crossOrigin for CORS compatibility when loading remote images
      img.crossOrigin = "anonymous";
      img.src = `data:image/png;base64,${imageData.base64}`;

      // Wait for image to load in browser
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (e: Event | string) => reject(new Error(`Failed to load image: ${e}`));
        // Add timeout to prevent hanging
        setTimeout(() => reject(new Error("Image loading timeout")), 30000);
      });
    }

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const imagePixels = ctx.getImageData(0, 0, img.width, img.height);
    const lowestData: number[] = [];

    // Extract the least significant bit from each alpha channel
    for (let x = 0; x < img.width; x++) {
      for (let y = 0; y < img.height; y++) {
        let index = (y * img.width + x) * 4;
        let a = imagePixels.data[index + 3];
        lowestData.push(a & 1);
      }
    }

    const magic = "stealth_pngcomp";
    const reader = new DataReader(lowestData);
    const readMagic = reader.readNBytes(magic.length);
    const magicString = String.fromCharCode(...readMagic);

    if (magic === magicString) {
      const dataLength = reader.readInt32();
      const gzipData = reader.readNBytes(dataLength / 8);
      const data = modules.pako.ungzip(new Uint8Array(gzipData));
      const jsonString = new TextDecoder().decode(data);

      try {
        const json = JSON.parse(jsonString);
        return json;
      } catch (parseErr) {
        console.error("Failed to parse stealth metadata JSON:", parseErr);
        return null;
      }
    }

    return null;
  } catch (err) {
    console.error("Failed to extract stealth metadata:", err);
    return null;
  }
}

/**
 * Parse WebUI-style metadata
 * @param entry - Metadata entry containing parameters text
 * @returns Array of structured metadata entries
 */
function parseWebUiMetadata(entry: MetadataEntry): MetadataEntry[] {
  // Handle SD WebUI format - split on "Steps:" and "Negative prompt:"
  const parts = entry.text.split("Steps: ");
  const prompts = parts[0];
  const otherParas = parts.length > 1 ? parts[1] : "";

  const promptParts = prompts.split("Negative prompt:");
  const positivePrompt = promptParts[0].trim();
  const negativePrompt =
    promptParts.length > 1 ? promptParts[1].trim() : "None";

  return [
    {
      keyword: "Positive prompt",
      text: positivePrompt,
    },
    {
      keyword: "Negative prompt",
      text: negativePrompt,
    },
    {
      keyword: "Generation parameters",
      text: otherParas ? `Steps: ${otherParas}`.trim() : "",
    },
  ];
}

/**
 * Convert stealth metadata to structured entries
 * @param exif - Extracted stealth metadata object
 * @returns Array of structured metadata entries
 */
function convertStealthMetadataToEntries(exif: any): MetadataEntry[] {
  if (!exif) return [];

  return Object.keys(exif).map((key) => ({
    keyword: key,
    text:
      typeof exif[key] === "object"
        ? JSON.stringify(exif[key])
        : String(exif[key]),
  }));
}

/**
 * Extract metadata from an AI-generated image
 * @param input - Various image input formats
 * @returns Promise resolving to extracted image metadata
 */
export async function extractImageMetadata(
  input: ImageInput,
): Promise<ImageMetadata> {
  try {
    // First, parse the image to get a consistent format
    const parsedImage = await parseImage(input).catch(err => {
      console.error("Failed to parse image:", err);
      throw new Error(`Image parsing failed: ${err.message || "Unknown error"}`);
    });

    let metadata: MetadataEntry[] = [];
    let metadataType = MetadataType.UNKNOWN;

    // Handle File/Blob inputs directly for formats that need the original file
    if (input instanceof File || input instanceof Blob) {
      const fileType = input.type;

      if (fileType === "image/png") {
        // For PNG files, extract chunks
        const buffer = await input.arrayBuffer();
        metadata = await extractPngMetadata(buffer, { extractChunks, pngChunkText });
      } else if (
        ["image/webp", "image/jpeg", "image/avif"].includes(fileType)
      ) {
        // For JPEG/WEBP/AVIF, extract EXIF
        metadata = await extractExifMetadata(input, { ExifReader });
      }
    } else if (typeof input === "string") {
      // For file paths or URLs, try to determine type and handle accordingly
      const isLocalPath =
        !input.startsWith("data:") &&
        !input.startsWith("http:") &&
        !input.startsWith("https:") &&
        !input.startsWith("blob:");

      if (isLocalPath && isNodeEnvironment()) {
        // Local file in Node.js
        try {
          const fs = await import("fs/promises");
          const buffer = await fs.readFile(input);

          if (input.toLowerCase().endsWith(".png")) {
            metadata = await extractPngMetadata(buffer.buffer, { extractChunks, pngChunkText });
          } else if (
            [".jpg", ".jpeg", ".webp", ".avif"].some((ext) =>
              input.toLowerCase().endsWith(ext),
            )
          ) {
            const blob = new Blob([buffer]);
            metadata = await extractExifMetadata(blob, { ExifReader });
          }
        } catch (fsErr) {
          console.error("Failed to read local file:", fsErr);
        }
      }
    }

    // If no metadata found, try stealth extraction
    if (metadata.length === 0) {
      const stealthData = await extractStealthMetadata(parsedImage, { pako });

      if (stealthData) {
        metadata = convertStealthMetadataToEntries(stealthData);
        metadataType = MetadataType.NOVELAI;
      } else {
        // No metadata found
        return {
          type: MetadataType.NONE,
          entries: [],
        };
      }
    } else if (metadata.length === 1 && metadata[0].keyword === "parameters") {
      // This is likely SD WebUI format
      metadata = parseWebUiMetadata(metadata[0]);
      metadataType = MetadataType.STABLE_DIFFUSION_WEBUI;
    } else {
      // Multiple entries, likely NovelAI
      metadataType = MetadataType.NOVELAI;
    }

    return {
      type: metadataType,
      entries: metadata,
    };
  } catch (error) {
    console.error("Failed to extract image metadata:", error);
    return {
      type: MetadataType.NONE,
      entries: [],
      raw: error,
    };
  }
}

/**
 * Extract raw metadata entries without parsing/categorizing
 * @param input - Various image input formats
 * @returns Promise resolving to raw metadata entries
 */
export async function extractRawMetadata(
  input: ImageInput,
): Promise<MetadataEntry[]> {
  try {
    const result = await extractImageMetadata(input);
    return result.entries;
  } catch (error) {
    console.error("Failed to extract raw metadata:", error);
    return [];
  }
}

/**
 * Extract a simple summary of an AI-generated image
 * @param input - Various image input formats
 * @returns Promise resolving to image summary
 */
export async function getImageSummary(
  input: ImageInput,
): Promise<ImageSummary> {
  try {
    const parsedImage = await parseImage(input);
    const metadata = await extractImageMetadata(input);

  const summary: ImageSummary = {
    dimensions: {
      width: parsedImage.width,
      height: parsedImage.height,
    },
    hasMetadata: metadata.entries.length > 0,
    metadataType: metadata.type,
    rawEntries: metadata.entries,
  };

  // Extract key information based on metadata type
  if (metadata.type === MetadataType.STABLE_DIFFUSION_WEBUI) {
    summary.generationTool = "Stable Diffusion WebUI";

    // Find positive and negative prompts
    const positivePrompt = metadata.entries.find(
      (e) => e.keyword === "Positive prompt",
    );
    const negativePrompt = metadata.entries.find(
      (e) => e.keyword === "Negative prompt",
    );
    const genParams = metadata.entries.find(
      (e) => e.keyword === "Generation parameters",
    );

    if (positivePrompt) summary.positivePrompt = positivePrompt.text;
    if (negativePrompt) summary.negativePrompt = negativePrompt.text;

    // Parse parameters like Steps, Sampler, CFG, etc.
    if (genParams) {
      const params: Record<string, any> = {};
      const paramParts = genParams.text.split(",").map((p) => p.trim());

      paramParts.forEach((part) => {
        const colonIndex = part.indexOf(":");
        if (colonIndex > 0) {
          const key = part.slice(0, colonIndex).trim();
          const value = part.slice(colonIndex + 1).trim();
          params[key] = value;
        }
      });

      summary.parameters = params;
    }
  } else if (metadata.type === MetadataType.NOVELAI) {
    summary.generationTool = "NovelAI";

    // Find common NovelAI entries
    const prompt = metadata.entries.find((e) => e.keyword === "prompt");
    const uc = metadata.entries.find((e) => e.keyword === "uc");

    if (prompt) summary.positivePrompt = prompt.text;
    if (uc) summary.negativePrompt = uc.text;

    // Convert all entries to parameters
    summary.parameters = metadata.entries.reduce(
      (acc, entry) => {
        if (entry.keyword !== "prompt" && entry.keyword !== "uc") {
          try {
            acc[entry.keyword] = JSON.parse(entry.text);
          } catch {
            acc[entry.keyword] = entry.text;
          }
        }
        return acc;
      },
      {} as Record<string, any>,
    );
  }

  return summary;
  } catch (error) {
    console.error("Failed to create image summary:", error);
    return {
      dimensions: { width: 0, height: 0 },
      hasMetadata: false,
      metadataType: MetadataType.NONE,
      rawEntries: [],
    };
  }
}
