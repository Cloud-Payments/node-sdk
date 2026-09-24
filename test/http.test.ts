import { describe, expect, it, vi } from 'vitest';
import { HttpClient, buildUrl, pathParam, type HttpClientOptions } from '../src/http.js';
import {
  ApiError,
  AuthenticationError,
  BadRequestError,
  InvalidArgumentError,
  NetworkError,
  RateLimitError,
  RequestAbortedError,
  ServerError,
  TimeoutError,
} from '../src/index.js';
import { API_KEY, BASE_URL, jsonResponse, lastCall, mockFetch, textResponse } from './helpers.js';

function makeClient(
  responses: Parameters<typeof mockFetch>[0] = [],
  overrides: Partial<HttpClientOptions> = {},
) {
  const { fetch, calls } = mockFetch(responses);
  const sleep = vi.fn(async () => {});
  const http = new HttpClient({
    apiKey: API_KEY,
    baseUrl: BASE_URL,
    timeoutMs: 5000,
    maxRetries: 0,
    retryDelayMs: 100,
    fetch,
    headers: {},
    userAgent: 'test-agent/1.0',
    sleep,
    ...overrides,
  });
  return { http, fetch, calls, sleep };
}

describe('buildUrl', () => {
  it('joins base url and path and encodes query params', () => {
    expect(buildUrl(BASE_URL, '/api/x')).toBe(`${BASE_URL}/api/x`);
    expect(buildUrl(BASE_URL, '/api/x', { a: 'b c', n: 1, t: true, f: false, u: undefined })).toBe(
      `${BASE_URL}/api/x?a=b+c&n=1&t=true&f=false`,
    );
  });

  it('rejects relative paths', () => {
    expect(() => buildUrl(BASE_URL, 'api/x')).toThrow(InvalidArgumentError);
  });
});

describe('pathParam', () => {
  it('encodes valid values', () => {
    expect(pathParam('abc', 'id')).toBe('abc');
    expect(pathParam('a b/c', 'id')).toBe('a%20b%2Fc');
  });

  it('rejects empty, whitespace and non-string values', () => {
    expect(() => pathParam('', 'transactionId')).toThrow(/transactionId is required/);
    expect(() => pathParam('   ', 'id')).toThrow(InvalidArgumentError);
    expect(() => pathParam(undefined as unknown as string, 'id')).toThrow(InvalidArgumentError);
    expect(() => pathParam(123 as unknown as string, 'id')).toThrow(InvalidArgumentError);
  });
});

