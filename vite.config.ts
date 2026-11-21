import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function localCorsProxyMiddleware() {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (!req.url?.startsWith('/api/cors-proxy')) {
      return next();
    }

    const targetUrl = req.headers['x-target-url'];
    if (typeof targetUrl !== 'string' || !/^https?:\/\//i.test(targetUrl)) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Missing or invalid X-Target-URL header' }));
      return;
    }

    try {
      const forwardHeaders: Record<string, string> = {};
      const allowedHeaders = [
        'authorization',
        'content-type',
        'x-api-key',
        'anthropic-version',
        'http-referer',
        'x-title',
        'accept',
      ];
      for (const h of allowedHeaders) {
        const val = req.headers[h];
        if (typeof val === 'string') {
          forwardHeaders[h] = val;
        }
      }

      const method = req.method || 'GET';
      const body = method !== 'GET' && method !== 'HEAD' ? await readBody(req) : undefined;

      const upstream = await fetch(targetUrl, {
        method,
        headers: forwardHeaders,
        body: body && body.length > 0 ? new Uint8Array(body) : undefined,
      });

      res.statusCode = upstream.status;
      const contentType = upstream.headers.get('content-type');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }

      const arrayBuf = await upstream.arrayBuffer();
      res.end(Buffer.from(arrayBuf));
    } catch (err) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: err instanceof Error ? err.message : 'Proxy request failed',
        })
      );
    }
  };
}

function localCorsProxyPlugin(): Plugin {
  return {
    name: 'local-cors-proxy',
    configureServer(server) {
      server.middlewares.use(localCorsProxyMiddleware());
    },
    configurePreviewServer(server) {
      server.middlewares.use(localCorsProxyMiddleware());
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), localCorsProxyPlugin()],
});
