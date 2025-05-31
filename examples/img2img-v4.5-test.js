const { NovelAI, Model, Action, Sampler, Noise } = require("nekoai-js");
const fs = require("fs");
require("dotenv").config();

// Test function for img2img generation
async function testImg2Img45Full() {
  const client = new NovelAI({
    token: process.env.NOVELAI_TOKEN,
  });

  console.log("Testing img2img V4.5 generation...");

  // Path to the input image
  const imagePath = "./examples/input/image.png"; // Update this path to your input image

  try {
    // Read the input image and convert to base64
    let base64Image;
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      base64Image = imageBuffer.toString("base64");
    } catch (error) {
      console.error(`Error reading image from ${imagePath}:`, error);
      console.log("Make sure the input directory and image exist");
      return;
    }

    // Get image dimensions (this is a simplified version, in production use proper image libraries)
    const dimensions = getImageDimensions(imagePath);

    const images = await client.generateImage(
      {
        prompt:
          "masterpiece, highly detailed, fantasy landscape, mountains, magical",
        model: Model.V4_5,
        action: Action.IMG2IMG,
        width: dimensions.width,
        height: dimensions.height,
        nSamples: 1,
        steps: 28,
        scale: 5.5,
        sampler: Sampler.DPM2S_ANC,
        dynamicThresholding: false,
        cfgRescale: 0,
        noiseSchedule: Noise.KARRAS,
        seed: Math.floor(Math.random() * 4294967288),
        extraNoiseSeed: Math.floor(Math.random() * 4294967288),
        ucPreset: 0,
        qualityToggle: true,

        // img2img specific parameters
        image: base64Image,
        strength: 0.7, // How much to change the image (0.01-0.99)
        noise: 0.2, // How much noise to add

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
  testImg2Img45Full().catch(console.error);
}

module.exports = { testImg2Img: testImg2Img45Full };
