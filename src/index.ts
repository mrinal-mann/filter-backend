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
// Add explicit CORS headers before other middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  next();
});

// Configure CORS to allow requests from any origin during development
const corsOptions = {
  origin: "*", // Allow all origins
  methods: ["GET", "POST", "OPTIONS"], // Allow GET and POST methods
  allowedHeaders: ["Content-Type", "Authorization"], // Allow these headers
  optionsSuccessStatus: 200, // For legacy browser support
};

// Increase the payload size limits
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Apply CORS middleware with options
app.use(cors(corsOptions));

// Routes - using the simplified route
app.use("/generate", verifyToken, generateRoute);

// Simple health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Use PORT from environment variable or fallback to 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}`)
);
