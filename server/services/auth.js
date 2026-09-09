import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import jwt from 'jsonwebtoken';
import { assert } from '../utils/errors.js';

const scrypt = promisify(scryptCallback);
export const emailKey = (email) => createHash('sha256').update(email.toLowerCase()).digest('hex');
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64);
  return `${salt}:${hash.toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  if (!stored) return false;
  const [salt, encoded] = stored.split(':');
  const hash = await scrypt(password, salt, 64);
  const expected = Buffer.from(encoded, 'hex');
  return expected.length === hash.length && timingSafeEqual(expected, hash);
}
export function signDemoToken(user, config) {
  return jwt.sign({ sub: user.id }, config.demoJwtSecret, {
    algorithm: 'HS256',
    expiresIn: '8h',
    issuer: 'commonground-local-demo',
    audience: 'commonground-api',
  });
}
export function createAuthentication({ store, config, firebaseAuth }) {
  return async (req, res, next) => {
    try {
      const authorization = req.headers.authorization || '';
      assert(authorization.startsWith('Bearer '), 401, 'Please sign in to continue.');
      const token = authorization.slice(7);
      let identity;
      try {
        identity =
          config.mode === 'demo'
            ? jwt.verify(token, config.demoJwtSecret, {
                algorithms: ['HS256'],
                issuer: 'commonground-local-demo',
                audience: 'commonground-api',
              })
            : await firebaseAuth.verifyIdToken(token, true);
      } catch {
        assert(false, 401, 'Your session has expired. Please sign in again.');
      }
      req.identity = identity;
      req.user = await store.get('users', identity.uid || identity.sub);
      assert(!req.user?.disabled, 403, 'This account has been disabled.');
      next();
    } catch (error) {
      next(error);
    }
  };
}
export function requireProfile(req, res, next) {
  try {
    assert(req.user, 403, 'Complete your account profile before continuing.');
    next();
  } catch (error) {
    next(error);
  }
}
export const requireRoles =
  (...roles) =>
  (req, res, next) => {
    try {
      assert(
        req.user && roles.includes(req.user.role),
        403,
        'Your account does not have permission to do this.',
      );
      next();
    } catch (error) {
      next(error);
    }
  };
export function assertOwner(user, resource) {
  assert(
    user.role === 'admin' || (user.role === 'organization' && resource.organizationId === user.id),
    403,
    'Only the owning organization or an administrator can edit this item.',
  );
}
