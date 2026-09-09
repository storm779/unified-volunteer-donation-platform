import 'dotenv/config';
import { randomBytes } from 'node:crypto';

export function loadConfig(env = process.env) {
  const mode = env.APP_MODE || 'demo';
  if (!['demo', 'firebase'].includes(mode)) throw new Error('APP_MODE must be demo or firebase.');
  if (mode === 'demo' && env.NODE_ENV === 'production')
    throw new Error('Demo mode cannot run in production.');
  const host = env.HOST || '127.0.0.1';
  if (mode === 'demo' && !['127.0.0.1', 'localhost', '::1'].includes(host))
    throw new Error('Demo mode must bind to a loopback HOST.');
  const paymentMode = env.PAYMENT_MODE || (mode === 'demo' ? 'demo' : 'razorpay-test');
  if (!['demo', 'razorpay-test'].includes(paymentMode))
    throw new Error('PAYMENT_MODE must be demo or razorpay-test.');
  if (paymentMode === 'demo' && env.NODE_ENV === 'production')
    throw new Error('Simulated payments cannot run in production.');
  if (paymentMode === 'demo' && !['127.0.0.1', 'localhost', '::1'].includes(host))
    throw new Error('Simulated payments must bind to a loopback HOST.');
  const razorpayKeyId = env.RAZORPAY_KEY_ID || '';
  const razorpayKeySecret = env.RAZORPAY_KEY_SECRET || '';
  if (
    paymentMode === 'razorpay-test' &&
    (!razorpayKeyId.startsWith('rzp_test_') || !razorpayKeySecret)
  ) {
    throw new Error(
      'Razorpay test payments require RAZORPAY_KEY_ID (rzp_test_...) and RAZORPAY_KEY_SECRET.',
    );
  }
  if (
    mode === 'firebase' &&
    !env.FIREBASE_SERVICE_ACCOUNT_PATH &&
    !(env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY)
  ) {
    throw new Error(
      'Firebase mode requires FIREBASE_SERVICE_ACCOUNT_PATH or all three FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY values.',
    );
  }
  if (env.DEMO_JWT_SECRET && env.DEMO_JWT_SECRET.length < 32)
    throw new Error('DEMO_JWT_SECRET must contain at least 32 characters.');
  const port = Number(env.PORT || 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('PORT must be a valid TCP port.');
  const origins = (env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (origins.some((origin) => !/^https?:\/\/[^/]+$/.test(origin)))
    throw new Error(
      'CLIENT_ORIGIN must be one or more exact HTTP(S) origins, with no trailing slash.',
    );
  if (
    (mode === 'demo' || paymentMode === 'demo') &&
    origins.some(
      (origin) => !['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname),
    )
  ) {
    throw new Error('Demo CLIENT_ORIGIN must use loopback addresses.');
  }
  return {
    mode,
    paymentMode,
    host,
    port,
    origins,
    razorpayKeyId,
    razorpayKeySecret,
    demoJwtSecret: env.DEMO_JWT_SECRET || randomBytes(48).toString('hex'),
    firebaseServiceAccountPath: env.FIREBASE_SERVICE_ACCOUNT_PATH,
    firebaseProjectId: env.FIREBASE_PROJECT_ID,
    firebaseClientEmail: env.FIREBASE_CLIENT_EMAIL,
    firebasePrivateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };
}
