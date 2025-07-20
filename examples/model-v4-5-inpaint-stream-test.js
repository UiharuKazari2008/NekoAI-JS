const {
  NovelAI,
  Model,
  Resolution,
  Sampler,
  Action,
  parseImage,
} = require("nekoai-js");
const fs = require("fs");
require("dotenv").config();

// Test function for V4 model generation
async function testModelV45FullInpaintStream() {
  const client = new NovelAI({
    token: process.env.NOVELAI_TOKEN,
    verbose: false,
  });

  console.log("Testing Model V4.5 inpainting generation...");

  try {
    const image = await parseImage("./examples/input/_image.png");
    const mask = await parseImage("./examples/input/_mask.png");

    const response = await client.generateImage(
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
      true, // Set to true for streaming
      true,
    ); // Set verbose to true to see Anlas cost

    // Ensure output directory exists
    fs.mkdirSync("./examples/output", { recursive: true });

    // Check if response is an AsyncGenerator (streaming) or Image array
    if (response && typeof response[Symbol.asyncIterator] === "function") {
      // Handle streaming response (AsyncGenerator)
      console.log("Handling streaming response...");
      for await (const event of response) {
        if (event.event_type === EventType.INTERMEDIATE) {
          console.log(
            `Intermediate event at step ${event.step_ix} for sample ${event.samp_ix}`,
          );
          //
          await event.image.save(
            `./examples/output/image_${event.samp_ix}_step_${event.step_ix.toString().padStart(2, "0")}.jpg`,
          );
        } else if (event.event_type === EventType.FINAL) {
          await event.image.save(
            `./examples/output/image_${event.samp_ix}_result.png`,
          );
        }
      }
    } else if (Array.isArray(response)) {
      // Handle array of images (non-streaming)
      console.log("Handling non-streaming response...");
      for (let i = 0; i < response.length; i++) {
        await response[i].save(`./examples/output/image_${i}_result.png`);
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
  testModelV45FullInpaintStream().catch(console.error);
}

module.exports = { testModelV45Full: testModelV45FullInpaintStream };
