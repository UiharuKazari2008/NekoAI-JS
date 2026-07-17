const { NovelAI, TextModel } = require("nekoai-js");
require("dotenv").config();

// Test function for text generation via the OpenAI-compatible endpoints
async function testTextGeneration() {
  const client = new NovelAI({
    token: process.env.NOVELAI_TOKEN,
  });

  console.log("Listing available text models...");
  const models = await client.listTextModels();
  console.log("Available models:", models);

  console.log("\nTesting chat completion...");
  const completion = await client.chat(
    "Write a one-sentence description of a cozy tavern.",
    {
      model: TextModel.GLM_4_6,
      max_tokens: 60,
      temperature: 1.0,
    },
  );
  console.log("Response:", completion.choices[0]?.message?.content);

  console.log("\nTesting streaming chat completion...");
  const stream = await client.chatStream(
    [
      { role: "system", content: "You are a concise storyteller." },
      { role: "user", content: "Continue: The dragon opened one eye and" },
    ],
    { max_tokens: 60 },
  );

  let streamed = "";
  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) {
      streamed += delta;
      process.stdout.write(delta);
    }
  }
  console.log("\n\nStreamed", streamed.length, "characters");

  return true;
}

// Run test if executed directly
if (require.main === module) {
  testTextGeneration()
    .then(() => console.log("\nText generation test completed"))
    .catch((err) => {
      console.error("Text generation test failed:", err.message);
      process.exit(1);
    });
}

module.exports = { testTextGeneration };
