import 'dotenv/config';
import { loadConfig } from '../config/env.js';
import { initializeFirebase } from '../config/firebase.js';

const uid = process.argv[2];
if (!uid || !/^[a-zA-Z0-9_-]{1,128}$/.test(uid)) {
  console.error('Usage: npm run make-admin -- <firebase-user-uid>');
  process.exit(1);
}
const config = loadConfig();
if (config.mode !== 'firebase')
  throw new Error(
    'Admin provisioning is only needed in Firebase mode. Use the local Admin demo persona for demo mode.',
  );
const { auth, db } = await initializeFirebase(config);
const authUser = await auth.getUser(uid);
const reference = db.collection('users').doc(uid);
const existing = await reference.get();
if (!existing.exists)
  throw new Error('Ask this user to sign in to the app first so their profile is created.');
await reference.update({ role: 'admin' });
console.log(
  `Administrator role granted to ${authUser.email || uid}. This uses your private Firebase Admin credentials; there is no public admin-registration endpoint.`,
);
process.exit(0);
