/**
 * Image Generation Route
 * Handles image processing requests from the frontend
 */
import { Router, Request, Response } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { OpenAI, toFile } from "openai";
import { getPromptForFilter } from "../utils/prompts";
import { sendNotification } from "../services/notifications";
import {
  uploadFile,
  deleteFile,
  createReadStreamFromGCS,
} from "../utils/cloudStorage";

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`Created uploads directory at ${uploadsDir}`);
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

// Create file filter to accept only images
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

// Process image endpoint
router.post(
  "/",
  upload.single("image"),
  async (req: Request, res: Response) => {
    const { filter, fcmToken } = req.body;
    const imagePath = req.file?.path;
    let filesToCleanup: string[] = [];
    let gcsPath: string | null = null;

    // Validate uploaded file
    if (!imagePath || !fs.existsSync(imagePath)) {
      res.status(400).json({ error: "Image not uploaded or invalid format" });
      return;
    }

    // Add original file to cleanup list
    filesToCleanup.push(imagePath);

    try {
      console.log(`Processing image with filter: ${filter}`);
      const prompt = getPromptForFilter(filter);

      // Upload the file to GCS first for backup and better stream handling
      gcsPath = await uploadFile(imagePath);
      console.log(`Uploaded image to GCS: ${gcsPath}`);

      // Get a stream directly from GCS
      const imageStream = await createReadStreamFromGCS(gcsPath);

      // Convert the image to OpenAI compatible format
      console.log("Converting image to OpenAI format...");
      const imageFile = await toFile(imageStream, path.basename(imagePath), {
        type: "image/png",
      });

      // Call OpenAI API for image editing
      console.log("Calling OpenAI image edit API...");
      const response = await openai.images.edit({
        model: "gpt-image-1",
        image: imageFile,
        prompt: prompt,
      });

      // Clean up all temporary files
      filesToCleanup.forEach((file) => safeDeleteFile(file));

      // Clean up file in GCS if it was uploaded
      if (gcsPath) {
        try {
          await deleteFile(gcsPath);
        } catch (e) {
          console.error("Error deleting GCS file:", e);
        }
      }

      // Get result image URL
      let imageUrl;
      if (response.data?.[0]?.b64_json) {
        // If b64_json is available, create a data URL
        imageUrl = `data:image/png;base64,${response.data[0].b64_json}`;
      } else if (response.data?.[0]?.url) {
        // Fallback to URL if available
        imageUrl = response.data[0].url;
      } else {
        res.status(500).json({ error: "No image data returned from OpenAI" });
        return;
      }

      // Send FCM notification if token provided
      if (fcmToken) {
        console.log("Sending FCM notification to token:", fcmToken);
        try {
          await sendNotification(
            fcmToken,
            "Image Ready!",
            `Your ${filter} filtered image is ready to view.`,
            {
              notificationType: "image_ready",
              imageUrl,
              filterType: filter,
            }
          );
          console.log("FCM notification sent successfully");
        } catch (notificationError) {
          // Log but don't fail the request if notification fails
          console.error("Error sending notification:", notificationError);
        }
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
