// src/routes/generate.ts
import { Router, Request, Response } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { OpenAI, toFile } from "openai";
import { getPromptForFilter } from "../utils/prompts";
import { sendNotification } from "../utils/firebase";
import dotenv from "dotenv";
import { createReadStreamFromGCS, deleteFile } from "../utils/cloudStorage";
import { uploadFile } from "../utils/cloudStorage";

dotenv.config({ path: ".env.production" });

// Ensure uploads directory exists
const uploadsDir = "uploads";
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Ensure filename has proper extension
    const ext = path.extname(file.originalname) || ".png";
    cb(null, `${Date.now()}${ext}`);
  },
});

// Create file filter to accept images
const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Accept image files
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    console.log(`Rejected file with MIME type: ${file.mimetype}`);
    cb(null, false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max size
});

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper function to safely delete a file
const safeDeleteFile = (filePath: string): void => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Successfully deleted: ${filePath}`);
    }
  } catch (err) {
    console.error(`Error deleting file ${filePath}:`, err);
  }
};

// Helper function to log file details
const logFileDetails = (file: Express.Multer.File | undefined) => {
  if (!file) {
    console.log("No file uploaded");
    return;
  }

  console.log("File upload details:");
  console.log(`Filename: ${file.filename}`);
  console.log(`Original name: ${file.originalname}`);
  console.log(`Size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
  console.log(`MIME type: ${file.mimetype}`);
  console.log(`Path: ${file.path}`);
};

router.post(
  "/",
  upload.single("image"),
  async (req: Request, res: Response) => {
    const { filter, fcmToken } = req.body;
    const imagePath = req.file?.path;
    let filesToCleanup: string[] = [];
    let gcsPath: string | null = null;

    // Log uploaded file details
    logFileDetails(req.file);

    if (!imagePath || !fs.existsSync(imagePath)) {
      res.status(400).json({ error: "Image not uploaded or invalid format" });
      return;
    }

    // Add original file to cleanup list
    filesToCleanup.push(imagePath);

    try {
      console.log(`Processing image with filter: ${filter}`);
      const prompt = getPromptForFilter(filter);
      console.log(`Using prompt: ${prompt}`);

      // Upload the file to GCS first
      gcsPath = await uploadFile(imagePath);
      console.log(`Uploaded image to GCS: ${gcsPath}`);

      // Get a stream directly from GCS
      const imageStream = await createReadStreamFromGCS(gcsPath);

      // Convert the image to OpenAI compatible format with explicit MIME type
      console.log("Converting image to OpenAI format...");
      const imageFile = await toFile(imageStream, path.basename(imagePath), {
        type: "image/png",
      });

      // Call OpenAI API for image editing using gpt-image-1
      console.log("Calling OpenAI image edit API with gpt-image-1...");
      const response = await openai.images.edit({
        model: "gpt-image-1",
        image: imageFile,
        prompt: prompt,
      });

      // Clean up uploaded file locally
      filesToCleanup.forEach((file) => safeDeleteFile(file));

      // Clean up file in GCS if it was uploaded
      if (gcsPath) {
        await deleteFile(gcsPath);
      }

      // Get result
      let imageUrl;
      if (response.data?.[0]?.b64_json) {
        // If b64_json is available, create a data URL
        const b64Data = response.data[0].b64_json;
        imageUrl = `data:image/png;base64,${b64Data}`;
      } else if (response.data?.[0]?.url) {
        // Fallback to URL if available
        imageUrl = response.data[0].url;
      } else {
        res.status(500).json({ error: "No image data returned from OpenAI" });
        return;
      }

      // Return the result
      res.json({ imageUrl });
    } catch (error: any) {
      console.error("Error processing image:", error);

      // Enhanced error logging
      console.error("Error details:", JSON.stringify(error, null, 2));

      // Clean up all temp files even if there was an error
      filesToCleanup.forEach((file) => safeDeleteFile(file));

      // Clean up file in GCS if it was uploaded
      if (gcsPath) {
        try {
          await deleteFile(gcsPath);
        } catch (e) {
          console.error("Error deleting GCS file:", e);
        }
      }

      res.status(500).json({
        error: "Image processing failed",
        message: error.message || "Unknown error",
      });
    }
  }
);

export default router;
