import { app } from './app.js';
import { env } from './config/env.js';
import { disconnectPrisma } from './config/prisma.js';

const server = app.listen(env.PORT, (error?: Error) => {
  if (error) return;
  console.log(`Server berjalan di http://localhost:${env.PORT}`);
});

server.on('error', (error) => {
  console.error('Server gagal dijalankan.', error);
  process.exitCode = 1;
});

const shutdown = () => {
  server.close(() => { void disconnectPrisma().finally(() => process.exit(0)); });
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