describe('HttpClient requests', () => {
  it('sends auth, accept and user-agent headers on GET without a body', async () => {
    const { http, calls } = makeClient([
      jsonResponse({ status: 'success', msg: 'ok', data: { id: '1' } }),
    ]);
    const response = await http.get<{ id: string }>('/api/thing', { limit: 5 });
    const call = lastCall(calls);
    expect(call.method).toBe('GET');
    expect(call.url).toBe(`${BASE_URL}/api/thing?limit=5`);
    expect(call.headers).toEqual({
      Authorization: API_KEY,
      Accept: 'application/json',
      'User-Agent': 'test-agent/1.0',
    });
    expect(call.body).toBeUndefined();
    expect(response).toEqual({
      status: 'success',
      msg: 'ok',
      data: { id: '1' },
      correlation_id: undefined,
    });
  });

  it('serialises JSON bodies on POST and sets content-type', async () => {
    const { http, calls } = makeClient();
    await http.post('/api/thing', { a: 1 });
    const call = lastCall(calls);
    expect(call.method).toBe('POST');
    expect(call.headers['Content-Type']).toBe('application/json');
    expect(call.body).toBe('{"a":1}');
  });

  it('sends POST without a body when none is given', async () => {
    const { http, calls } = makeClient();
    await http.post('/api/thing');
    expect(lastCall(calls).body).toBeUndefined();
    expect(lastCall(calls).headers['Content-Type']).toBeUndefined();
  });

  it('sends DELETE requests', async () => {
    const { http, calls } = makeClient([jsonResponse({ status: 'success', msg: 'success' })]);
    const response = await http.delete('/api/thing/1');
    expect(lastCall(calls).method).toBe('DELETE');
    expect(response.data).toBeNull();
  });

  it('merges client and per-request headers (request wins)', async () => {
    const { http, calls } = makeClient([], { headers: { 'X-Client': 'a', 'X-Both': 'client' } });
    await http.get('/api/thing', undefined, { headers: { 'X-Req': 'b', 'X-Both': 'request' } });
    const headers = lastCall(calls).headers;
    expect(headers['X-Client']).toBe('a');
    expect(headers['X-Req']).toBe('b');
    expect(headers['X-Both']).toBe('request');
  });

  it('captures the correlation id header', async () => {
    const { http } = makeClient([
      jsonResponse(
        { status: 'success', msg: 'ok', data: 1 },
        { headers: { 'x-correlation-id': 'corr-42' } },
      ),
    ]);
    const response = await http.get('/api/thing');
    expect(response.correlation_id).toBe('corr-42');
  });

  it('keeps extra envelope fields such as total_count and defaults msg', async () => {
    const { http } = makeClient([
      jsonResponse({ status: 'success', data: [1, 2], total_count: 2 }),
    ]);
    const response = await http.post<number[]>('/api/search', {});
    expect(response.msg).toBe('');
    expect(response.total_count).toBe(2);
    expect(response.data).toEqual([1, 2]);
  });

  it('normalises envelope with a non-string msg', async () => {
    const { http } = makeClient([jsonResponse({ status: 'success', msg: null, data: 1 })]);
    const response = await http.get('/api/thing');
    expect(response.msg).toBe('');
  });

  it('wraps bare object responses in an envelope', async () => {
    const { http } = makeClient([jsonResponse({ id: 'batch', status: 'pending', num_lines: 1 })]);
    const response = await http.get<{ id: string }>('/api/filebatch/batch');
    expect(response.status).toBe('success');
    expect(response.data).toEqual({ id: 'batch', status: 'pending', num_lines: 1 });
  });

  it('wraps array and empty responses', async () => {
    const { http } = makeClient([jsonResponse([1, 2]), new Response('', { status: 200 })]);
    expect((await http.get('/api/a')).data).toEqual([1, 2]);
    expect((await http.get('/api/b')).data).toBeNull();
  });

  it('falls back to text when a JSON content type is not parseable', async () => {
    const { http } = makeClient([
      new Response('not json', { status: 200, headers: { 'content-type': 'application/json' } }),
    ]);
    const response = await http.get('/api/thing');
    expect(response.data).toBe('not json');
  });

  it('keeps plain text bodies as text', async () => {
    const { http } = makeClient([
      new Response('hello', { status: 200, headers: { 'content-type': 'text/plain' } }),
    ]);
    expect((await http.get('/api/thing')).data).toBe('hello');
  });

  it('keeps non-JSON text when no content type header is present', async () => {
    const noContentType = {
      ok: true,
      status: 200,
      headers: new Headers(),
      text: () => Promise.resolve('plain text'),
    } as unknown as Response;
    const { http } = makeClient([() => noContentType]);
    expect((await http.get('/api/thing')).data).toBe('plain text');
  });

  it('parses JSON-looking bodies even without a content type', async () => {
    const { http } = makeClient([
      new Response(' {"status":"success","msg":"ok","data":7}', { status: 200 }),
    ]);
    expect((await http.get('/api/thing')).data).toBe(7);
  });
});

