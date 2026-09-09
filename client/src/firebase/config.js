import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const mode = import.meta.env.VITE_APP_MODE || 'demo';
if (!['demo', 'firebase'].includes(mode))
  throw new Error('VITE_APP_MODE must be demo or firebase.');
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
export const configurationError =
  mode === 'firebase' &&
  (!config.apiKey || !config.projectId || !config.appId || !config.authDomain)
    ? 'Fill in the Firebase settings in client/.env, then restart the frontend.'
    : null;
const app = mode === 'firebase' && !configurationError ? initializeApp(config) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
