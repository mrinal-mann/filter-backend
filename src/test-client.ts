/**
 * Simplified test client for OpenAI image models
 * Uses minimal parameters to avoid errors
 * Run with: npx ts-node src/simplified-model-test.ts
 */

import { OpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config();

// Create OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Test DALL-E 2 with minimal parameters
async function testDalle2() {
  try {
    console.log("Testing DALL-E 2 with minimal parameters...");
    
    const prompt = "A simple portrait in a professional art style";
    console.log("Using prompt:", prompt);
    
    // Use only the essential parameters
    const response = await openai.images.generate({
      prompt: prompt,
      n: 1,
      size: "1024x1024"
    });

    console.log("Success! Image URL:", response.data?.[0]?.url);
    return true;
  } catch (error: any) {
    console.error("Error testing DALL-E 2:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
    return false;
  }
}

// Run the simplified test
console.log("Starting simplified OpenAI image generation test...");
console.log("API Key (first few chars):", process.env.OPENAI_API_KEY?.substring(0, 5) + "...");

testDalle2().then(success => {
  if (success) {
    console.log("Test completed successfully!");
  } else {
    console.log("Test failed. Please check your API key and permissions.");
  }
});