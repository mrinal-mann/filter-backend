import fs from 'fs';
import path from 'path';

/**
 * Debug utility for image uploads
 * Logs details about the uploaded file
 */
export const debugImageUpload = (req: any) => {
  if (!req.file) {
    console.log('DEBUG: No file uploaded');
    return;
  }

  // Log file details
  console.log('DEBUG: File upload details');
  console.log('------------------------');
  console.log(`Filename: ${req.file.filename}`);
  console.log(`Original name: ${req.file.originalname}`);
  console.log(`Size: ${(req.file.size / (1024 * 1024)).toFixed(2)}MB`);
  console.log(`MIME type: ${req.file.mimetype}`);
  console.log(`Path: ${req.file.path}`);
  console.log('------------------------');

  // Check if file exists and is readable
  try {
    const stats = fs.statSync(req.file.path);
    console.log(`File exists: ${fs.existsSync(req.file.path)}`);
    console.log(`File size from fs: ${(stats.size / (1024 * 1024)).toFixed(2)}MB`);
    console.log(`Is readable: ${fs.accessSync(req.file.path, fs.constants.R_OK) === undefined}`);
  } catch (error) {
    console.error('DEBUG: Error checking file:', error);
  }
};

/**
 * Creates a debug image to test the OpenAI API
 * Returns the path to a small test PNG image
 */
export const createTestImage = (): string => {
  // Ensure uploads directory exists
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Create a small test PNG image (1x1 pixel, black)
  const testImagePath = path.join(uploadDir, 'test_image.png');
  
  // Simple 1x1 pixel PNG file (base64 encoded)
  const base64Data = 
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  
  fs.writeFileSync(testImagePath, Buffer.from(base64Data, 'base64'));
  console.log(`Test image created at ${testImagePath}`);
  
  return testImagePath;
};

/**
 * Converts a small section of a large image to test conversion
 * Useful for testing when original images are too large
 */
export const createSampleFromImage = (originalPath: string): string => {
  try {
    // Try using sharp if available
    try {
      const sharp = require('sharp');
      const outputPath = path.join(path.dirname(originalPath), 'sample_image.png');
      
      // Extract a 512x512 section from the center of the image
      sharp(originalPath)
        .extract({ left: 0, top: 0, width: 512, height: 512 })
        .toFile(outputPath);
      
      return outputPath;
    } catch (err) {
      console.error('Sharp not available for sample creation:', err);
      return originalPath;
    }
  } catch (error) {
    console.error('Error creating sample image:', error);
    return originalPath;
  }
};