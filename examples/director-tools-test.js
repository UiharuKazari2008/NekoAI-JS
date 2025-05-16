const { NovelAI, EmotionOptions, EmotionLevel } = require("nekoai-js");
const fs = require("fs");
require("dotenv").config();

// Test function for director tools
async function testDirectorTools() {
  const client = new NovelAI({
    token: process.env.NOVELAI_TOKEN,
    retry: {
      enabled: true, // Enable retries
      maxRetries: 10, // Maximum 5 retry attempts
      baseDelay: 2000, // Start with 2 second delay
      maxDelay: 60000, // Maximum delay of 1 minute
      retryStatusCodes: [429], // Only retry on rate limit errors
    },
  });

  // Image input (path, Blob, File, URL, etc.)
  const imageInput = "./examples/input/image.png"; // Update this path to your input image

  try {
    if (!fs.existsSync(imageInput)) {
      console.error(`Input image not found at ${imageInput}`);
      console.log("Make sure the input directory and image exist");
      return;
    }

    console.log("Testing Line Art generation...");
    try {
      const lineArtResult = await client.lineArt(imageInput);
      const savePath = await lineArtResult.save(
        "./examples/output/line-art-test.png",
      );
      console.log(`Line art saved to ${savePath}`);
    } catch (error) {
      console.error("Error generating line art:", error);
    }

    console.log("Testing Sketch generation...");
    try {
      const sketchResult = await client.sketch(imageInput);
      const savePath = await sketchResult.save(
        "./examples/output/sketch-test.png",
      );
      console.log(`Sketch saved to ${savePath}`);
    } catch (error) {
      console.error("Error generating sketch:", error);
    }

    console.log("Testing Background Removal...");
    try {
      const bgRemovalResult = await client.backgroundRemoval(imageInput);
      const savePath = await bgRemovalResult.save(
        "./examples/output/bg-removal-test.png",
      );
      console.log(`Background removal result saved to ${savePath}`);
    } catch (error) {
      console.error("Error removing background:", error);
    }

    console.log("Testing Declutter...");
    try {
      const declutterResult = await client.declutter(imageInput);
      const savePath = await declutterResult.save(
        "./examples/output/declutter-test.png",
      );
      console.log(`Declutter result saved to ${savePath}`);
    } catch (error) {
      console.error("Error decluttering image:", error);
    }

    console.log("Testing Colorize...");
    try {
      const colorizeResult = await client.colorize(
        imageInput,
        undefined,
        "dream, mirror",
        1,
      );
      const savePath = await colorizeResult.save(
        "./examples/output/colorize-test.png",
      );
      console.log(`Colorize result saved to ${savePath}`);
    } catch (error) {
      console.error("Error colorizing image:", error);
    }

    console.log("Testing Emotion Change...");
    try {
      const emotionResult = await client.changeEmotion(
        imageInput,
        undefined,
        "happy",
        "",
        0,
      );
      const savePath = await emotionResult.save(
        "./examples/output/emotion-test.png",
      );
      console.log(`Emotion change result saved to ${savePath}`);
    } catch (error) {
      console.error("Error changing emotion:", error);
    }
  } catch (error) {
    console.error("Main error:", error);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testDirectorTools().catch(console.error);
}

module.exports = { testDirectorTools };
