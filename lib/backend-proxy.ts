/**
 * Thin proxy from Next.js API routes to the FastAPI backend (Railway).
 *
 * The public URL (api.sendcomms.com/api/v1/...) stays on Vercel; the request is
 * forwarded verbatim (method, query, body, Authorization) to BACKEND_URL with
 * the same path, and the backend's response is returned as-is. Rate-limit and
 * idempotency headers pass straight through. Raw bodies are forwarded byte-for-byte
 * so provider webhook signatures (Stripe, Resend) still verify on the backend.
 *
 * Env:
 *   BACKEND_URL              e.g. https://sendcomms-api.up.railway.app
 *   INTERNAL_PROXY_SECRET    optional shared secret (backend enforces if set)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer',
  'transfer-encoding', 'upgrade', 'host', 'content-length',
]);

export async function proxyToBackend(request: NextRequest): Promise<NextResponse> {
  const base = process.env.BACKEND_URL;
  if (!base) {
    return NextResponse.json(
      { success: false, error: { code: 'BACKEND_NOT_CONFIGURED', message: 'API backend is not configured' } },
      { status: 503 }
    );
  }

  const url = new URL(request.nextUrl.pathname + request.nextUrl.search, base);

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value);
  });
  // Preserve the caller's identity and the public path for the request_attempts audit row
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
  if (ip) headers.set('x-forwarded-for', ip);
  headers.set('x-original-path', request.nextUrl.pathname);
  // Providers that sign the callback URL (Twilio) must be verified against the
  // host they actually posted to, not the backend's internal hostname.
  headers.set('x-forwarded-host', request.nextUrl.host);
  headers.set('x-forwarded-proto', request.nextUrl.protocol.replace(':', ''));
  if (process.env.INTERNAL_PROXY_SECRET) headers.set('x-internal-secret', process.env.INTERNAL_PROXY_SECRET);

  // Dashboard calls authenticate with the Supabase cookie session. Forward the
  // user's access token so the backend can verify it with Supabase Auth.
  if (!headers.has('authorization')) {
    try {
      const supabase = await createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) headers.set('authorization', `Bearer ${session.access_token}`);
    } catch {
      // no session (public endpoint or API-key caller) - fine
    }
  }

  const hasBody = !['GET', 'HEAD'].includes(request.method);
  const body = hasBody ? await request.arrayBuffer() : undefined;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: request.method,
      headers,
      body,
      redirect: 'manual',
      // Never cache API responses
      cache: 'no-store',
    });
  } catch (error) {
    console.error('[backend-proxy] upstream unreachable:', error);
    return NextResponse.json(
      { success: false, error: { code: 'BACKEND_UNAVAILABLE', message: 'API backend is temporarily unavailable. Please retry.' } },
      { status: 502 }
    );
  }

  const respHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase()) && key.toLowerCase() !== 'content-encoding') respHeaders.set(key, value);
  });

  return new NextResponse(upstream.body, { status: upstream.status, headers: respHeaders });
}

/** Route-module helper: `export const { GET, POST, DELETE } = proxyHandlers();` */
export function proxyHandlers() {
  const h = (req: NextRequest) => proxyToBackend(req);
  return { GET: h, POST: h, PUT: h, PATCH: h, DELETE: h, OPTIONS: h };
}
