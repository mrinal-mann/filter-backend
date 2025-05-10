/**
 * Notification Service
 * Handles FCM notification logic for the filter backend
 */
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'https://gcloud-authentication-493914627855.us-central1.run.app';
const FCM_API_URL = 'https://fcm.googleapis.com/v1/projects/pixmix-6a12e/messages:send';

/**
 * Gets an FCM authorization token from the auth service
 */
async function getFCMAuthToken() {
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
 * @param imageUrl URL of the processed image
 * @param filterType The filter that was applied
 */
async function sendNotification(deviceToken: string, imageUrl: string, filterType: string) {
  try {
    // Get FCM OAuth token from the auth service
    const fcmToken = await getFCMAuthToken();
    
    // Build message payload according to FCM v1 format
    const messageBody = {
      message: {
        token: deviceToken,
        notification: {
          title: "Image Ready!",
          body: `Your ${filterType} filter has been applied successfully.`
        },
        data: {
          notificationType: "image_ready",
          imageUrl: imageUrl,
          filterType: filterType,
          channelId: "image-processing",
          // These are required for Expo managed projects
          experienceId: '@yourUsername/filter-frontend',
          scopeKey: '@yourUsername/filter-frontend',
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

module.exports = {
  getFCMAuthToken,
  sendNotification
};