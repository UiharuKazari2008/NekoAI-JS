# 🐾 NekoAI-JS

<div align="center">
  <img src="https://raw.githubusercontent.com/Nya-Foundation/NekoAI-JS/main/assets/banner.png" alt="NekoAI-JS Banner" width="800" />
  <h3>🎨 A lightweight JavaScript/TypeScript API for NovelAI image generation and director tools.</h3>
  
  <div>
    <a href="https://github.com/Nya-Foundation/NekoAI-JS/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Nya-Foundation/nekoai-js.svg" alt="License"/></a>
    <a href="https://github.com/Nya-Foundation/NekoAI-JS/actions/workflows/release.yml"><img src="https://github.com/Nya-Foundation/NekoAI-JS/actions/workflows/release.yml/badge.svg" alt="Builds & Release"/></a>
    <a href="https://www.npmjs.com/package/nekoai-js"><img src="https://img.shields.io/npm/v/nekoai-js.svg" alt="npm version"/></a>
    <a href="https://deepwiki.com/Nya-Foundation/NekoAI-JS"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"/></a>
  </div>
</div>

## 🌈 Introduction

> 🐾 **NekoAI-JS** is a **lightweight** and **easy-to-use** JavaScript/TypeScript wrapper for NovelAI's image generation capabilities. This package makes it simple to integrate NovelAI's powerful image generation and manipulation tools into your JavaScript applications with minimal code overhead.
>
> Built with modern JavaScript/TypeScript features for both browser and Node.js environments, it provides full access to NovelAI's latest models (V3, V4, V4.5) and Director tools while maintaining a clean interface. This project is based on the [NekoAI-API](https://github.com/Nya-Foundation/NekoAI-API) Python package.

## 🌟 Core Capabilities

| Feature                     | Description                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------ |
| 🚀 **Lightweight**          | Focuses on image generation and Director tools, providing a simple and easy-to-use interface.          |
| ⚙️ **Parameterized**        | Provides strongly typed interfaces to easily set up generation parameters with validation.             |
| 🔑 **Token Authentication** | Supports direct token authentication for API access.                                                   |
| 🌐 **Cross-Platform**       | Works in both browser and Node.js environments.                                                        |
| ✨ **Latest Models**        | Full support for V3, V4, and V4.5 models including multi-character generation.                         |
| 🛠️ **Director Tools**       | Complete support for all NovelAI Director tools like line art, background removal, and emotion change. |
| 🔄 **TypeScript Support**   | Full TypeScript definitions for all API parameters and responses.                                      |
| 🖼️ **Flexible Image Input** | Accepts various image input formats (paths, URLs, Blob, File, ArrayBuffer) for cross-platform use.     |
| 🔁 **Automatic Retries**    | Built-in retry mechanism for handling rate limits and temporary API failures.                          |
| 📦 **Modular Structure**    | Well-organized, domain-specific modules for better maintainability and code organization.              |

## 📦 Installation

```sh
# Using npm
npm install nekoai-js

# Using yarn
yarn add nekoai-js

# Using pnpm
pnpm add nekoai-js
```

For Node.js environments, you may need to install the optional canvas dependency for image processing:

```sh
# Using npm
npm install canvas

# Using yarn
yarn add canvas

# Using pnpm
pnpm add canvas
```

This is not required for browser environments, as they use the native Canvas API.

## 🚀 Usage

### 🔑 Initialization

Import the package and initialize a client with your NovelAI access token.

```javascript
// ESM
import { NovelAI } from "nekoai-js";

// CommonJS
const { NovelAI } = require("nekoai-js");

// Initialize with token
const client = new NovelAI({
  token: "your_access_token",
});
```

### 🖼️ Image Generation

Generate images with the `generateImage` method. The method takes parameters directly or as a `Metadata` object.

