import { Storage } from '@google-cloud/storage';
import { Readable } from 'stream';
import path from 'path';

const storage = new Storage();
const bucketName = 'gs://pixmix-6a12e.firebasestorage.app'; // Replace with your bucket name

// Ensure bucket exists
async function ensureBucketExists() {
  try {
    const [exists] = await storage.bucket(bucketName).exists();
    if (!exists) {
      await storage.createBucket(bucketName);
      console.log(`Bucket ${bucketName} created.`);
    }
  } catch (error) {
    console.error('Error ensuring bucket exists:', error);
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
      cacheControl: 'no-cache',
    },
  });
  
  // Return the GCS path
  return `gs://${bucketName}/${destination}`;
}

// Download file from Cloud Storage
export async function downloadFile(gcsPath: string, localPath: string): Promise<string> {
  // Extract bucket and filename from GCS path
  const matches = gcsPath.match(/gs:\/\/([^\/]+)\/(.+)/);
  if (!matches) throw new Error(`Invalid GCS path: ${gcsPath}`);
  
  const [, bucketName, filePath] = matches;
  
  await storage.bucket(bucketName).file(filePath).download({
    destination: localPath,
  });
  
  return localPath;
}

// Delete file from Cloud Storage
export async function deleteFile(gcsPath: string): Promise<void> {
  // Extract bucket and filename from GCS path
  const matches = gcsPath.match(/gs:\/\/([^\/]+)\/(.+)/);
  if (!matches) throw new Error(`Invalid GCS path: ${gcsPath}`);
  
  const [, bucketName, filePath] = matches;
  
  await storage.bucket(bucketName).file(filePath).delete();
}

// Create a readable stream from a Cloud Storage file
export async function createReadStreamFromGCS(gcsPath: string): Promise<Readable> {
  // Extract bucket and filename from GCS path
  const matches = gcsPath.match(/gs:\/\/([^\/]+)\/(.+)/);
  if (!matches) throw new Error(`Invalid GCS path: ${gcsPath}`);
  
  const [, bucketName, filePath] = matches;
  
  return storage.bucket(bucketName).file(filePath).createReadStream();
}