import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import fastifyWebsocket from '@fastify/websocket';
import { ENV } from './config/env.js';
import { RealtimeService } from './services/realtime.service.js';
import { IngestionService } from './services/ingestion.service.js';
import { authRoutes } from './routes/auth.routes.js';
import { fixturesRoutes } from './routes/fixtures.routes.js';
import { betsRoutes } from './routes/bets.routes.js';
import { paymentsRoutes } from './routes/payments.routes.js';
import { adminRoutes } from './routes/admin.routes.js';

const app = Fastify({
  logger: {
    level: ENV.NODE_ENV === 'production' ? 'info' : 'debug',
  },
});

async function bootstrap() {
  await app.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(fastifyJwt, {
    secret: ENV.JWT_SECRET,
  });

  await app.register(fastifyWebsocket);

  // Initialize Real-time Redis Pipeline
  RealtimeService.init();

  // Low Latency WebSocket Gateway
  app.register(async function (fastify) {
    fastify.get('/realtime', { websocket: true }, (socket, req) => {
      RealtimeService.registerClient(socket);
    });
  });

  // API Routes
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(fixturesRoutes, { prefix: '/api/v1/fixtures' });
  await app.register(betsRoutes, { prefix: '/api/v1/bets' });
  await app.register(paymentsRoutes, { prefix: '/api/v1/payments' });
  await app.register(adminRoutes, { prefix: '/api/v1/admin' });

  // Health Probe
  app.get('/health', async () => ({ status: 'UP', timestamp: new Date().toISOString() }));

  // Launch Background Game Feed Ingestion
  IngestionService.startAutomatedEngine();

  try {
    await app.listen({ port: ENV.PORT, host: '0.0.0.0' });
    console.log(`BetPoake Backend Online: Port ${ENV.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

bootstrap();