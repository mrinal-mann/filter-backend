import { Storage } from "@google-cloud/storage";
import { Readable } from "stream";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.production" });

// Initialize Storage with credentials from environment variables
let storage: Storage;

try {
  // Check if we have Firebase credentials in environment variables
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    // Use Firebase credentials for GCS
    storage = new Storage({
      projectId,
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    });
    console.log("Initialized Google Cloud Storage with Firebase credentials");
  } else {
    // Fallback to default credentials
    storage = new Storage();
    console.log("Initialized Google Cloud Storage with default credentials");
  }
} catch (error) {
  console.error("Error initializing Google Cloud Storage:", error);
  // Fallback to default credentials
  storage = new Storage();
}

// Use the correct bucket name
const bucketName =
  process.env.GCS_BUCKET_NAME || "pixmix-6a12e.firebasestorage.app";
console.log(`Using Cloud Storage bucket: ${bucketName}`);

// Ensure bucket exists
async function ensureBucketExists() {
  try {
    const [exists] = await storage.bucket(bucketName).exists();
    if (!exists) {
      await storage.createBucket(bucketName);
      console.log(`Bucket ${bucketName} created.`);
    }
  } catch (error) {
    console.error("Error ensuring bucket exists:", error);
  }
}

// Initialize bucket
ensureBucketExists();

// Upload file to Cloud Storage
export async function uploadFile(localFilePath: string): Promise<string> {
  const filename = path.basename(localFilePath);
  const destination = `uploads/${Date.now()}-${filename}`;

  await storage.bucket(bucketName).upload(localFilePath, {
    destination,
    metadata: {
      cacheControl: "no-cache",
    },
  });

  // Return the GCS path correctly
  return `gs://${bucketName}/${destination}`;
}

// Download file from Cloud Storage
export async function downloadFile(
  gcsPath: string,
  localPath: string
): Promise<string> {
  // Extract bucket and filename from GCS path
  const matches = gcsPath.match(/gs:\/\/([^\/]+)\/(.+)/);
  if (!matches) throw new Error(`Invalid GCS path: ${gcsPath}`);

  const [, gsBucketName, filePath] = matches;

  await storage.bucket(gsBucketName).file(filePath).download({
    destination: localPath,
  });

  return localPath;
}

// Delete file from Cloud Storage
export async function deleteFile(gcsPath: string): Promise<void> {
  // Extract bucket and filename from GCS path
  const matches = gcsPath.match(/gs:\/\/([^\/]+)\/(.+)/);
  if (!matches) throw new Error(`Invalid GCS path: ${gcsPath}`);

  const [, gsBucketName, filePath] = matches;

  await storage.bucket(gsBucketName).file(filePath).delete();
}

// Create a readable stream from a Cloud Storage file
export async function createReadStreamFromGCS(
  gcsPath: string
): Promise<Readable> {
  // Extract bucket and filename from GCS path
  const matches = gcsPath.match(/gs:\/\/([^\/]+)\/(.+)/);
  if (!matches) throw new Error(`Invalid GCS path: ${gcsPath}`);

  const [, gsBucketName, filePath] = matches;

  return storage.bucket(gsBucketName).file(filePath).createReadStream();
}
