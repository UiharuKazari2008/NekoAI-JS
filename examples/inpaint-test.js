const { NovelAI, Model, Action, Sampler, Noise } = require("nekoai-js");
const fs = require("fs");
require("dotenv").config();

// Test function for inpainting
async function testInpaint() {
  const client = new NovelAI({
    token: process.env.NOVELAI_TOKEN,
  });

  console.log("Testing inpainting...");

  // Paths to the input image and mask
  const imagePath = "./examples/input/image.png"; // Update this path to your input image
  const maskPath = "./examples/input/mask.png"; // Update this path to your mask image

  try {
    // Read the input image and convert to base64
    let base64Image, base64Mask;
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      base64Image = imageBuffer.toString("base64");

      const maskBuffer = fs.readFileSync(maskPath);
      base64Mask = maskBuffer.toString("base64");
    } catch (error) {
      console.error(`Error reading image or mask:`, error);
      console.log("Make sure the input directory and both files exist");
      return;
    }

    // Get image dimensions (this is a simplified version, in production use proper image libraries)
    const dimensions = getImageDimensions(imagePath);

    const images = await client.generateImage(
      {
        prompt:
          "masterpiece, highly detailed, beautiful cat, fur, detailed texture",
        model: Model.V3INP, // Use inpainting model
        action: Action.INPAINT,
        width: dimensions.width,
        height: dimensions.height,
        nSamples: 1,
        steps: 28,
        scale: 7.0,
        sampler: Sampler.EULER,
        dynamicThresholding: false,
        cfgRescale: 0,
        noiseSchedule: Noise.KARRAS,
        seed: Math.floor(Math.random() * 4294967288),
        extraNoiseSeed: Math.floor(Math.random() * 4294967288),
        ucPreset: 0,
        qualityToggle: true,

        // inpaint specific parameters
        image: base64Image,
        mask: base64Mask,
        addOriginalImage: true, // Overlay the original image

        negativePrompt:
          "nsfw, lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit",
      },
      undefined,
      true,
    ); // Set verbose to true to see Anlas cost

    if (images.length > 0) {
      console.log(`Generated ${images.length} image(s)`);
      // Save the images to the output directory
      for (const [index, image] of images.entries()) {
        const path = await image.save("./examples/output");
        console.log(`Saved image ${index + 1} to ${path}`);
      }
    } else {
      console.log("No images were generated");
    }
  } catch (error) {
    console.error("Error generating image:", error);
  }
}

// Helper function to get image dimensions (simplified for example purposes)
// In a real implementation, use proper image libraries
function getImageDimensions(imagePath) {
  // This is a placeholder - in real code, use sharp or another image library
  // to get actual dimensions
  return {
    width: 1024,
    height: 1024,
  };
}

// Run the test if this script is executed directly
if (require.main === module) {
  testInpaint().catch(console.error);
}

module.exports = { testInpaint };