```javascript
import { NovelAI, Model, Resolution, Sampler } from "nekoai-js";

// Initialize client
const client = new NovelAI({
  token: "your_access_token",
});

// Generate using parameters directly
const images = await client.generateImage({
  prompt: "1girl, cute, anime style, detailed",
  model: Model.V4_5_CUR,
  resPreset: Resolution.NORMAL_PORTRAIT,
  nSamples: 1,
  seed: 1234567890, // Fixed seed for reproducibility
});

// Save images (Node.js environment)
for (const image of images) {
  await image.save("./output");
  console.log(`Image saved: ${image.filename}`);
}

// Get image data URL (browser environment)
for (const image of images) {
  const dataUrl = image.toDataURL();
  console.log(`Image data URL: ${dataUrl.substring(0, 50)}...`);
}
```

### Multi-Character Generation (V4.5)

V4.5 models support generating multiple characters with character-specific prompts and positioning.

```javascript
import { NovelAI, Model, Resolution } from "nekoai-js";

// Initialize client
const client = new NovelAI({
  token: "your_access_token",
});

// Create character prompts with positioning
const characterPrompts = [
  {
    prompt: "girl, red hair, red dress",
    uc: "bad hands, bad anatomy",
    center: { x: 0.3, y: 0.3 },
  },
  {
    prompt: "boy, blue hair, blue uniform",
    uc: "bad hands, bad anatomy",
    center: { x: 0.7, y: 0.7 },
  },
];

// Generate image with multiple characters
const images = await client.generateImage({
  prompt: "two people standing together, park background",
  model: Model.V4_5_CUR,
  resPreset: Resolution.NORMAL_LANDSCAPE,
  characterPrompts,
});

// Process the resulting images
for (const image of images) {
  // Browser
  const dataUrl = image.toDataURL();
  // Node.js
  await image.save("./output");
}
```

### Image to Image

To perform `img2img` action, set `action` parameter to `Action.IMG2IMG`, and provide a base64-encoded image.

```javascript
import { NovelAI, Action } from "nekoai-js";
import { readFileSync } from "fs"; // Node.js only

// Initialize client
const client = new NovelAI({
  token: "your_access_token",
});

// Read image and convert to base64 (Node.js)
const image = readFileSync("./input/image.png");
const base64Image = image.toString("base64");

// Browser version:
// const base64Image = await fileToBase64(imageFile); // You'll need to implement fileToBase64

const images = await client.generateImage({
  prompt: "1girl, fantasy outfit",
  action: Action.IMG2IMG,
  width: 512,
  height: 768,
  image: base64Image,
  strength: 0.5, // Lower = more similar to original
  noise: 0.1,
});

for (const image of images) {
  await image.save("./output");
}
```

### Director Tools

NovelAI offers several Director tools for image manipulation, all accessible through dedicated methods.

```javascript
import { NovelAI } from "nekoai-js";
import { readFileSync } from "fs"; // Node.js only

// Initialize client
const client = new NovelAI({
  token: "your_access_token",
});

// Line Art
const lineArtResult = await client.lineArt("./input/image.png");
await lineArtResult.save("./output");

// Background Removal
const bgRemovalResult = await client.backgroundRemoval("./input/image.png");
await bgRemovalResult.save("./output");

// Change Emotion
const emotionResult = await client.changeEmotion({
  image: "./input/image.png",
  emotion: "happy",
  prompt: "neutral",
  emotionLevel: 0, // Normal level
});
await emotionResult.save("./output");

// Other Director Tools
const declutterResult = await client.declutter("./input/image.png");
const colorizeResult = await client.colorize("./input/image.png");
```

All Director Tool methods automatically handle ZIP-compressed responses from the API, extracting the image data for you. This works across both Node.js and browser environments.

### Flexible Image Input

The library supports multiple image input formats for cross-platform compatibility. Here are examples of using various input types with Director tools:

#### Node.js Environment

