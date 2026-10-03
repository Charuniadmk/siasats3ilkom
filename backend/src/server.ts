import { app } from './app.js';
import { env } from './config/env.js';

const server = app.listen(env.PORT, () => {
  console.log(`Server berjalan di http://localhost:${env.PORT}`);
});

server.on('error', (error) => {
  console.error('Server gagal dijalankan.', error);
  process.exitCode = 1;
});

const shutdown = () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
