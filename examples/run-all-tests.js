const { testModelV3 } = require("./model-v3-test");
const { testModelV4 } = require("./model-v4-test");
const { testModelV45MultiChar } = require("./model-v4-5-multichar-test");
const { testImg2Img } = require("./img2img-test");
const { testInpaint } = require("./inpaint-test");
const { testDirectorTools } = require("./director-tools-test");
const { testCustomHost } = require("./custom-host-test");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, "output");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Create input directory if it doesn't exist
const inputDir = path.join(__dirname, "input");
if (!fs.existsSync(inputDir)) {
  fs.mkdirSync(inputDir, { recursive: true });
  console.log(`
⚠️ Created input directory at ${inputDir}
Please add test images before running tests that require input files:
- image.png: A test image for img2img, inpainting, and director tools
- mask.png: A mask image for inpainting (white areas will be inpainted)
`);
}

console.log("NovelAI-JS Test Runner");
console.log("======================");
console.log("");

// Check if NovelAI token is set
if (!process.env.NOVELAI_TOKEN) {
  console.error("❌ Error: NOVELAI_TOKEN environment variable is not set.");
  console.log(
    "Please create a .env file in the root directory with the following content:",
  );
  console.log("NOVELAI_TOKEN=your_novelai_token_here");
  process.exit(1);
}

// List of all tests with descriptions
const tests = [
  {
    name: "Model V3",
    fn: testModelV3,
    description: "Tests V3 model generation",
  },
  {
    name: "Model V4",
    fn: testModelV4,
    description: "Tests V4 model generation",
  },
  {
    name: "Model V4.5 Multi-Character",
    fn: testModelV45MultiChar,
    description: "Tests V4.5 model with multiple characters",
  },
  {
    name: "IMG2IMG",
    fn: testImg2Img,
    description:
      "Tests img2img generation (requires image.png in input directory)",
  },
  {
    name: "Inpainting",
    fn: testInpaint,
    description:
      "Tests inpainting (requires image.png and mask.png in input directory)",
  },
  {
    name: "Director Tools",
    fn: testDirectorTools,
    description:
      "Tests all director tools (requires image.png in input directory)",
  },
  {
    name: "Custom Host",
    fn: testCustomHost,
    description:
      "Tests custom host functionality (requires image.png in input directory)",
  },
];

// Handle command line arguments
const args = process.argv.slice(2);
let testsToRun = [];

if (args.length === 0) {
  // If no arguments, show help
  console.log("Usage: node run-all-tests.js [option]");
  console.log("");
  console.log("Options:");
  console.log("  all    - Run all tests sequentially");
  console.log("  list   - List all available tests");
  console.log("  1-7    - Run specific test by number");
  console.log("");
  console.log("Examples:");
  console.log("  node run-all-tests.js all");
  console.log("  node run-all-tests.js list");
  console.log("  node run-all-tests.js 1");
  process.exit(0);
} else if (args[0] === "list") {
  // List all tests
  console.log("Available tests:");
  tests.forEach((test, i) => {
    console.log(`  ${i + 1}. ${test.name} - ${test.description}`);
  });
  process.exit(0);
} else if (args[0] === "all") {
  // Run all tests
  testsToRun = tests.map((_, i) => i);
} else {
  // Run specific test by number
  const testIndex = parseInt(args[0]) - 1;
  if (isNaN(testIndex) || testIndex < 0 || testIndex >= tests.length) {
    console.error(
      `❌ Error: Invalid test number. Run 'node run-all-tests.js list' to see available tests.`,
    );
    process.exit(1);
  }
  testsToRun = [testIndex];
}

// Run tests
async function runTests() {
  for (const testIndex of testsToRun) {
    const test = tests[testIndex];
    console.log(`\nRunning test ${testIndex + 1}: ${test.name}`);
    console.log("----------------------------------------");

    try {
      await test.fn();
      console.log(`\n✅ Test ${testIndex + 1} completed successfully.`);
    } catch (error) {
      console.error(`\n❌ Test ${testIndex + 1} failed:`, error);
    }
  }

  console.log("\nAll tests completed.");
}

runTests().catch(console.error);
