// src/index.ts
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import generateRoute from "./routes/generate";
import fs from "fs";
import path from "path";
import { verifyToken } from "./middleware/authMiddleware";
import { firestore } from "./config/firebase";
import admin from "firebase-admin";
// Load environment variables from .env.production
dotenv.config({ path: ".env.production" });

const app = express();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`Created uploads directory at ${uploadsDir}`);
}

// Configure CORS properly
const corsOptions = {
  origin: "*", // Allow all origins
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 200,
};

// Apply CORS middleware first
app.use(cors(corsOptions));

// Increase the payload size limits
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Routes
app.use("/generate", verifyToken, generateRoute);

app.post("/register-device", verifyToken, async (req, res) => {
  try {
    const { deviceToken, platform } = req.body;
    const userId = req.user?.uid;

    await firestore.collection("devices").doc(deviceToken).set({
      token: deviceToken,
      platform,
      userId,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Device registration error:", error);
    res.status(500).json({ error: "Failed to register device" });
  }
});

// Simple health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Use PORT from environment variable, default to 8080 for Cloud Run
const PORT = process.env.PORT || 8080;
app.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}`)
);
