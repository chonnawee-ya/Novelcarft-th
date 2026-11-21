export const config = {
  runtime: 'edge',
};

const ALLOWED_PATH_SUFFIXES = ['/chat/completions', '/messages', '/models'];

const ALLOWED_HEADERS = [
  'authorization',
  'content-type',
  'x-api-key',
  'anthropic-version',
  'http-referer',
  'x-title',
  'accept',
];

function isBlockedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (
    lower === 'localhost' ||
    lower === '127.0.0.1' ||
    lower === '0.0.0.0' ||
    lower === '::1' ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal')
  ) {
    return true;
  }
  // Block private IPv4 ranges and cloud metadata IP (169.254.169.254)
  if (
    /^10\./.test(lower) ||
    /^127\./.test(lower) ||
    /^169\.254\./.test(lower) ||
    /^192\.168\./.test(lower) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(lower)
  ) {
    return true;
  }
  return false;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  const targetRaw = req.headers.get('x-target-url');
  if (!targetRaw) {
    return new Response(JSON.stringify({ error: 'Missing X-Target-URL header' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetRaw);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid X-Target-URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (parsedUrl.protocol !== 'https:') {
    return new Response(JSON.stringify({ error: 'Only HTTPS endpoints are allowed on production proxy' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (isBlockedHost(parsedUrl.hostname)) {
    return new Response(JSON.stringify({ error: 'Target host is not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const pathname = parsedUrl.pathname.replace(/\/+$/, '');
  const isAllowedPath = ALLOWED_PATH_SUFFIXES.some((suffix) => pathname.endsWith(suffix));
  if (!isAllowedPath) {
    return new Response(
      JSON.stringify({ error: 'Only AI API paths (/chat/completions, /messages, /models) are allowed' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  const forwardHeaders = new Headers();
  for (const h of ALLOWED_HEADERS) {
    const val = req.headers.get(h);
    if (val) forwardHeaders.set(h, val);
  }

  try {
    const method = req.method || 'GET';
    const body = method !== 'GET' && method !== 'HEAD' ? await req.arrayBuffer() : undefined;

    const upstream = await fetch(parsedUrl.toString(), {
      method,
      headers: forwardHeaders,
      body: body && body.byteLength > 0 ? body : undefined,
    });

    const responseHeaders = new Headers();
    const contentType = upstream.headers.get('content-type');
    if (contentType) responseHeaders.set('Content-Type', contentType);

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Upstream proxy request failed' }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
