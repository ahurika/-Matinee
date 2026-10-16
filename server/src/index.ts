import { createAdaptorServer } from '@hono/node-server';
import { app } from './app.js';
import { env } from './config/env.js';

const port = env.PORT;

const server = createAdaptorServer({
  fetch: app.fetch,
});

server.maxConnections = 4096;

server.listen(port, '0.0.0.0', 2048, () => {
  console.log(`Matinee API server running on http://localhost:${port} (env: ${env.NODE_ENV})`);
});