describe('HttpClient error mapping', () => {
  it('throws typed errors for non-2xx responses', async () => {
    const { http } = makeClient([
      jsonResponse(
        { status: 'failed', msg: 'bad request error: invalid Postal Code' },
        { status: 400, headers: { 'x-correlation-id': 'c1' } },
      ),
      jsonResponse({ status: 'failed', msg: 'unauthorized' }, { status: 401 }),
      new Response('Service Unavailable', {
        status: 503,
        headers: { 'content-type': 'text/plain' },
      }),
    ]);
    const first = await http.post('/api/transaction', {}).catch((e: unknown) => e);
    expect(first).toBeInstanceOf(BadRequestError);
    expect((first as BadRequestError).correlationId).toBe('c1');
    expect((first as BadRequestError).msg).toBe('bad request error: invalid Postal Code');
    await expect(http.get('/api/transaction/1')).rejects.toBeInstanceOf(AuthenticationError);
    const third = await http.get('/api/transaction/1').catch((e: unknown) => e);
    expect(third).toBeInstanceOf(ServerError);
    expect((third as ServerError).body).toBe('Service Unavailable');
  });

  it('throws ApiError for 2xx envelopes whose status is not success', async () => {
    const { http } = makeClient([
      jsonResponse({ status: 'failed', msg: 'batch is not in completed status', data: null }),
    ]);
    const error = await http.get('/api/filebatch/1/download').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).httpStatus).toBe(200);
    expect((error as ApiError).status).toBe('failed');
  });

  it('does not treat a bare object with a status field as an error envelope', async () => {
    const { http } = makeClient([jsonResponse({ id: 'b', status: 'failed', num_lines: 3 })]);
    const response = await http.get<{ status: string }>('/api/filebatch/b');
    expect(response.data.status).toBe('failed');
  });
});

describe('HttpClient text responses', () => {
  it('returns text bodies with the correlation id', async () => {
    const { http, calls } = makeClient([
      textResponse('"id","type"\n"1","sale"\n', { headers: { 'x-correlation-id': 'c9' } }),
    ]);
    const result = await http.getText('/api/filebatch/1/download');
    expect(result).toEqual({ text: '"id","type"\n"1","sale"\n', correlation_id: 'c9' });
    expect(lastCall(calls).headers.Accept).toBe('text/csv, text/plain, application/json');
  });

  it('throws for non-2xx and failed envelopes', async () => {
    const { http } = makeClient([
      jsonResponse(
        { status: 'failed', msg: 'batch is not in completed status', data: null },
        { status: 400 },
      ),
      jsonResponse({ status: 'failed', msg: 'batch is not in completed status', data: null }),
      jsonResponse({ status: 'success', msg: 'ok', data: null }),
    ]);
    await expect(http.getText('/api/x')).rejects.toBeInstanceOf(BadRequestError);
    await expect(http.getText('/api/x')).rejects.toBeInstanceOf(ApiError);
    expect((await http.getText('/api/x')).text).toContain('"status":"success"');
  });
});

describe('HttpClient file uploads', () => {
  it('sends multipart form data without a manual content type', async () => {
    const { http, calls } = makeClient([
      jsonResponse({ status: 'success', msg: 'ok', data: { id: 'b1' } }),
    ]);
    const response = await http.postFile<{ id: string }>('/api/filebatch', {
      content: '"a","b"\n',
      fileName: 'batch.csv',
    });
    const call = lastCall(calls);
    expect(call.headers['Content-Type']).toBeUndefined();
    expect(call.body).toBeInstanceOf(FormData);
    const file = (call.body as FormData).get('file') as File;
    expect(file.name).toBe('batch.csv');
    expect(file.type).toBe('text/csv');
    expect(await file.text()).toBe('"a","b"\n');
    expect(response.data.id).toBe('b1');
  });

  it('accepts binary content, custom content types and existing blobs', async () => {
    const { http, calls } = makeClient();
    await http.postFile('/api/filebatch', {
      content: new TextEncoder().encode('x,y'),
      fileName: 'bin.csv',
      contentType: 'text/plain',
    });
    let file = (lastCall(calls).body as FormData).get('file') as File;
    expect(file.type).toBe('text/plain');
    expect(await file.text()).toBe('x,y');

    await http.postFile('/api/filebatch', { content: new ArrayBuffer(2), fileName: 'buf.csv' });
    file = (lastCall(calls).body as FormData).get('file') as File;
    expect(file.size).toBe(2);

    const blob = new Blob(['z'], { type: 'application/octet-stream' });
    await http.postFile('/api/filebatch', { content: blob, fileName: 'blob.csv' });
    file = (lastCall(calls).body as FormData).get('file') as File;
    expect(file.type).toBe('application/octet-stream');
  });
});

