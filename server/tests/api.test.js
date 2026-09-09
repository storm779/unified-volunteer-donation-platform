import test from 'node:test';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { createApp } from '../app.js';
import { loadConfig } from '../config/env.js';
import { DemoStore } from '../services/store.js';
import { buildSeed } from '../services/seed.js';
import { emailKey } from '../services/auth.js';

async function setup(overrides = {}) {
  const config = {
    ...loadConfig({
      APP_MODE: 'demo',
      DEMO_JWT_SECRET: 'test-only-session-secret-with-32-characters',
    }),
    ...overrides.config,
  };
  const store = await new DemoStore().initialize(buildSeed());
  const app = createApp({
    store,
    config,
    gateway: overrides.gateway,
    firebaseAuth: overrides.firebaseAuth,
  });
  const login = async (role) =>
    (await request(app).post('/api/auth/demo').send({ role })).body.token;
  return { app, store, config, login };
}
const auth = (token) => ({ Authorization: `Bearer ${token}` });
const campaign = {
  title: 'A new community campaign',
  category: 'Education',
  summary: 'A practical campaign for local learning.',
  description:
    'We provide learning supplies and organize reading activities for children in our local community.',
  location: 'Pune, India',
  image: '/images/education.jpg',
  target: 10000,
  status: 'active',
};

test('default startup is local and explicitly simulated; unsafe configuration fails closed', async () => {
  const { app } = await setup();
  const health = await request(app).get('/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.body.mode, 'demo');
  assert.equal(health.body.payments, 'demo');
  assert.throws(() => loadConfig({ APP_MODE: 'demo', NODE_ENV: 'production' }), /production/);
  assert.throws(() => loadConfig({ APP_MODE: 'demo', HOST: '0.0.0.0' }), /loopback/);
  assert.throws(
    () => loadConfig({ APP_MODE: 'demo', CLIENT_ORIGIN: 'https://external.example' }),
    /loopback/,
  );
  assert.throws(
    () => loadConfig({ APP_MODE: 'firebase', PAYMENT_MODE: 'demo' }),
    /Firebase mode requires/,
  );
  assert.throws(() => loadConfig({ APP_MODE: 'firebase' }), /Razorpay test/);
  assert.throws(
    () =>
      loadConfig({
        APP_MODE: 'firebase',
        RAZORPAY_KEY_ID: 'rzp_test_placeholder',
        RAZORPAY_KEY_SECRET: 'test-placeholder',
      }),
    /Firebase mode requires/,
  );
  assert.throws(
    () =>
      loadConfig({
        APP_MODE: 'demo',
        PAYMENT_MODE: 'razorpay-test',
        RAZORPAY_KEY_ID: 'rzp_live_not_allowed',
        RAZORPAY_KEY_SECRET: 'test-placeholder',
      }),
    /Razorpay test/,
  );
});

test('CORS, local Host restrictions, Helmet, and request validation are enforced', async () => {
  const { app } = await setup();
  assert.equal(
    (await request(app).get('/api/health').set('Origin', 'https://untrusted.example')).status,
    403,
  );
  assert.equal(
    (await request(app).get('/api/health').set('Host', 'rebinding.example')).status,
    403,
  );
  const allowed = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
  assert.equal(allowed.headers['access-control-allow-origin'], 'http://localhost:5173');
  assert.equal(allowed.headers['x-content-type-options'], 'nosniff');
  assert.equal(
    (
      await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{broken')
    ).status,
    400,
  );
  assert.equal((await request(app).get('/api/campaigns/__proto__')).status, 404);
});

test('registration hashes passwords, cannot provision administrators, and rejects concurrent duplicate email', async () => {
  const { app, store } = await setup();
  const input = {
    name: 'Taylor Test',
    email: 'taylor@example.org',
    password: 'A-long-demo-password',
    role: 'user',
  };
  assert.equal(
    (
      await request(app)
        .post('/api/auth/register')
        .send({ ...input, role: 'admin' })
    ).status,
    400,
  );
  const results = await Promise.all([
    request(app).post('/api/auth/register').send(input),
    request(app).post('/api/auth/register').send(input),
  ]);
  assert.deepEqual(results.map((row) => row.status).sort(), [201, 409]);
  const registered = results.find((row) => row.status === 201).body;
  assert.ok(registered.token);
  assert.equal(registered.user.password, undefined);
  const credential = await store.get('credentials', emailKey(input.email));
  assert.ok(credential.passwordHash.includes(':'));
  assert.ok(!credential.passwordHash.includes(input.password));
  assert.equal(
    (
      await request(app)
        .post('/api/auth/login')
        .send({ email: input.email, password: 'wrong-password' })
    ).status,
    401,
  );
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: input.email, password: input.password });
  assert.equal(login.status, 200);
  assert.equal(
    (await request(app).get('/api/users/me').set(auth(login.body.token))).body.id,
    registered.user.id,
  );
});

