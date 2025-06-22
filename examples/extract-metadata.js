/**
 * Example demonstrating how to use the metadata extraction module
 * This example shows how to extract metadata from AI-generated images in both browser and Node.js environments
 */

// Browser example
async function browserExample() {
  const {
    extractImageMetadata,
    getImageSummary,
    MetadataType,
  } = require("nekoai-js");

  // From file input
  document.getElementById("fileInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];

    try {
      // Extract full metadata
      const metadata = await extractImageMetadata(file);
      console.log("Extracted metadata:", metadata);

      // Get a simplified summary
      const summary = await getImageSummary(file);
      console.log("Image summary:", summary);

      // Display the results based on metadata type
      if (metadata.type === MetadataType.STABLE_DIFFUSION_WEBUI) {
        displayWebUiMetadata(metadata);
      } else if (metadata.type === MetadataType.NOVELAI) {
        displayNovelAIMetadata(metadata);
      } else {
        console.log("No AI metadata found in this image");
      }
    } catch (error) {
      console.error("Error extracting metadata:", error);
    }
  });

  // Display SD WebUI metadata
  function displayWebUiMetadata(metadata) {
    const positivePrompt = metadata.entries.find(
      (e) => e.keyword === "Positive prompt",
    );
    const negative_prompt = metadata.entries.find(
      (e) => e.keyword === "Negative prompt",
    );
    const parameters = metadata.entries.find(
      (e) => e.keyword === "Generation parameters",
    );

    document.getElementById("positive").textContent =
      positivePrompt?.text || "";
    document.getElementById("negative").textContent =
      negative_prompt?.text || "";
    document.getElementById("parameters").textContent = parameters?.text || "";
  }

  // Display NovelAI metadata
  function displayNovelAIMetadata(metadata) {
    const prompt = metadata.entries.find((e) => e.keyword === "prompt");
    const uc = metadata.entries.find((e) => e.keyword === "uc");

    document.getElementById("positive").textContent = prompt?.text || "";
    document.getElementById("negative").textContent = uc?.text || "";

    // Display other NovelAI parameters
    const otherParams = metadata.entries
      .filter((e) => e.keyword !== "prompt" && e.keyword !== "uc")
      .map((e) => `${e.keyword}: ${e.text}`)
      .join("\n");

    document.getElementById("parameters").textContent = otherParams;
  }
}

// Node.js example
async function nodeExample() {
  const { extractImageMetadata, getImageSummary } = require("nekoai-js");
  const fs = require("fs");
  const path = require("path");

  // Process all images in a directory
  async function processImagesInDirectory(directoryPath) {
    const files = fs.readdirSync(directoryPath);

    for (const file of files) {
      // Skip non-image files
      if (!/\.(png|jpg|jpeg|webp|avif)$/i.test(file)) continue;

      const filePath = path.join(directoryPath, file);
      console.log(`Processing ${filePath}...`);

      try {
        // Extract metadata
        const metadata = await extractImageMetadata(filePath);
        console.log(`- Metadata type: ${metadata.type}`);
        console.log(`- Found ${metadata.entries.length} metadata entries`);

        // Get summary
        const summary = await getImageSummary(filePath);

        if (summary.positivePrompt) {
          console.log(
            `- Positive prompt: ${summary.positivePrompt.substring(0, 100)}...`,
          );
        }

        if (summary.negative_prompt) {
          console.log(
            `- Negative prompt: ${summary.negative_prompt.substring(0, 100)}...`,
          );
        }

        // Save metadata to JSON file
        const outputPath = path.join(
          directoryPath,
          `${path.basename(file, path.extname(file))}_metadata.json`,
        );
        fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2));

        console.log(`- Metadata saved to ${outputPath}`);
        console.log("-----------------------------------");
      } catch (error) {
        console.error(`Error processing ${filePath}:`, error);
      }
    }
  }

  // Process images in the specified directory
  const directoryPath = process.argv[2] || "./images";
  await processImagesInDirectory(directoryPath);
}

// Run the appropriate example based on environment
if (typeof window !== "undefined") {
  // Browser environment
  window.onload = browserExample;
} else {
  // Node.js environment
  nodeExample();
}