describe('HttpClient timeouts and aborts', () => {
  it('throws TimeoutError when the request exceeds the timeout', async () => {
    const hanging = () =>
      new Promise<Response>((_resolve, reject) => {
        /* the fetch mock passes the signal in `calls`; reject when aborted */
        setTimeout(() => reject(new Error('should have been aborted')), 1000);
      });
    const { fetch, calls } = mockFetch([]);
    const fetchWithAbort = vi.fn(async (url: string, init: RequestInit) => {
      await fetch(url, init);
      return new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener('abort', () =>
          reject(new DOMException('aborted', 'AbortError')),
        );
      });
    });
    void hanging;
    const http = new HttpClient({
      apiKey: API_KEY,
      baseUrl: BASE_URL,
      timeoutMs: 20,
      maxRetries: 0,
      retryDelayMs: 1,
      fetch: fetchWithAbort,
      headers: {},
      userAgent: 'ua',
    });
    const error = await http.get('/api/slow').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TimeoutError);
    expect((error as TimeoutError).timeoutMs).toBe(20);
    expect(calls).toHaveLength(1);
  });

  it('honours a per-request timeout override', async () => {
    const fetchWithAbort = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const { http } = makeClient([], { fetch: fetchWithAbort, timeoutMs: 60_000 });
    const error = await http
      .get('/api/slow', undefined, { timeoutMs: 10 })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TimeoutError);
    expect((error as TimeoutError).timeoutMs).toBe(10);
  });

  it('rejects immediately when the caller signal is already aborted', async () => {
    const { http, fetch } = makeClient();
    const controller = new AbortController();
    controller.abort('cancelled');
    const error = await http
      .get('/api/x', undefined, { signal: controller.signal })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RequestAbortedError);
    expect((error as RequestAbortedError).cause).toBe('cancelled');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('propagates caller aborts that happen mid-flight', async () => {
    const controller = new AbortController();
    const fetchWithAbort = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
          setTimeout(() => controller.abort(new Error('user cancelled')), 5);
        }),
    );
    const { http } = makeClient([], { fetch: fetchWithAbort });
    const error = await http
      .get('/api/x', undefined, { signal: controller.signal })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RequestAbortedError);
    expect(((error as RequestAbortedError).cause as Error).message).toBe('user cancelled');
  });

  it('wraps transport failures in NetworkError', async () => {
    const cause = new Error('connect ECONNREFUSED');
    const { http } = makeClient([new TypeError('fetch failed', { cause })]);
    const error = await http.get('/api/x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(NetworkError);
    expect((error as NetworkError).message).toBe(
      'GET /api/x failed: fetch failed (connect ECONNREFUSED)',
    );
    expect((error as NetworkError).cause).toBeInstanceOf(TypeError);
  });

  it('handles non-Error rejections and body read failures', async () => {
    const { fetch } = mockFetch([]);
    const weird = vi.fn(async (url: string, init: RequestInit) => {
      await fetch(url, init);
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw 'string failure';
    });
    const { http } = makeClient([], { fetch: weird });
    const error = await http.get('/api/x').catch((e: unknown) => e);
    expect((error as NetworkError).message).toBe('GET /api/x failed: string failure');

    const badBody = {
      ok: true,
      status: 200,
      headers: new Headers(),
      text: () => Promise.reject(new Error('stream closed')),
    } as unknown as Response;
    const { http: http2 } = makeClient([() => badBody]);
    await expect(http2.get('/api/x')).rejects.toBeInstanceOf(NetworkError);
  });
});

