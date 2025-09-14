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

### 📄 License Change Notice

> **Important**: This project has transitioned from MIT to **AGPL-3.0** license to ensure better compliance and alignment with our inspiration source. As this work builds significantly upon concepts and approaches from NekoAI-API, we've adopted a more appropriate license that better reflects the collaborative nature of open-source development and provides stronger copyleft protections for the community.

## 🌟 Core Capabilities

| Feature                     | Description                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------------ |
| 🚀 **Lightweight**          | Focuses on image generation and Director tools, providing a simple and easy-to-use interface.          |
| ⚙️ **Parameterized**        | Provides strongly typed interfaces to easily set up generation parameters with validation.             |
| 🔑 **Token Authentication** | Supports direct token authentication for API access.                                                   |
| 🎬 **Real-time Streaming**  | Stream V4/V4.5 generation progress in real-time, watching each denoising step as it happens.           |
| 🌐 **Cross-Platform**       | Works in both browser and Node.js environments.                                                        |
| ✨ **Latest Models**        | Full support for V3, V4, and V4.5 models including multi-character generation.                         |
| 🛠️ **Director Tools**       | Complete support for all NovelAI Director tools like line art, background removal, and emotion change. |
| 🔄 **TypeScript Support**   | Full TypeScript definitions for all API parameters and responses.                                      |
| 🔁 **Automatic Retries**    | Built-in retry mechanism for handling rate limits and temporary API failures.                          |

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
  model: Model.V4_5,
  resPreset: Resolution.NORMAL_PORTRAIT,
  n_samples: 1,
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

### Streaming Generation (V4/V4.5 Models)

V4 and V4.5 models support real-time streaming, allowing you to watch the generation process as it happens. Enable streaming by passing `true` as the second parameter to `generateImage()`.

```javascript
import { NovelAI, Model, Resolution, EventType } from "nekoai-js";

// Initialize client
const client = new NovelAI({
  token: "your_access_token",
});

// Generate with streaming enabled
const response = await client.generateImage(
  {
    prompt: "1girl, cute, anime style",
    model: Model.V4_5,
    resPreset: Resolution.NORMAL_PORTRAIT,
    steps: 28,
    seed: 3417044607,
  },
  true, // Enable streaming
);

// Handle streaming response
if (response && typeof response[Symbol.asyncIterator] === "function") {
  console.log("Streaming generation steps...");
  
  for await (const event of response) {
    if (event.event_type === EventType.INTERMEDIATE) {
      // Save intermediate steps
      await event.image.save(`./output/step_${event.step_ix}.jpg`);
      console.log(`Step ${event.step_ix} completed`);
    } else if (event.event_type === EventType.FINAL) {
      // Save final result
      await event.image.save(`./output/final_result.png`);
      console.log("Generation complete!");
    }
  }
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
  model: Model.V4_5,
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

### Vibe Transfer (V4 model only)

All V4 models support vibe transfer, which allows you to transfer the artistic style and mood from reference images to your generated content.

```javascript
import { NovelAI, Model, Resolution, parseImage } from "nekoai-js";

// Initialize client
const client = new NovelAI({
  token: "your_access_token",
});

// Parse reference image for vibe transfer
const vibeReference = await parseImage("./input/reference_style.png");

// Generate image with vibe transfer
const images = await client.generateImage({
  prompt: "1girl, cute, detailed",
  model: Model.V4_5,
  resPreset: Resolution.NORMAL_PORTRAIT,
  reference_image_multiple: [vibeReference.base64], // Reference image will be converted vibe token (process in the background)
  reference_information_extracted_multiple: [0.7], // Extraction strength (0.0-1.0)
  steps: 30,
  seed: 3417044607,
});

// Process the resulting images
for (const image of images) {
  await image.save("./output");
}
```

### Image to Image

To perform `img2img` action, set `action` parameter to `Action.IMG2IMG`, and provide a source image. Use the `parseImage` utility to handle multiple image formats seamlessly.

```javascript
import { NovelAI, Action, parseImage } from "nekoai-js";

// Initialize client
const client = new NovelAI({
  token: "your_access_token",
});

// Parse image using the utility (supports multiple formats)
const sourceImage = await parseImage("./input/image.png");

