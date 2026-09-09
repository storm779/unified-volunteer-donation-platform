import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncRoute, assert } from '../utils/errors.js';
import { createAuthentication, requireProfile, requireRoles } from '../middleware/auth.js';
import { createControllers } from '../controllers/api.js';

export function createRouter(dependencies) {
  const router = Router();
  const { store, config } = dependencies;
  const controllers = createControllers(dependencies);
  const auth = createAuthentication(dependencies);
  const protectedRoute = [auth, requireProfile];
  const organization = [...protectedRoute, requireRoles('organization', 'admin')];
  const admin = [...protectedRoute, requireRoles('admin')];
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: 'Too many sign-in attempts. Please try again later.' },
  });
  const paymentLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: 'Too many payment requests. Please try again shortly.' },
  });
  const handler = (name) => asyncRoute(controllers[name]);
  router.get('/health', handler('health'));
  router.post('/auth/demo', authLimiter, handler('demo'));
  router.post('/auth/register', authLimiter, handler('register'));
  router.post('/auth/login', authLimiter, handler('login'));
  router.post('/auth/sync', authLimiter, auth, handler('sync'));
  router.get('/users/me', ...protectedRoute, handler('me'));
  router.patch('/users/me', ...protectedRoute, handler('profile'));
  router.get('/campaigns', handler('listCampaigns'));
  router.get('/campaigns/:id', handler('getCampaign'));
  router.get('/campaigns/:id/donations', handler('campaignDonations'));
  router.post('/campaigns', ...organization, handler('createCampaign'));
  router.patch('/campaigns/:id', ...organization, handler('updateCampaign'));
  router.get('/opportunities', handler('listOpportunities'));
  router.get('/opportunities/:id', handler('getOpportunity'));
  router.post('/opportunities', ...organization, handler('createOpportunity'));
  router.patch('/opportunities/:id', ...organization, handler('updateOpportunity'));
  router.post('/applications', ...protectedRoute, requireRoles('user'), handler('apply'));
  router.patch('/applications/:id', ...protectedRoute, handler('updateApplication'));
  router.get('/dashboard', ...protectedRoute, handler('dashboard'));
  router.patch('/admin/users/:id', ...admin, handler('updateUser'));
  router.post('/payments/order', ...protectedRoute, paymentLimiter, handler('order'));
  router.post('/payments/demo', ...protectedRoute, paymentLimiter, handler('demoPayment'));
  router.post('/payments/verify', ...protectedRoute, paymentLimiter, handler('verifyPayment'));

  let openConnections = 0;
  router.get(
    '/events',
    asyncRoute(async (req, res) => {
      assert(config.mode === 'demo', 404, 'Use Firestore listeners in Firebase mode.');
      assert(openConnections < 50, 429, 'Too many live connections. Please try again shortly.');
      openConnections += 1;
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();
      res.write('retry: 3000\n: connected\n\n');
      const onChange = () => res.write('event: change\ndata: {}\n\n');
      const heartbeat = setInterval(() => res.write(': keepalive\n\n'), 25000);
      heartbeat.unref();
      store.on('change', onChange);
      req.on('close', () => {
        clearInterval(heartbeat);
        store.off('change', onChange);
        openConnections -= 1;
      });
    }),
  );
  return router;
}