test('role and organization ownership checks protect campaigns and privileged fields', async () => {
  const { app, login, store } = await setup();
  const user = await login('user');
  const org = await login('organization');
  const admin = await login('admin');
  assert.equal((await request(app).get('/api/dashboard')).status, 401);
  assert.equal(
    (await request(app).post('/api/campaigns').set(auth(user)).send(campaign)).status,
    403,
  );
  assert.equal(
    (
      await request(app)
        .post('/api/campaigns')
        .set(auth(org))
        .send({ ...campaign, raised: 1000 })
    ).status,
    400,
  );
  const created = await request(app).post('/api/campaigns').set(auth(org)).send(campaign);
  assert.equal(created.status, 201);
  assert.equal(created.body.raised, 0);
  assert.equal(created.body.organizationId, 'demo-organization');
  assert.equal(
    (
      await request(app)
        .patch('/api/campaigns/rural-healthcare')
        .set(auth(org))
        .send({ status: 'paused' })
    ).status,
    403,
  );
  assert.equal(
    (
      await request(app)
        .patch(`/api/campaigns/${created.body.id}`)
        .set(auth(org))
        .send({ status: 'paused' })
    ).status,
    200,
  );
  assert.equal(
    (
      await request(app)
        .patch(`/api/campaigns/${created.body.id}`)
        .set(auth(org))
        .send({ title: 'Updated community campaign' })
    ).body.status,
    'paused',
  );
  assert.equal(
    (await request(app).patch('/api/users/me').set(auth(user)).send({ role: 'admin' })).status,
    400,
  );
  assert.equal(
    (
      await request(app)
        .patch('/api/campaigns/rural-healthcare')
        .set(auth(admin))
        .send({ status: 'paused' })
    ).status,
    200,
  );
  assert.equal((await store.get('campaigns', 'education-every-child')).raised, 270000);
});

test('dashboards and public donor feeds do not expose unrelated private user data', async () => {
  const { app, login } = await setup();
  const user = await login('user');
  const org = await login('organization');
  const admin = await login('admin');
  const userDashboard = (await request(app).get('/api/dashboard').set(auth(user))).body;
  assert.ok(userDashboard.donations.every((row) => row.userId === 'demo-user'));
  assert.ok(userDashboard.applications.every((row) => row.userId === 'demo-user'));
  assert.deepEqual(userDashboard.users, []);
  const orgDashboard = (await request(app).get('/api/dashboard').set(auth(org))).body;
  assert.ok(orgDashboard.donations.every((row) => row.organizationId === 'demo-organization'));
  assert.ok(orgDashboard.campaigns.every((row) => row.organizationId === 'demo-organization'));
  assert.deepEqual(orgDashboard.users, []);
  assert.equal((await request(app).get('/api/dashboard').set(auth(admin))).body.users.length, 4);
  const donations = (await request(app).get('/api/campaigns/education-every-child/donations')).body;
  assert.ok(
    donations.every((row) => !('userId' in row) && !('paymentId' in row) && !('userEmail' in row)),
  );
  assert.ok(
    donations
      .filter((row) => row.anonymous)
      .every((row) => row.donorName === 'Anonymous supporter'),
  );
});

test('volunteer applications are unique under concurrency and status updates are authorized', async () => {
  const { app, login } = await setup();
  const user = await login('user');
  const org = await login('organization');
  const input = {
    opportunityId: 'food-distribution',
    motivation: 'I would like to help organize the weekly community food distribution.',
  };
  const results = await Promise.all([
    request(app).post('/api/applications').set(auth(user)).send(input),
    request(app).post('/api/applications').set(auth(user)).send(input),
  ]);
  assert.deepEqual(results.map((row) => row.status).sort(), [201, 409]);
  const id = results.find((row) => row.status === 201).body.id;
  assert.equal(
    (
      await request(app)
        .patch(`/api/applications/${id}`)
        .set(auth(user))
        .send({ status: 'accepted' })
    ).status,
    403,
  );
  assert.equal(
    (
      await request(app)
        .patch(`/api/applications/${id}`)
        .set(auth(org))
        .send({ status: 'accepted' })
    ).body.status,
    'accepted',
  );
  assert.equal(
    (
      await request(app)
        .patch(`/api/applications/${id}`)
        .set(auth(user))
        .send({ status: 'withdrawn' })
    ).body.status,
    'withdrawn',
  );
  assert.equal(
    (await request(app).post('/api/applications').set(auth(user)).send(input)).status,
    201,
  );
  assert.equal(
    (
      await request(app)
        .post('/api/applications')
        .set(auth(user))
        .send({ ...input, opportunityId: 'teaching-volunteer' })
    ).status,
    409,
  );
});

