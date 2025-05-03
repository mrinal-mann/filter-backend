// src/utils/firebase.ts
import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

// Initialize Firebase Admin
let firebaseInitialized = false;

try {
  // Check if required environment variables are set
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'); // Handle newline characters

  if (projectId && clientEmail && privateKey) {
    // Initialize with environment variables
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });

    console.log("Firebase Admin SDK initialized successfully using environment variables");
    firebaseInitialized = true;
  } else {
    console.warn(
      "Firebase environment variables not found (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)"
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
// export const sendNotification = async (
//   token: string,
//   title: string,
//   body: string,
//   data: any = {}
// ) => {
//   if (!firebaseInitialized) {
//     console.warn("Firebase not initialized. Cannot send notification.");
//     return false;
//   }

//   try {
//     // Convert all data values to strings as required by FCM
//     const stringData: Record<string, string> = {};
//     Object.entries(data).forEach(([key, value]) => {
//       stringData[key] =
//         typeof value === "string" ? value : JSON.stringify(value);
//     });

//     const message = {
//       token,
//       notification: {
//         title,
//         body,
//       },
//       data: stringData,
//       android: {
//         priority: "high" as const, // Use const assertion to make it a literal type
//         notification: {
//           channelId: "image-processing",
//           priority: "max" as const,
//         },
//       },
//       apns: {
//         payload: {
//           aps: {
//             contentAvailable: true,
//           },
//         },
//       },
//     };

//     const response = await admin.messaging().send(message);
//     console.log("FCM notification sent successfully:", response);
//     return true;
//   } catch (error) {
//     console.error("Error sending FCM notification:", error);
//     return false;
//   }
// };

export default admin;