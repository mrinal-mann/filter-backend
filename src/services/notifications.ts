/**
 * Notification Service
 * Handles FCM notifications from the backend to the frontend
 */
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Auth service URL for getting FCM tokens
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'https://gcloud-authentication-493914627855.us-central1.run.app';

// FCM API URL
const FCM_API_URL = 'https://fcm.googleapis.com/v1/projects/pixmix-6a12e/messages:send';

/**
 * Gets an FCM authorization token from the auth service
 * @returns Promise with the FCM token
 */
async function getFCMAuthToken(): Promise<string> {
  try {
    const response = await fetch(`${AUTH_SERVICE_URL}/auth/fcm-token`);
    
    if (!response.ok) {
      throw new Error(`Failed to get FCM token: ${response.status}`);
    }
    
    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Error getting FCM auth token:', error);
    throw error;
  }
}

/**
 * Sends an FCM notification when image processing is complete
 * 
 * @param deviceToken The FCM token of the target device
 * @param title Notification title
 * @param body Notification body
 * @param data Additional data to send with the notification
 * @returns Promise with the FCM response
 */
async function sendNotification(
  deviceToken: string, 
  title: string, 
  body: string, 
  data: Record<string, any> = {}
): Promise<any> {
  try {
    // Get FCM OAuth token from the auth service
    const fcmToken = await getFCMAuthToken();
    
    // Build message payload according to FCM v1 format
    const messageBody = {
      message: {
        token: deviceToken,
        notification: {
          title,
          body
        },
        data: {
          ...data,
          // These are required for Expo managed projects
          experienceId: '@pixmix/filter-frontend',
          scopeKey: '@pixmix/filter-frontend',
        },
        android: {
          notification: {
            channel_id: "image-processing",
            notification_priority: "PRIORITY_HIGH"
          }
        }
      }
    };
    
    // Send to FCM
    const response = await fetch(FCM_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${fcmToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`FCM error: ${JSON.stringify(errorData)}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}

// Export the functions
export {
  getFCMAuthToken,
  sendNotification
};