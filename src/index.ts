// src/index.ts
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import generateRoute from "./routes/generate";
import fs from "fs";
import path from "path";
import { verifyToken } from "./middleware/authMiddleware";

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
<<<<<<< HEAD
  origin: "*", // Allow all origins
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 200,
=======
  origin: ["http://localhost:8081", "http://localhost:3000", "*"], // Allow localhost and other origins
  methods: ["GET", "POST", "OPTIONS"], // Allow GET and POST methods
  allowedHeaders: ["Content-Type", "Authorization"], // Allow these headers
  credentials: true,
  optionsSuccessStatus: 204, // For legacy browser support
>>>>>>> dbb9c8e974071ad39dde4ec537e880747f2e879d
};

// Apply CORS middleware first
app.use(cors(corsOptions));

// Increase the payload size limits
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Routes
app.use("/generate", verifyToken, generateRoute);

app.post("/register-device", express.json(), async (req, res) => {
  try {
    const { deviceToken, platform } = req.body;

    // Here you would store the token in your database
    console.log(
      `Registering device token: ${deviceToken} for platform: ${platform}`
    );

    // For now, just return success
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error registering device:", error);
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