test('orders validate integer rupees and concurrent simulated payment retries credit exactly once', async () => {
  const { app, login, store } = await setup();
  const user = await login('user');
  const org = await login('organization');
  for (const amount of [0, -1, 0.5, 1000001, '500']) {
    assert.equal(
      (
        await request(app)
          .post('/api/payments/order')
          .set(auth(user))
          .send({ campaignId: 'education-every-child', amount })
      ).status,
      400,
    );
  }
  const before = await store.get('campaigns', 'education-every-child');
  const order = await request(app)
    .post('/api/payments/order')
    .set(auth(user))
    .send({ campaignId: before.id, amount: 500, anonymous: true });
  assert.equal(order.status, 201);
  assert.equal(order.body.amount, 50000);
  assert.equal(order.body.mode, 'demo');
  assert.equal(order.body.keyId, undefined);
  assert.equal(
    (await request(app).post('/api/payments/demo').set(auth(org)).send({ orderId: order.body.id }))
      .status,
    403,
  );
  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      request(app).post('/api/payments/demo').set(auth(user)).send({ orderId: order.body.id }),
    ),
  );
  assert.ok(results.every((row) => row.status === 200));
  assert.equal(new Set(results.map((row) => row.body.id)).size, 1);
  assert.equal(results[0].body.amount, 500);
  assert.equal(results[0].body.donorName, 'Anonymous supporter');
  const after = await store.get('campaigns', before.id);
  assert.equal(after.raised, before.raised + 500);
  assert.equal(after.donorCount, before.donorCount + 1);
});

