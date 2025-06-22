const { NovelAI, Model, Resolution, Sampler } = require("nekoai-js");

// Test function for custom host
async function testCustomHost() {
  const client = new NovelAI({
    token: process.env.NOVELAI_TOKEN,
    host: "https://image.novelai.net", // Official API endpoint
    // host: "https://your-custom-host.com", // Uncomment to use a custom host
    verbose: true,
  });

  try {
    const images = await client.generateImage(
      {
        prompt: "1girl, blue hair, cute, anime style",
        model: Model.V3,
        resPreset: Resolution.NORMAL_PORTRAIT,
        n_samples: 1,
        steps: 28,
        scale: 6.0,
        sampler: Sampler.EULER,
        seed: Math.floor(Math.random() * 4294967288),
        ucPreset: 0,
        qualityToggle: true,
        negative_prompt:
          "nsfw, lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit",
      },
      false,
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
