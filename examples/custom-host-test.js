const {
  NovelAI,
  Model,
  Resolution,
  Sampler,
  createCustomHost,
} = require("nekoai-js");

// Test function for custom host
async function testCustomHost() {
  const client = new NovelAI({
    token: process.env.CUSTOM_TOKEN,
  });

  console.log("Testing custom host...");

  // Create a custom host (this example uses the official API endpoint, but you can use any compatible server)
  const customHost = createCustomHost(
    "https://image.novelai.net", // Custom host URL
  );

  try {
    const images = await client.generateImage(
      {
        prompt: "1girl, blue hair, cute, anime style",
        model: Model.V3,
        resPreset: Resolution.NORMAL_PORTRAIT,
        nSamples: 1,
        steps: 28,
        scale: 6.0,
        sampler: Sampler.EULER,
        seed: Math.floor(Math.random() * 4294967288),
        ucPreset: 0,
        qualityToggle: true,
        negativePrompt:
          "nsfw, lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit",
      },
      customHost,
      true,
    ); // Use our custom host

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
    console.error("Error generating image with custom host:", error);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testCustomHost().catch(console.error);
}

module.exports = { testCustomHost };
