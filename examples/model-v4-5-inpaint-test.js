const {
  NovelAI,
  Model,
  Resolution,
  Sampler,
  Action,
  parseImage,
} = require("nekoai-js");
const Stream = require("stream");
require("dotenv").config();

// Test function for V4 model generation
async function testModelV45FullInpaint() {
  const client = new NovelAI({
    token: process.env.NOVELAI_TOKEN,
    verbose: false,
  });

  console.log("Testing Model V4.5 inpainting generation...");

  try {
    const image = await parseImage("./examples/input/_image.png");
    const mask = await parseImage("./examples/input/_mask.png");

    const images = await client.generateImage(
      {
        prompt: "1girl, cute",
        negative_prompt: "1234",
        model: Model.V4_5_INP,
        action: Action.INPAINT,
        resPreset: Resolution.NORMAL_PORTRAIT,
        seed: 3417044607,
        steps: 28,
        scale: 5,
        sampler: Sampler.EULER_ANC,
        image: image.base64,
        mask: mask.base64,
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
          "./examples/output/model-v4-5-full-inpaint-test.png",
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
  testModelV45FullInpaint().catch(console.error);
}

module.exports = { testModelV45Full: testModelV45FullInpaint };
