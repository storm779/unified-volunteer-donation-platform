import { createApp } from '../server/app.js';
import { DemoStore } from '../server/services/store.js';
import { buildSeed } from '../server/services/seed.js';
import { loadConfig } from '../server/config/env.js';
// Ephemeral data: browser tests never modify the developer's saved local demo.
const store = await new DemoStore().initialize(buildSeed());
const config = loadConfig({
  APP_MODE: 'demo',
  PORT: '5100',
  HOST: '127.0.0.1',
  CLIENT_ORIGIN: 'http://localhost:5174',
});
createApp({ store, config }).listen(5100, '127.0.0.1');