const images = await client.generateImage({
  prompt: "1girl, fantasy outfit",
  action: Action.IMG2IMG,
  width: sourceImage.width,
  height: sourceImage.height,
  image: sourceImage.base64,
  strength: 0.5, // Lower = more similar to original
  noise: 0.1,
});

for (const image of images) {
  await image.save("./output");
}
```

### Inpainting (V4.5)

V4.5 supports advanced inpainting for selective image editing. Use `Model.V4_5_INP` for optimal inpainting results.

```javascript
import { NovelAI, Model, Action, parseImage } from "nekoai-js";

// Initialize client
const client = new NovelAI({
  token: "your_access_token",
});

// Parse images using the utility function
const sourceImage = await parseImage("./input/source.png");
const maskImage = await parseImage("./input/mask.png");

const images = await client.generateImage({
  prompt: "beautiful flower garden",
  model: Model.V4_5_INP, // Use inpainting model
  action: Action.INPAINT,
  image: sourceImage.base64,
  mask: maskImage.base64,
  steps: 28,
  seed: 3417044607,
});

for (const image of images) {
  await image.save("./output");
}
```

### Streaming Inpainting

Combine streaming with inpainting to watch the inpainting process in real-time.

```javascript
import { NovelAI, Model, Action, EventType, parseImage } from "nekoai-js";

// Initialize client
const client = new NovelAI({
  token: "your_access_token",
});

// Parse images
const sourceImage = await parseImage("./input/source.png");
const maskImage = await parseImage("./input/mask.png");

// Generate with streaming inpainting
const response = await client.generateImage(
  {
    prompt: "1girl, cute",
    model: Model.V4_5_INP,
    action: Action.INPAINT,
    image: sourceImage.base64,
    mask: maskImage.base64,
    steps: 28,
  },
  true, // Enable streaming
);

// Process streaming results
for await (const event of response) {
  if (event.event_type === EventType.INTERMEDIATE) {
    await event.image.save(`./output/inpaint_step_${event.step_ix}.jpg`);
  } else if (event.event_type === EventType.FINAL) {
    await event.image.save(`./output/inpaint_final.png`);
  }
}
```

### Director Tools

NovelAI offers several Director tools for image manipulation, all accessible through dedicated methods. These tools automatically handle various image input formats through the built-in `parseImage` utility.

```javascript
import { NovelAI } from "nekoai-js";

// Initialize client
const client = new NovelAI({
  token: "your_access_token",
});

// Line Art - supports file paths, Blobs, Files, URLs, etc.
const lineArtResult = await client.lineArt("./input/image.png");
await lineArtResult.save("./output");

// Background Removal
const bgRemovalResult = await client.backgroundRemoval("./input/image.png");
await bgRemovalResult.save("./output");

// Change Emotion
const emotionResult = await client.changeEmotion(
  "./input/image.png",
  "happy", // Target emotion
  "neutral", // Additional prompt
  0, // Emotion level (0-5)
);
await emotionResult.save("./output");

// Other Director Tools
const declutterResult = await client.declutter("./input/image.png", "dreamy", 0);
const colorizeResult = await client.colorize("./input/image.png","dream, mirror",1,);
```

All Director Tool methods automatically handle ZIP-compressed responses from the API, extracting the image data for you. This works across both Node.js and browser environments.

### Image Input Support

NekoAI-JS provides comprehensive image input support through the `parseImage` utility function, which automatically handles format detection and conversion across different environments.

#### Supported Image Formats

The `parseImage` function supports multiple input types for maximum flexibility:

```javascript
import { NovelAI, parseImage } from "nekoai-js";

const client = new NovelAI({
  token: "your_access_token",
});

// 1. File paths (Node.js only)
const image1 = await parseImage("./input/photo.png");
const image2 = await parseImage("./input/drawing.jpg");

// 2. Uint8Array / ArrayBuffer (both environments)
const imageData = new Uint8Array(/* image bytes */);
const image3 = await parseImage(imageData);

// 3. Base64 strings (both environments)
const base64String = "iVBORw0KGgoAAAANSUhEUgAA...";
const image4 = await parseImage(`data:image/png;base64,${base64String}`);

// 4. URLs (browser only)
const image5 = await parseImage("https://example.com/image.png");
const image6 = await parseImage("data:image/jpeg;base64,/9j/4AAQ...");

// 5. File objects from input elements (browser only)
const fileInput = document.getElementById("imageInput");
const file = fileInput.files[0];
const image7 = await parseImage(file);

