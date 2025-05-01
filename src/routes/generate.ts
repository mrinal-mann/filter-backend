// src/routes/generate.ts
import { Router, Request, Response } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { OpenAI, toFile } from "openai";
import { getPromptForFilter } from "../utils/prompts";
// import { sendNotification } from "../utils/firebase";
import dotenv from "dotenv";

dotenv.config();

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

      // Convert the image to OpenAI compatible format with explicit MIME type
      console.log("Converting image to OpenAI format...");
      const imageFile = await toFile(
        fs.createReadStream(imagePath),
        path.basename(imagePath),
        {
          type: "image/png",
        }
      );

      // Call OpenAI API for image editing using gpt-image-1
      console.log("Calling OpenAI image edit API with gpt-image-1...");
      const response = await openai.images.edit({
        model: "gpt-image-1",
        image: imageFile,
        prompt: prompt,
      });

      // Clean up uploaded file
      filesToCleanup.forEach((file) => safeDeleteFile(file));

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

      // If we have an FCM token, send notification
      // if (fcmToken) {
      //   console.log(
      //     `Sending FCM notification to token: ${fcmToken.substring(0, 10)}...`
      //   );

      //   // Send FCM notification
      //   await sendNotification(
      //     fcmToken,
      //     `${filter} Filter Complete! 🎉`,
      //     "Your image has been processed successfully. Tap to view it now.",
      //     {
      //       notificationType: "image_ready",
      //       imageUrl,
      //       filter,
      //     }
      //   );
      // }

      // Return the result
      res.json({ imageUrl });
    } catch (error: any) {
      console.error("Error processing image:", error);

      // Enhanced error logging
      console.error("Error details:", JSON.stringify(error, null, 2));

      // Clean up all temp files even if there was an error
      filesToCleanup.forEach((file) => safeDeleteFile(file));

      res.status(500).json({
        error: "Image processing failed",
        message: error.message || "Unknown error",
      });
    }
  }
);

export default router;
