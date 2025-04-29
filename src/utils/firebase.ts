// src/utils/firebase.ts
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// Path to your service account file
const SERVICE_ACCOUNT_PATH =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  path.join(process.cwd(), "firebase-service-account.json");

// Initialize Firebase Admin
let firebaseInitialized = false;

try {
  if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    const serviceAccount = JSON.parse(
      fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf8")
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("Firebase Admin SDK initialized successfully");
    firebaseInitialized = true;
  } else {
    console.warn(
      `Firebase service account file not found at: ${SERVICE_ACCOUNT_PATH}`
    );
    console.warn("FCM notifications will not be available");

    // Optional: Initialize Firebase without credentials for testing other features
    if (process.env.NODE_ENV === "development") {
      admin.initializeApp({
        projectId: "dummy-project-id",
      });
      console.log(
        "Firebase initialized with dummy credentials for development"
      );
    }
  }
} catch (error) {
  console.error("Error initializing Firebase Admin SDK:", error);
}

// Function to send FCM notification
export const sendNotification = async (
  token: string,
  title: string,
  body: string,
  data: any = {}
) => {
  if (!firebaseInitialized) {
    console.warn("Firebase not initialized. Cannot send notification.");
    return false;
  }

  try {
    // Convert all data values to strings as required by FCM
    const stringData: Record<string, string> = {};
    Object.entries(data).forEach(([key, value]) => {
      stringData[key] =
        typeof value === "string" ? value : JSON.stringify(value);
    });

    const message = {
      token,
      notification: {
        title,
        body,
      },
      data: stringData,
      android: {
        priority: "high" as const, // Use const assertion to make it a literal type
        notification: {
          channelId: "image-processing",
          priority: "max" as const,
        },
      },
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log("FCM notification sent successfully:", response);
    return true;
  } catch (error) {
    console.error("Error sending FCM notification:", error);
    return false;
  }
};
