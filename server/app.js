import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createRouter } from './routes/api.js';
import { createPaymentService } from './services/payments.js';
import { AppError } from './utils/errors.js';

export function createApp({ store, config, firebaseAuth, gateway }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  // Restrict credential-free demo controls to the local machine, including Host
  // validation to stop other websites from reaching them through DNS rebinding.
  if (config.mode === 'demo' || config.paymentMode === 'demo')
    app.use((req, res, next) => {
      const address = req.socket.remoteAddress;
      const localAddress = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address);
      const localHost = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(req.hostname);
      if (!localAddress || !localHost)
        return next(new AppError(403, 'Local demo access is restricted to loopback addresses.'));
      next();
    });
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || config.origins.includes(origin)) callback(null, true);
        else callback(new AppError(403, 'This browser origin is not allowed.'));
      },
      methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 1200,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { message: 'Too many requests. Please try again shortly.' },
    }),
  );
  app.use(express.json({ limit: '32kb' }));
  app.use(
    '/api',
    createRouter({
      store,
      config,
      firebaseAuth,
      payments: createPaymentService({ store, config, gateway }),
    }),
  );
  app.use((req, res, next) => next(new AppError(404, 'API route not found.')));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.type === 'entity.too.large')
      return res.status(413).json({ message: 'Request body is too large.' });
    if (error instanceof SyntaxError && error.status === 400)
      return res.status(400).json({ message: 'Request body must be valid JSON.' });
    const status = error.status || 500;
    if (status >= 500) console.error(`[api] ${req.method} ${req.path}: ${error.name || 'Error'}`);
    res.status(status).json({
      message:
        status >= 500
          ? 'The server could not complete this request. Please try again.'
          : error.message,
    });
  });
  return app;
}
