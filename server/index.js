import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config/env.js';
import { initializeFirebase } from './config/firebase.js';
import { DemoStore, FirestoreStore } from './services/store.js';
import { buildSeed } from './services/seed.js';
import { createApp } from './app.js';

try {
  const config = loadConfig();
  let store, firebaseAuth;
  if (config.mode === 'demo') {
    const file = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data', 'demo.json');
    store = await new DemoStore({ file }).initialize(buildSeed());
  } else {
    const firebase = await initializeFirebase(config);
    store = new FirestoreStore(firebase.db);
    firebaseAuth = firebase.auth;
  }
  const app = createApp({ store, config, firebaseAuth });
  const server = app.listen(config.port, config.host, () => {
    console.log(`CommonGround API: http://${config.host}:${config.port}/api`);
    console.log(
      `Data: ${config.mode} | Payments: ${config.paymentMode}${config.paymentMode === 'demo' ? ' (simulated; no money moves)' : ' (Razorpay test mode)'}`,
    );
  });
  server.on('error', (error) => {
    console.error(`Unable to start API: ${error.message}`);
    process.exit(1);
  });
  const shutdown = () => {
    console.log('Stopping API...');
    server.close(() => process.exit(0));
    server.closeAllConnections();
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (error) {
  console.error(`Startup failed: ${error.message}`);
  process.exitCode = 1;
}
