const { NovelAI, Model, Resolution, Sampler, Noise } = require("nekoai-js");
require("dotenv").config();

// Test function for V4.5 model with multiple characters
async function testModelV45MultiChar() {
  const client = new NovelAI({
    token: process.env.NOVELAI_TOKEN,
    verbose: true,
  });

  console.log("Testing Model V4.5 with multiple characters...");

  try {
    const images = await client.generateImage(
      {
        prompt: "two people, classroom, school uniform, detailed background",
        model: "nai-diffusion-4-5-curated",
        resPreset: "normal_landscape",
        steps: 28,
        scale: 5.5,
        sampler: "k_euler_ancestral",
        noise_schedule: "karras",
        negative_prompt:
          "nsfw, lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit",
        // Character prompts for multiple characters
        characterPrompts: [
          {
            prompt: "girl, red hair, red school uniform, happy expression",
            uc: "bad hands, bad anatomy",
            center: { x: 0.3, y: 0.5 },
            enabled: true,
          },
          {
            prompt: "boy, blue hair, blue school uniform, serious expression",
            uc: "bad hands, bad anatomy",
            center: { x: 0.7, y: 0.5 },
            enabled: true,
          },
        ],
      },
      undefined,
      true,
    ); // Set verbose to true to see Anlas cost

    if (images.length > 0) {
      console.log(`Generated ${images.length} image(s)`);
      // Save the images to the output directory
      for (const [index, image] of images.entries()) {
        const path = await image.save(
          "./examples/output/model-v4-5-multichar-test.png",
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
  testModelV45MultiChar().catch(console.error);
}

module.exports = { testModelV45MultiChar };
