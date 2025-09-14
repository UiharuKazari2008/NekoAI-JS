const {
  NovelAI,
  Model,
  Resolution,
  Sampler,
  parseImage,
} = require("nekoai-js");
const Stream = require("stream");
require("dotenv").config();

// Test function for V4 model generation
async function testModelV45Full() {
  const client = new NovelAI({
    token: process.env.NOVELAI_TOKEN,
    verbose: true,
  });

  console.log("Testing Model V4.5 Vibe Transfer generation...");

  try {
    const vibe_reference = await parseImage(
      "./examples/input/vibe_reference.png",
    );

    const images = await client.generateImage(
      {
        prompt: "1girl, cute",
        negative_prompt: "1234",
        model: Model.V4_5,
        resPreset: Resolution.NORMAL_PORTRAIT,
        seed: 3417044607,
        steps: 30,
        scale: 5,
        sampler: Sampler.EULER_ANC,
        reference_image_multiple: [vibe_reference.base64], // the reference image will be re-encoded as vibe token
        reference_information_extracted_multiple: [0.7],
        ucPreset: 3,
      },
      false,
      true,
    ); // Set verbose to true to see Anlas cost

    if (images.length > 0) {
      console.log(`Generated ${images.length} image(s)`);
      // Save the images to the output directory
      for (const [index, image] of images.entries()) {
        const path = await image.save(
          "./examples/output/model-v4-5-full-vibe.png",
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
  testModelV45Full().catch(console.error);
}

module.exports = { testModelV45Full };