function fakeGateway() {
  let sequence = 0;
  const records = new Map();
  return {
    records,
    orders: {
      create: async (input) => ({
        id: `order_test_${++sequence}`,
        amount: input.amount,
        currency: input.currency,
      }),
    },
    payments: {
      fetch: async (id) => {
        if (!records.has(id)) throw new Error('Payment unavailable');
        return records.get(id);
      },
    },
  };
}
const testPaymentConfig = {
  paymentMode: 'razorpay-test',
  razorpayKeyId: 'rzp_test_fixture',
  razorpayKeySecret: 'unit-test-only-secret',
};
const signature = (orderId, paymentId) =>
  createHmac('sha256', testPaymentConfig.razorpayKeySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

test('Razorpay verification rejects forged signatures, ownership mismatch, wrong amount/currency/order, and uncaptured payments', async () => {
  const gateway = fakeGateway();
  const { app, login, store } = await setup({ config: testPaymentConfig, gateway });
  const user = await login('user');
  const org = await login('organization');
  const order = (
    await request(app)
      .post('/api/payments/order')
      .set(auth(user))
      .send({ campaignId: 'education-every-child', amount: 700 })
  ).body;
  const paymentId = 'pay_test_captured';
  const body = {
    razorpay_order_id: order.id,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature(order.id, paymentId),
  };
  const valid = {
    id: paymentId,
    order_id: order.id,
    amount: 70000,
    currency: 'INR',
    status: 'captured',
    captured: true,
  };
  const before = await store.get('campaigns', 'education-every-child');
  gateway.records.set(paymentId, valid);
  assert.equal(
    (
      await request(app)
        .post('/api/payments/verify')
        .set(auth(user))
        .send({ ...body, razorpay_signature: '0'.repeat(64) })
    ).status,
    400,
  );
  assert.equal(
    (await request(app).post('/api/payments/verify').set(auth(org)).send(body)).status,
    403,
  );
  for (const patch of [
    { amount: 100 },
    { currency: 'USD' },
    { order_id: 'order_other' },
    { status: 'authorized', captured: false },
    { captured: false },
  ]) {
    gateway.records.set(paymentId, { ...valid, ...patch });
    const result = await request(app).post('/api/payments/verify').set(auth(user)).send(body);
    assert.ok([400, 409].includes(result.status), JSON.stringify(result.body));
  }
  assert.equal((await store.get('campaigns', before.id)).raised, before.raised);
  assert.equal(
    (await request(app).post('/api/payments/demo').set(auth(user)).send({ orderId: order.id }))
      .status,
    404,
  );
  gateway.records.set(paymentId, valid);
  const results = await Promise.all(
    Array.from({ length: 5 }, () =>
      request(app).post('/api/payments/verify').set(auth(user)).send(body),
    ),
  );
  assert.ok(results.every((row) => row.status === 200));
  assert.equal(new Set(results.map((row) => row.body.id)).size, 1);
  assert.equal((await store.get('campaigns', before.id)).raised, before.raised + 700);
  assert.equal((await store.get('campaigns', before.id)).donorCount, before.donorCount + 1);
});

test('Razorpay payment IDs cannot be reused to credit another order', async () => {
  const gateway = fakeGateway();
  const { app, login, store } = await setup({ config: testPaymentConfig, gateway });
  const token = await login('user');
  const orders = [];
  for (let index = 0; index < 2; index++)
    orders.push(
      (
        await request(app)
          .post('/api/payments/order')
          .set(auth(token))
          .send({ campaignId: 'education-every-child', amount: 50 })
      ).body,
    );
  const paymentId = 'pay_replay_fixture';
  const before = await store.get('campaigns', 'education-every-child');
  for (const [index, order] of orders.entries()) {
    // Even a malicious/inconsistent provider response cannot bypass the payment claim.
    gateway.records.set(paymentId, {
      id: paymentId,
      order_id: order.id,
      amount: 5000,
      currency: 'INR',
      status: 'captured',
      captured: true,
    });
    const result = await request(app)
      .post('/api/payments/verify')
      .set(auth(token))
      .send({
        razorpay_order_id: order.id,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature(order.id, paymentId),
      });
    assert.equal(result.status, index === 0 ? 200 : 409);
  }
  assert.equal((await store.get('campaigns', before.id)).raised, before.raised + 50);
});

test('disabled accounts lose access immediately and admins cannot disable themselves', async () => {
  const { app, login } = await setup();
  const user = await login('user');
  const admin = await login('admin');
  assert.equal(
    (await request(app).patch('/api/admin/users/demo-user').set(auth(user)).send({ role: 'admin' }))
      .status,
    403,
  );
  assert.equal(
    (
      await request(app)
        .patch('/api/admin/users/demo-admin')
        .set(auth(admin))
        .send({ disabled: true })
    ).status,
    409,
  );
  assert.equal(
    (
      await request(app)
        .patch('/api/admin/users/demo-user')
        .set(auth(admin))
        .send({ disabled: true })
    ).status,
    200,
  );
  assert.equal((await request(app).get('/api/dashboard').set(auth(user))).status, 403);
  assert.equal((await request(app).post('/api/auth/demo').send({ role: 'user' })).status, 403);
});

test('Firebase tokens create a profile once and cannot elevate existing roles by re-syncing', async () => {
  const firebaseAuth = {
    verifyIdToken: async (token) => {
      if (token !== 'valid-firebase-token') throw new Error('Invalid token');
      return { uid: 'firebase-user-123', email: 'firebase@example.org', name: 'Firebase Tester' };
    },
  };
  const { app, store } = await setup({
    config: { ...testPaymentConfig, mode: 'firebase' },
    gateway: fakeGateway(),
    firebaseAuth,
  });
  assert.equal((await request(app).post('/api/auth/demo').send({ role: 'admin' })).status, 404);
  assert.equal(
    (await request(app).post('/api/auth/sync').set(auth('invalid')).send({ role: 'user' })).status,
    401,
  );
  const created = await request(app)
    .post('/api/auth/sync')
    .set(auth('valid-firebase-token'))
    .send({ role: 'user' });
  assert.equal(created.status, 200);
  assert.equal(created.body.role, 'user');
  const existing = await request(app)
    .post('/api/auth/sync')
    .set(auth('valid-firebase-token'))
    .send({ role: 'organization', organizationName: 'A different role' });
  assert.equal(existing.body.role, 'user');
  assert.equal(
    (
      await request(app)
        .post('/api/auth/sync')
        .set(auth('valid-firebase-token'))
        .send({ role: 'admin' })
    ).status,
    400,
  );
  assert.equal((await store.get('users', 'firebase-user-123')).role, 'user');
});

test('demo persistence survives restart and failed transactions roll back atomically', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'commonground-test-'));
  try {
    const file = path.join(directory, 'demo.json');
    const store = await new DemoStore({ file }).initialize(buildSeed());
    const before = await readFile(file, 'utf8');
    await assert.rejects(
      store.transact(async (tx) => {
        await tx.set('campaigns', 'test', { id: 'test' });
        throw new Error('rollback');
      }),
      /rollback/,
    );
    assert.equal(await store.get('campaigns', 'test'), null);
    assert.equal(await readFile(file, 'utf8'), before);
    await store.set('campaigns', 'persisted', { id: 'persisted', title: 'Persisted campaign' });
    const restarted = await new DemoStore({ file }).initialize(buildSeed());
    assert.equal((await restarted.get('campaigns', 'persisted')).title, 'Persisted campaign');
  } finally {
    assert.ok(
      path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep) &&
        path.basename(directory).startsWith('commonground-test-'),
    );
    await rm(directory, { recursive: true, force: true });
  }
});

