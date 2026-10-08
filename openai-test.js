require("dotenv").config({ path: ".env.local" });

const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 30000,
  maxRetries: 3,
});

console.log(
  "API key loaded:",
  process.env.OPENAI_API_KEY ? "YES" : "NO"
);

client.responses
  .create({
    model: "gpt-6-luna",
    input: "Reply with exactly: CONNECTION TEST PASSED",
  })
  .then((response) => {
    console.log("SUCCESS:");
    console.log(response.output_text);
  })
  .catch((error) => {
    console.log("FAILED");
    console.log("ERROR:", error.name);
    console.log("MESSAGE:", error.message);
    console.log("STATUS:", error.status);
    console.log("CAUSE:", error.cause);
  });
