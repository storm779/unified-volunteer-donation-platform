import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { EventEmitter } from 'node:events';

export const collectionNames = [
  'users',
  'campaigns',
  'opportunities',
  'donations',
  'applications',
  'orders',
  'paymentClaims',
  'credentials',
];

// A single queued transaction serializes local demo writes. Persist first, then publish;
// failed writes leave both in-memory state and the on-disk snapshot untouched.
export class DemoStore extends EventEmitter {
  constructor({ file = null, initial = {} } = {}) {
    super();
    this.file = file;
    this.state = Object.fromEntries(collectionNames.map((name) => [name, {}]));
    Object.assign(this.state, structuredClone(initial));
    this.queue = Promise.resolve();
    this.setMaxListeners(100);
  }

  async initialize(seed) {
    if (this.file) {
      try {
        const saved = JSON.parse(await readFile(this.file, 'utf8'));
        for (const name of collectionNames) this.state[name] = saved[name] || {};
        return this;
      } catch (error) {
        if (error.code !== 'ENOENT')
          throw new Error(
            'Cannot read the local demo database. Back up and remove server/data/demo.json to reset it.',
          );
      }
    }
    if (seed)
      await this.transact(async (tx) => {
        for (const name of collectionNames)
          for (const row of seed[name] || []) await tx.set(name, row.id, row);
      });
    return this;
  }

  async get(collection, id) {
    return structuredClone(
      Object.hasOwn(this.state[collection] || {}, id) ? this.state[collection][id] : null,
    );
  }
  async list(collection, filters = []) {
    return structuredClone(
      Object.values(this.state[collection] || {}).filter((row) =>
        filters.every(([field, value]) => row[field] === value),
      ),
    );
  }
  async set(collection, id, value) {
    return this.transact((tx) => tx.set(collection, id, value));
  }

  transact(callback) {
    const run = this.queue.then(async () => {
      const draft = structuredClone(this.state);
      const tx = {
        get: async (collection, id) =>
          structuredClone(Object.hasOwn(draft[collection], id) ? draft[collection][id] : null),
        set: async (collection, id, value) => {
          draft[collection][id] = structuredClone(value);
          return value;
        },
      };
      const result = await callback(tx);
      if (this.file) {
        await mkdir(path.dirname(this.file), { recursive: true });
        await writeFile(`${this.file}.tmp`, JSON.stringify(draft, null, 2), { mode: 0o600 });
        await rename(`${this.file}.tmp`, this.file);
      }
      this.state = draft;
      this.emit('change');
      return structuredClone(result);
    });
    this.queue = run.catch(() => {});
    return run;
  }
}

export class FirestoreStore {
  constructor(db) {
    this.db = db;
  }
  async get(collection, id) {
    const document = await this.db.collection(collection).doc(id).get();
    return document.exists ? { ...document.data(), id: document.id } : null;
  }
  async list(collection, filters = []) {
    let query = this.db.collection(collection);
    for (const [field, value] of filters) query = query.where(field, '==', value);
    const snapshot = await query.get();
    return snapshot.docs.map((document) => ({ ...document.data(), id: document.id }));
  }
  async set(collection, id, value) {
    await this.db.collection(collection).doc(id).set(value);
    return value;
  }
  async transact(callback) {
    return this.db.runTransaction(async (native) =>
      callback({
        get: async (collection, id) => {
          const document = await native.get(this.db.collection(collection).doc(id));
          return document.exists ? { ...document.data(), id: document.id } : null;
        },
        set: async (collection, id, value) => {
          native.set(this.db.collection(collection).doc(id), value);
          return value;
        },
      }),
    );
  }
}
