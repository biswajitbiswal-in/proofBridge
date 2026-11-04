import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, '');
  Object.assign(process.env, env);

  return {
    plugins: [
      react(),
      {
        name: 'local-api-authority',
        configureServer(server) {
          server.middlewares.use('/api/authority', async (req, res) => {
            const { default: handler } = await import('./api/authority.ts');
            const vercelRes = Object.assign(res, {
              status(code: number) {
                res.statusCode = code;
                return vercelRes;
              },
              json(data: unknown) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              },
            });
            await handler(req as any, vercelRes as any);
          });
        },
      },
    ],
  };
});
