const { NovelAI, Model, Resolution, Sampler, Noise } = require("nekoai-js");
require("dotenv").config();

// Test function for V4 model generation
async function testModelV4() {
  const client = new NovelAI({
    token: process.env.NOVELAI_TOKEN,
  });

  console.log("Testing Model V4 generation...");

  try {
    const images = await client.generateImage(
      {
        prompt: "1girl, blue hair, cute, anime style",
        model: Model.V4,
        resPreset: Resolution.NORMAL_PORTRAIT,
        nSamples: 1,
        steps: 28,
        scale: 5.5,
        sampler: Sampler.EULER_ANC,
        noiseSchedule: Noise.KARRAS,
        ucPreset: 1,
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
        const path = await image.save(
          "./examples/output/model-v4-cur-test.png",
        );
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
  testModelV4().catch(console.error);
}

module.exports = { testModelV4 };
