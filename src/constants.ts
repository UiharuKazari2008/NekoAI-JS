import { HostInstance } from "./types";

export const HEADERS = {
  "Content-Type": "application/json",
  Origin: "https://novelai.net",
  Referer: "https://novelai.net",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:138.0) Gecko/20100101 Firefox/138.0",
};

export enum Host {
  API = "api",
  WEB = "web",
}

export const HOST_INSTANCES: Record<Host, HostInstance> = {
  [Host.API]: {
    url: "https://api.novelai.net",
    accept: "application/x-zip-compressed",
    name: "api",
  },
  [Host.WEB]: {
    url: "https://image.novelai.net",
    accept: "binary/octet-stream",
    name: "web",
  },
};

/**
 * Create a custom host configuration
 * @param url - The URL of the host
 * @param accept - The accept header for the host
 * @param name - A name for the host (used for image filenames)
 * @returns A host instance
 */
export function createCustomHost(
  url: string,
  accept: string = "binary/octet-stream",
  name = "custom",
): HostInstance {
  return {
    url,
    accept,
    name,
  };
}

export enum Endpoint {
  LOGIN = "/user/login",
  USERDATA = "/user/data",
  IMAGE = "/ai/generate-image",
  DIRECTOR = "/ai/augment-image",
  ENCODE_VIBE = "/ai/encode-vibe",
}

export enum Model {
  // Anime V3
  V3 = "nai-diffusion-3",
  V3_INP = "nai-diffusion-3-inpainting",
  // Anime V4
  V4 = "nai-diffusion-4-full",
  V4_INP = "nai-diffusion-4-full-inpainting",
  // Anime V4 Curated
  V4_CUR = "nai-diffusion-4-curated-preview",
  V4_CUR_INP = "nai-diffusion-4-curated-inpainting",
  // Anime V4/5 Curated
  V4_5_CUR = "nai-diffusion-4-5-curated",
  V4_5_CUR_INP = "nai-diffusion-4-5-curated-inpainting",
  // Furry model beta v1.3
  FURRY = "nai-diffusion-furry-3",
  FURRY_INP = "nai-diffusion-furry-3-inpainting",
}

export enum Controlnet {
  PALETTESWAP = "hed",
  FORMLOCK = "midas",
  SCRIBBLER = "fake_scribble",
  BUILDINGCONTROL = "mlsd",
  LANDSCAPER = "uniformer",
}

export enum Action {
  GENERATE = "generate",
  INPAINT = "infill",
  IMG2IMG = "img2img",
}

export enum DirectorTools {
  LINEART = "lineart",
  SKETCH = "sketch",
  BACKGROUND_REMOVAL = "bg-removal",
  EMOTION = "emotion",
  DECLUTTER = "declutter",
  COLORIZE = "colorize",
}

export enum EmotionOptions {
  NEUTRAL = "neutral",
  HAPPY = "happy",
  SAD = "sad",
  ANGRY = "angry",
  SCARED = "scared",
  SURPRISED = "surprised",
  TIRED = "tired",
  EXCITED = "excited",
  NERVOUS = "nervous",
  THINKING = "thinking",
  CONFUSED = "confused",
  SHY = "shy",
  DISGUSTED = "disgusted",
  SMUG = "smug",
  BORED = "bored",
  LAUGHING = "laughing",
  IRRITATED = "irritated",
  AROUSED = "aroused",
  EMBARRASSED = "embarrassed",
  WORRIED = "worried",
  LOVE = "love",
  DETERMINED = "determined",
  HURT = "hurt",
  PLAYFUL = "playful",
}

export enum EmotionLevel {
  NORMAL = 0,
  SLIGHTLY_WEAK = 1,
  WEAK = 2,
  EVEN_WEAKER = 3,
  VERY_WEAK = 4,
  WEAKEST = 5,
}

export enum Resolution {
  SMALL_PORTRAIT = "small_portrait",
  SMALL_LANDSCAPE = "small_landscape",
  SMALL_SQUARE = "small_square",
  NORMAL_PORTRAIT = "normal_portrait",
  NORMAL_LANDSCAPE = "normal_landscape",
  NORMAL_SQUARE = "normal_square",
  LARGE_PORTRAIT = "large_portrait",
  LARGE_LANDSCAPE = "large_landscape",
  LARGE_SQUARE = "large_square",
  WALLPAPER_PORTRAIT = "wallpaper_portrait",
  WALLPAPER_LANDSCAPE = "wallpaper_landscape",
}

export const RESOLUTION_DIMENSIONS: Record<Resolution, [number, number]> = {
  [Resolution.SMALL_PORTRAIT]: [512, 768],
  [Resolution.SMALL_LANDSCAPE]: [768, 512],
  [Resolution.SMALL_SQUARE]: [640, 640],
  [Resolution.NORMAL_PORTRAIT]: [832, 1216],
  [Resolution.NORMAL_LANDSCAPE]: [1216, 832],
  [Resolution.NORMAL_SQUARE]: [1024, 1024],
  [Resolution.LARGE_PORTRAIT]: [1024, 1536],
  [Resolution.LARGE_LANDSCAPE]: [1536, 1024],
  [Resolution.LARGE_SQUARE]: [1472, 1472],
  [Resolution.WALLPAPER_PORTRAIT]: [1088, 1920],
  [Resolution.WALLPAPER_LANDSCAPE]: [1920, 1088],
};

export enum Sampler {
  EULER = "k_euler",
  EULER_ANC = "k_euler_ancestral",
  DPM2S_ANC = "k_dpmpp_2s_ancestral",
  DPM2M = "k_dpmpp_2m",
  DPMSDE = "k_dpmpp_sde",
  DDIM = "ddim_v3",
}

export enum Noise {
  NATIVE = "native",
  KARRAS = "karras",
  EXPONENTIAL = "exponential",
  POLYEXPONENTIAL = "polyexponential",
}
