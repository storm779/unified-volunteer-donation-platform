import { readFile } from 'node:fs/promises';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export async function initializeFirebase(config) {
  let account;
  if (config.firebaseServiceAccountPath) {
    account = JSON.parse(await readFile(config.firebaseServiceAccountPath, 'utf8'));
  } else {
    account = {
      projectId: config.firebaseProjectId,
      clientEmail: config.firebaseClientEmail,
      privateKey: config.firebasePrivateKey,
    };
  }
  const app = getApps()[0] || initializeApp({ credential: cert(account) });
  return { app, auth: getAuth(app), db: getFirestore(app) };
}
