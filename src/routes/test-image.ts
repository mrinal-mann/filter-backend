import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { OpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config();

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Create a simple test endpoint that uses a fixed PNG image
router.get("/", async (req: Request, res: Response) => {
  try {
    // Create a simple 1x1 black PNG image
    const testDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Create test PNG
    const testImagePath = path.join(testDir, "test_image.png");
    
    // Simple 1x1 pixel PNG file (base64 encoded)
    const base64Data = 
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    
    fs.writeFileSync(testImagePath, Buffer.from(base64Data, 'base64'));
    console.log(`Test image created at ${testImagePath}`);

    // Call OpenAI API using their recommended approach
    const response = await openai.images.edit({
      image: fs.createReadStream(testImagePath),
      prompt: "A cute baby panda wearing a hat",
      n: 1,
      size: "1024x1024",
    });

    // Clean up the test image
    fs.unlinkSync(testImagePath);

    // Return the result
    const imageUrl = response.data?.[0]?.url;
    if (!imageUrl) {
      res.status(500).json({ error: "No image URL returned from OpenAI" });
      return;
    }

    res.json({ imageUrl });
  } catch (error: any) {
    console.error("OpenAI error details:", error);
    res.status(500).json({
      error: "Image generation failed",
      message: error.message || "Unknown error",
    });
  }
});

export default router;