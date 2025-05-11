const {
  NovelAI,
  Model,
  Resolution,
  Sampler,
  createCustomHost,
} = require("nekoai-js");
require("dotenv").config();

// Test function for custom host
async function testCustomHost() {
  const client = new NovelAI({
    token: process.env.NOVELAI_TOKEN,
  });

  console.log("Testing custom host...");

  // Create a custom host (this example uses the official API endpoint, but you can use any compatible server)
  const customHost = createCustomHost(
    "https://api.novelai.net", // URL - replace with your custom host
    "application/x-zip-compressed", // Accept header
    "custom-api", // Name for the host (used in filenames)
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

    // Also test a director tool with custom host
    console.log("Testing director tool with custom host...");

    try {
      // Use the web endpoint for director tools (proper custom host would use your own endpoint)
      const directorHost = createCustomHost(
        "https://image.novelai.net",
        "binary/octet-stream",
        "custom-director",
      );

      // Try a director tool with the custom host
      // Note: You'll need an existing image file at this path
      const lineArtResult = await client.lineArt(
        "./examples/input/image.png",
        directorHost,
      );
      const savePath = await lineArtResult.save("./examples/output");
      console.log(`Line art saved to ${savePath}`);
    } catch (error) {
      console.error("Error with director tool using custom host:", error);
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