describe('HttpClient retries', () => {
  const failed = (status: number, headers?: Record<string, string>) =>
    jsonResponse({ status: 'failed', msg: 'try again' }, { status, headers });
  const ok = () => jsonResponse({ status: 'success', msg: 'ok', data: 'done' });

  it('retries GET requests on network errors with exponential backoff', async () => {
    const { http, calls, sleep } = makeClient([new Error('boom'), new Error('boom'), ok()], {
      maxRetries: 2,
    });
    const response = await http.get('/api/x');
    expect(response.data).toBe('done');
    expect(calls).toHaveLength(3);
    expect(sleep.mock.calls).toEqual([[100], [200]]);
  });

  it('gives up after maxRetries and rethrows the last error', async () => {
    const { http, calls } = makeClient([failed(500), failed(500), failed(500)], { maxRetries: 2 });
    await expect(http.get('/api/x')).rejects.toBeInstanceOf(ServerError);
    expect(calls).toHaveLength(3);
  });

  it('does not retry non-idempotent POST requests', async () => {
    const { http, calls } = makeClient([failed(500), ok()], { maxRetries: 3 });
    await expect(http.post('/api/transaction', { amount: 1 })).rejects.toBeInstanceOf(ServerError);
    expect(calls).toHaveLength(1);
  });

  it('retries POST requests that carry an idempotency key', async () => {
    const { http, calls } = makeClient([new Error('boom'), ok()], { maxRetries: 1 });
    await http.post('/api/transaction', { amount: 1, idempotency_key: 'uuid' });
    expect(calls).toHaveLength(2);
  });

  it('treats an empty or non-string idempotency key as non-idempotent', async () => {
    const { http, calls } = makeClient([failed(503), failed(503)], { maxRetries: 2 });
    await expect(http.post('/api/transaction', { idempotency_key: '' })).rejects.toBeInstanceOf(
      ServerError,
    );
    await expect(http.post('/api/transaction', { idempotency_key: 5 })).rejects.toBeInstanceOf(
      ServerError,
    );
    expect(calls).toHaveLength(2);
  });

  it('respects the idempotent request option in both directions', async () => {
    const { http, calls } = makeClient([failed(500), ok(), failed(500)], { maxRetries: 1 });
    await http.post('/api/transaction', { amount: 1 }, undefined, { idempotent: true });
    expect(calls).toHaveLength(2);
    await expect(http.get('/api/x', undefined, { idempotent: false })).rejects.toBeInstanceOf(
      ServerError,
    );
    expect(calls).toHaveLength(3);
  });

  it('does not retry client errors', async () => {
    const { http, calls, sleep } = makeClient([failed(400)], { maxRetries: 3 });
    await expect(http.get('/api/x')).rejects.toBeInstanceOf(BadRequestError);
    expect(calls).toHaveLength(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('honours Retry-After on 429 and falls back to backoff without it', async () => {
    const { http, sleep } = makeClient([failed(429, { 'retry-after': '3' }), failed(429), ok()], {
      maxRetries: 2,
    });
    await http.get('/api/x');
    expect(sleep.mock.calls).toEqual([[3000], [200]]);
  });

  it('retries timeouts and honours per-request maxRetries', async () => {
    const fetchWithAbort = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );
    const { http, sleep } = makeClient([], {
      fetch: fetchWithAbort,
      timeoutMs: 5,
      maxRetries: 0,
    });
    await expect(http.get('/api/x', undefined, { maxRetries: 2 })).rejects.toBeInstanceOf(
      TimeoutError,
    );
    expect(fetchWithAbort).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('uses a real timer when no sleep function is injected', async () => {
    const { fetch } = mockFetch([new Error('boom'), ok()]);
    const http = new HttpClient({
      apiKey: API_KEY,
      baseUrl: BASE_URL,
      timeoutMs: 1000,
      maxRetries: 1,
      retryDelayMs: 1,
      fetch,
      headers: {},
      userAgent: 'ua',
    });
    const response = await http.get('/api/x');
    expect(response.data).toBe('done');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('exposes RateLimitError details on the final failure', async () => {
    const { http } = makeClient([failed(429, { 'retry-after': '1' })]);
    const error = await http.get('/api/x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RateLimitError);
    expect((error as RateLimitError).retryAfterMs).toBe(1000);
  });
});
