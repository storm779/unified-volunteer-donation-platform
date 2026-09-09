import { readFile } from 'node:fs/promises';
import { getSecurityRules } from 'firebase-admin/security-rules';
import { loadConfig } from '../config/env.js';
import { initializeFirebase } from '../config/firebase.js';
const config = loadConfig();
if (config.mode !== 'firebase')
  throw new Error('Set APP_MODE=firebase before publishing Firestore rules.');
const { app } = await initializeFirebase(config);
const source = await readFile(new URL('../../firestore.rules', import.meta.url), 'utf8');
const rules = await getSecurityRules(app).releaseFirestoreRulesetFromSource(source);
console.log(`Published application Firestore rules: ${rules.name}`);
process.exit(0);
