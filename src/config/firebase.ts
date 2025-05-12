// filter-backend/config/firebase.ts
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.production' });

// Format private key properly
const formatPrivateKey = (key: string | undefined): string => {
  if (!key) return '';
  return key.replace(/\\n/g, '\n');
};

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY),
  })
});

export const firestore = admin.firestore();
export const messaging = admin.messaging();