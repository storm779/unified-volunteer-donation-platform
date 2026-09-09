import 'dotenv/config';
import { loadConfig } from '../config/env.js';
import { initializeFirebase } from '../config/firebase.js';
import { buildSeed } from '../services/seed.js';

// This is deliberately additive. Existing campaign totals and user activity are
// never overwritten; this script can be rerun safely after a partial seed.
const config = loadConfig();
if (config.mode !== 'firebase') {
  console.log(
    'Local demo data is created automatically on first startup. Back up and remove server/data/demo.json while the server is stopped to reset it.',
  );
} else {
  const { db } = await initializeFirebase(config);
  const seed = buildSeed();
  let added = 0;
  for (const collection of ['campaigns', 'opportunities', 'donations']) {
    for (const row of seed[collection]) {
      const reference = db.collection(collection).doc(row.id);
      await db.runTransaction(async (tx) => {
        const existing = await tx.get(reference);
        if (!existing.exists) {
          tx.set(reference, row);
          added += 1;
        }
      });
    }
  }
  console.log(
    `Added ${added} fictional sample documents. No authentication users or privileges were created.`,
  );
  console.log(
    'Sample campaigns belong to fictional organizations. Register your own organization to manage its own newly created content; an administrator can manage samples.',
  );
  process.exit(0);
}
