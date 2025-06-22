const { NovelAI, Model, Resolution, Sampler, Noise } = require("nekoai-js");
require("dotenv").config(); // Load environment variables from .env file

// Test function for V3 model generation
async function testModelV3() {
  const client = new NovelAI({
    token: process.env.NOVELAI_TOKEN,
    verbose: true,
  });

  console.log("Testing Model V3 generation...");

  try {
    const images = await client.generateImage(
      {
        prompt: "1girl, blue hair, cute, anime style",
        model: Model.V3,
        resPreset: Resolution.NORMAL_PORTRAIT,
        n_samples: 1,
        steps: 28,
        scale: 6.3,
        sampler: Sampler.DPM2S_ANC,
        sm: true,
        sm_dyn: true,
        negative_prompt:
          "nsfw, lowres, {bad}, error, fewer, extra, missing, worst quality, jpeg artifacts, bad quality",
      },
      undefined,
      true,
    ); // Set verbose to true to see Anlas cost

    if (images.length > 0) {
      console.log(`Generated ${images.length} image(s)`);
      // Save the images to the output directory
      for (const [index, image] of images.entries()) {
        const path = await image.save("./examples/output/model-v3-test.png");
        console.log(`Saved image ${index + 1} to ${path}`);
      }
    } else {
      console.log("No images were generated");
    }
  } catch (error) {
    console.error("Error generating image:", error);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testModelV3().catch(console.error);
}

module.exports = { testModelV3 };
