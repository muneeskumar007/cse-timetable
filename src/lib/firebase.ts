import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Verify if valid non-empty Firebase configuration is provided
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    !firebaseConfig.projectId.includes('Example') &&
    firebaseConfig.projectId.trim() !== ''
);

let app: FirebaseApp | null = null;
let firestore: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    firestore = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch (err) {
    console.warn('Firebase initialization notice:', err);
    // In environments where persistentMultipleTabManager might throw or is unsupported, fallback gracefully
    try {
      if (app) {
        firestore = initializeFirestore(app, {});
      }
    } catch (fallbackErr) {
      console.error('Firebase fallback error:', fallbackErr);
    }
  }
}

export { app, firestore };