```javascript
import { NovelAI } from "nekoai-js";
import { readFileSync } from "fs";

const client = new NovelAI({
  token: "your_access_token",
});

// 1. Using a file path
const result1 = await client.lineArt("./input/image.png");

// 2. Using a Uint8Array
const imageData = readFileSync("./input/image.png");
const result2 = await client.lineArt(imageData);

// 3. Using a base64 string
const base64Data = readFileSync("./input/image.png").toString("base64");
const result3 = await client.backgroundRemoval(base64Data);

// 4. Using a remote URL
const result4 = await client.declutter("https://example.com/image.png");
```

#### Browser Environment

```javascript
import { NovelAI } from "nekoai-js";

const client = new NovelAI({
  token: "your_access_token",
});

// 1. Using a File from input element
const fileInput = document.getElementById("fileInput");
fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  const result = await client.lineArt(file);

  // Display result
  const img = document.createElement("img");
  img.src = result.toDataURL();
  document.body.appendChild(img);
});

// 2. Using a Blob
const response = await fetch("https://example.com/image.png");
const blob = await response.blob();
const result = await client.backgroundRemoval(blob);

// 3. Using an image element
const imgElement = document.getElementById("sourceImage");
const result = await client.changeEmotion({
  image: imgElement,
  targetEmotion: "happy",
});

// 4. Using a canvas element
const canvas = document.getElementById("sourceCanvas");
const result = await client.colorize(canvas);

// 5. Using a data URL
const result = await client.declutter("data:image/png;base64,iVBORw0KGg...");
```

### Using Custom Hosts

NekoAI-JS supports using custom hosts for API requests. This is useful if you need to use a different endpoint or if you're using a proxy server.

```javascript
import { NovelAI, Host, createCustomHost } from "nekoai-js";

// Initialize client
const client = new NovelAI({
  token: "your_access_token",
});

// Method 1: Use predefined hosts
const images1 = await client.generateImage(
  {
    prompt: "1girl, cute, anime style",
    model: Model.V3,
  },
  Host.API, // Use the API host instead of default WEB host
);

// Method 2: Create and use a custom host
const customHost = createCustomHost(
  "https://your-custom-host.com",
  "binary/octet-stream",
  "custom-host-name",
);

const images2 = await client.generateImage(
  {
    prompt: "1girl, cute, anime style",
    model: Model.V4,
  },
  customHost,
);

// Custom hosts also work with director tools
const lineArtResult = await client.lineArt("./input/image.png", customHost);
```

You can use custom hosts for:

1. Connection to third-party API providers
2. Working with proxies
3. Connecting to local NovelAI servers
4. Load balancing between multiple endpoints

### Custom Retry Configuration

NekoAI-JS includes a built-in retry mechanism for handling rate limits and temporary API failures. By default, retries are enabled with reasonable defaults, but you can customize this behavior:

```javascript
import { NovelAI, Model } from "nekoai-js";

// Initialize client with custom retry settings
const client = new NovelAI({
  token: "your_access_token",
  retry: {
    enabled: true, // Enable retries
    maxRetries: 5, // Maximum 5 retry attempts
    baseDelay: 2000, // Start with 2 second delay
    maxDelay: 60000, // Maximum delay of 1 minute
    retryStatusCodes: [429], // Only retry on rate limit errors
  },
});

// Generate image with retry
try {
  const images = await client.generateImage({
    prompt: "1girl, cute, anime style",
    model: Model.V4_5_CUR,
  });

  console.log("Success after potential retries!");
} catch (error) {
  console.error("Failed even after retries:", error);
}
```

You can also disable retries completely if needed:

```javascript
const client = new NovelAI({
  token: "your_access_token",
  retry: {
    enabled: false, // Disable retries
  },
});
```

The retry mechanism uses exponential backoff with jitter to prevent overwhelming the API service when it's under stress.

## References

[NovelAI Documentation](https://docs.novelai.net/)

[NovelAI Backend API](https://api.novelai.net/docs)

[NovelAI Unofficial Knowledgebase](https://naidb.miraheze.org/wiki/Using_the_API)

[NekoAI-API Python Package](https://github.com/Nya-Foundation/NekoAI-API)
