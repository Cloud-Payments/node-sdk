import { vi } from 'vitest';
import { GatewayClient, type GatewayClientOptions } from '../src/index.js';
import type { FetchLike } from '../src/http.js';

export interface RecordedCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | FormData | undefined;
  signal: AbortSignal | undefined;
}

export interface MockResponseSpec {
  status?: number;
  body?: unknown;
  /** Raw text body (takes precedence over `body`). */
  text?: string;
  headers?: Record<string, string>;
}

export function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json', ...init.headers },
  });
}

export function textResponse(
  text: string,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(text, {
    status: init.status ?? 200,
    headers: { 'content-type': 'text/csv', ...init.headers },
  });
}

/** Build a fetch mock that returns the given responses in order and records every call. */
export function mockFetch(
  responses: Array<Response | Error | (() => Response | Promise<Response>)> = [],
) {
  const calls: RecordedCall[] = [];
  const queue = [...responses];
  const fetch = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({
      url,
      method: init.method ?? 'GET',
      headers: { ...(init.headers as Record<string, string>) },
      body: init.body as string | FormData | undefined,
      signal: init.signal ?? undefined,
    });
    const next = queue.shift();
    if (next === undefined) return jsonResponse({ status: 'success', msg: 'success', data: {} });
    if (next instanceof Error) throw next;
    if (typeof next === 'function') return next();
    return next;
  }) as unknown as FetchLike & ReturnType<typeof vi.fn>;
  return { fetch, calls };
}

export const BASE_URL = 'https://sandbox.example-gateway.test';
export const API_KEY = 'api_test_key_123';

export function createClient(
  responses: Array<Response | Error | (() => Response | Promise<Response>)> = [],
  overrides: Partial<GatewayClientOptions> = {},
) {
  const { fetch, calls } = mockFetch(responses);
  const client = new GatewayClient({ apiKey: API_KEY, baseUrl: BASE_URL, fetch, ...overrides });
  return { client, fetch, calls };
}

export function lastCall(calls: RecordedCall[]): RecordedCall {
  const call = calls[calls.length - 1];
  if (!call) throw new Error('no calls recorded');
  return call;
}

export function parseBody(call: RecordedCall): unknown {
  if (typeof call.body !== 'string') throw new Error('body is not a JSON string');
  return JSON.parse(call.body);
}

export function expectRequest(
  call: RecordedCall,
  expected: { method: string; path: string; body?: unknown; query?: Record<string, string> },
) {
  const url = new URL(call.url);
  if (call.method !== expected.method)
    throw new Error(`expected ${expected.method} got ${call.method}`);
  if (`${url.origin}${url.pathname}` !== `${BASE_URL}${expected.path}`) {
    throw new Error(`expected path ${expected.path} got ${url.pathname}`);
  }
  const query = Object.fromEntries(url.searchParams.entries());
  const expectedQuery = expected.query ?? {};
  if (JSON.stringify(query) !== JSON.stringify(expectedQuery)) {
    throw new Error(`expected query ${JSON.stringify(expectedQuery)} got ${JSON.stringify(query)}`);
  }
  if (expected.body === undefined) {
    if (call.body !== undefined) throw new Error(`expected no body, got ${typeof call.body}`);
  } else {
    const actual = parseBody(call);
    if (JSON.stringify(actual) !== JSON.stringify(expected.body)) {
      throw new Error(
        `expected body ${JSON.stringify(expected.body)} got ${JSON.stringify(actual)}`,
      );
    }
  }
}