test('demo SSE publishes a data-free change event when a mutation completes', async () => {
  const { app, store } = await setup();
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const controller = new AbortController();
  let reader;
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/events`, {
      signal: controller.signal,
    });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/event-stream/);
    reader = response.body.getReader();
    const initial = await reader.read();
    assert.match(new TextDecoder().decode(initial.value), /connected/);
    const user = await store.get('users', 'demo-user');
    await store.set('users', user.id, { ...user, bio: 'A private profile change' });
    const change = await reader.read();
    const data = new TextDecoder().decode(change.value);
    assert.match(data, /event: change\ndata: \{\}/);
    assert.ok(!data.includes('private') && !data.includes(user.email));
  } finally {
    controller.abort();
    if (reader) await reader.cancel().catch(() => {});
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('personal dashboard scopes an organization account to its own contributions', async () => {
  const { app, login } = await setup();
  const org = await login('organization');
  const order = await request(app)
    .post('/api/payments/order')
    .set(auth(org))
    .send({ campaignId: 'rural-healthcare', amount: 250 });
  await request(app).post('/api/payments/demo').set(auth(org)).send({ orderId: order.body.id });
  const personal = await request(app).get('/api/dashboard?view=personal').set(auth(org));
  assert.equal(personal.status, 200);
  assert.equal(personal.body.stats.totalDonated, 250);
  assert.ok(personal.body.donations.every((row) => row.userId === 'demo-organization'));
  assert.equal(personal.body.users.length, 0);
  const workspace = await request(app).get('/api/dashboard').set(auth(org));
  assert.ok(workspace.body.donations.every((row) => row.organizationId === 'demo-organization'));
});

test('Firebase simulation uses authenticated orders and stays disabled outside local development', async () => {
  const options = {
    APP_MODE: 'firebase',
    PAYMENT_MODE: 'demo',
    FIREBASE_SERVICE_ACCOUNT_PATH: 'test-credential-path',
  };
  assert.equal(loadConfig(options).paymentMode, 'demo');
  assert.throws(() => loadConfig({ ...options, NODE_ENV: 'production' }), /production/);
  assert.throws(() => loadConfig({ ...options, HOST: '0.0.0.0' }), /loopback/);
  const { app } = await setup({
    config: { mode: 'firebase', paymentMode: 'demo' },
    firebaseAuth: {
      verifyIdToken: async (token) => {
        if (token !== 'valid-test-token') throw new Error('Invalid token');
        return { uid: 'demo-user', email: 'alex@example.org' };
      },
    },
  });
  assert.equal((await request(app).post('/api/auth/demo').send({ role: 'admin' })).status, 404);
  assert.equal(
    (await request(app).post('/api/payments/demo').send({ orderId: 'missing' })).status,
    401,
  );
  const headers = auth('valid-test-token');
  const order = await request(app)
    .post('/api/payments/order')
    .set(headers)
    .send({ campaignId: 'education-every-child', amount: 100 });
  assert.equal(order.status, 201);
  const donation = await request(app)
    .post('/api/payments/demo')
    .set(headers)
    .send({ orderId: order.body.id });
  assert.equal(donation.status, 200);
  assert.equal(donation.body.mode, 'demo');
  const retry = await request(app)
    .post('/api/payments/demo')
    .set(headers)
    .send({ orderId: order.body.id });
  assert.equal(retry.body.id, donation.body.id);
});
