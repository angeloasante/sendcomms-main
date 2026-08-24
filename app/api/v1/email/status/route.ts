/**
 * Proxied to the FastAPI backend (see lib/backend-proxy.ts).
 * Original in-process implementation: _old-api/ (reference only, not built).
 */
import { proxyHandlers } from '@/lib/backend-proxy';

export const dynamic = 'force-dynamic';
export const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = proxyHandlers();