// 6. Blob objects (browser only)
const response = await fetch("https://example.com/image.png");
const blob = await response.blob();
const image8 = await parseImage(blob);

// 7. Canvas elements (browser only)
const canvas = document.getElementById("myCanvas");
const image9 = await parseImage(canvas);

// 8. Image elements (browser only)
const imgElement = document.getElementById("myImage");
const image10 = await parseImage(imgElement);

// The parseImage function returns { width, height, base64 }
console.log(`Image dimensions: ${image1.width}x${image1.height}`);

// Use with generation or director tools
const images = await client.generateImage({
  prompt: "enhance this image",
  action: Action.IMG2IMG,
  image: image1.base64,
  width: image1.width,
  height: image1.height,
});
```

#### Cross-Platform Compatibility

- **Node.js**: Supports file paths, Uint8Array, ArrayBuffer, and URLs
- **Browser**: Supports File, Blob, Canvas, Image elements, Data URLs, and remote URLs
- **Both**: Supports Uint8Array, ArrayBuffer, and base64 data

#### Automatic Format Detection

The utility automatically:
- Detects image dimensions
- Converts to base64 format for API compatibility
- Handles JPEG, PNG, and other common formats
- Preserves image quality during conversion
- Works seamlessly across different environments

### Advanced Usage Examples

Here are practical examples showing how to use `parseImage` with various input formats and director tools:

#### Node.js Environment

```javascript
import { NovelAI, parseImage } from "nekoai-js";

const client = new NovelAI({
  token: "your_access_token",
});

// Example 1: Processing multiple image formats
const imageFormats = [
  "./input/photo.png",
  "./input/sketch.jpg", 
  "./input/artwork.webp"
];

for (const imagePath of imageFormats) {
  const parsedImage = await parseImage(imagePath);
  console.log(`Processing ${imagePath}: ${parsedImage.width}x${parsedImage.height}`);
  
  const result = await client.lineArt(imagePath);
  await result.save(`./output/lineart_${Date.now()}.png`);
}

// Example 2: Using with binary data
const fs = require("fs");
const imageBuffer = fs.readFileSync("./input/photo.png");
const result = await client.backgroundRemoval(imageBuffer);
await result.save("./output");
```

#### Browser Environment

```javascript
import { NovelAI, parseImage } from "nekoai-js";

const client = new NovelAI({
  token: "your_access_token",
});

// Example 1: File upload with preview
const fileInput = document.getElementById("fileInput");
fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Parse the image to get dimensions
  const parsedImage = await parseImage(file);
  console.log(`Uploaded image: ${parsedImage.width}x${parsedImage.height}`);

  // Process with director tool
  const result = await client.lineArt(file);

  // Display result
  const img = document.createElement("img");
  img.src = result.toDataURL();
  img.style.maxWidth = "500px";
  document.body.appendChild(img);
});

// Example 2: Canvas processing
const canvas = document.getElementById("drawingCanvas");
const processCanvas = async () => {
  const result = await client.sketch(canvas);
  
  // Create download link
  const link = document.createElement("a");
  link.download = "sketch_result.png";
  link.href = result.toDataURL();
  link.click();
};

// Example 3: URL processing with error handling
const processImageUrl = async (url) => {
  try {
    const result = await client.colorize(url);
    return result.toDataURL();
  } catch (error) {
    console.error("Failed to process image:", error);
    return null;
  }
};
```

### Using Custom Hosts

NekoAI-JS supports using custom hosts for API requests. This is useful if you need to use a different endpoint or if you're using a proxy server.

```javascript
import { NovelAI, Model, Host } from "nekoai-js";

// Method 1: Use predefined hosts
const client1 = new NovelAI({
  token: "your_access_token",
  host: Host.API, // Use API host instead of default WEB host
});

const images1 = await client1.generateImage({
  prompt: "1girl, cute, anime style",
  model: Model.V3,
});

// Method 2: Use a custom host URL
const client2 = new NovelAI({
  token: "your_access_token",
  host: "https://your-custom-host.com", // Direct URL string
});

const images2 = await client2.generateImage({
  prompt: "1girl, cute, anime style",
  model: Model.V4,
});

// Custom hosts work with all other client methods
const lineArtResult = await client2.lineArt("./input/image.png");
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
    model: Model.V4_5,
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
