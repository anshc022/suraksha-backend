import { createApp, attachRealtime } from './app';
import { ENV } from './config/env';
import { connectDB } from './config/db';

async function bootstrap() {
  await connectDB();
  const app = createApp();
  const { server } = attachRealtime(app);
  server.listen(ENV.PORT, () => {
    console.log(`Backend listening on :${ENV.PORT}`);
  });
}

bootstrap().catch(err => {
  console.error('Failed to start server', err);
  process.exit(1);
});
