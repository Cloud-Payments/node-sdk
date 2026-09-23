import { describe, expect, it } from 'vitest';
import {
  ApiError,
  AuthenticationError,
  BadRequestError,
  ConfigurationError,
  GatewayError,
  InvalidArgumentError,
  NetworkError,
  NotFoundError,
  RateLimitError,
  RequestAbortedError,
  ServerError,
  TimeoutError,
} from '../src/index.js';
import { parseRetryAfter } from '../src/errors.js';

const base = { method: 'POST', path: '/api/transaction', headers: new Headers() };

describe('error hierarchy', () => {
  it('sets the name to the concrete class', () => {
    expect(new GatewayError('x').name).toBe('GatewayError');
    expect(new ConfigurationError('x').name).toBe('ConfigurationError');
    expect(new InvalidArgumentError('x').name).toBe('InvalidArgumentError');
    expect(new NetworkError('x').name).toBe('NetworkError');
    expect(new NetworkError('x', { cause: 'boom' }).cause).toBe('boom');
  });

  it('TimeoutError records the timeout', () => {
    const error = new TimeoutError(1500);
    expect(error.timeoutMs).toBe(1500);
    expect(error.message).toBe('Request timed out after 1500ms');
    expect(error).toBeInstanceOf(GatewayError);
  });

  it('RequestAbortedError keeps the abort reason as cause', () => {
    const error = new RequestAbortedError('user cancelled');
    expect(error.cause).toBe('user cancelled');
    expect(new RequestAbortedError().cause).toBeUndefined();
  });
});

describe('ApiError.fromResponse', () => {
  it('maps HTTP status codes to subclasses', () => {
    const make = (httpStatus: number) =>
      ApiError.fromResponse({ ...base, httpStatus, body: { status: 'failed', msg: 'nope' } });
    expect(make(400)).toBeInstanceOf(BadRequestError);
    expect(make(401)).toBeInstanceOf(AuthenticationError);
    expect(make(403)).toBeInstanceOf(AuthenticationError);
    expect(make(404)).toBeInstanceOf(NotFoundError);
    expect(make(429)).toBeInstanceOf(RateLimitError);
    expect(make(500)).toBeInstanceOf(ServerError);
    expect(make(503)).toBeInstanceOf(ServerError);
    const teapot = make(418);
    expect(teapot).toBeInstanceOf(ApiError);
    expect(teapot).not.toBeInstanceOf(BadRequestError);
  });

  it('builds a message from the envelope msg', () => {
    const error = ApiError.fromResponse({
      ...base,
      httpStatus: 400,
      body: { status: 'failed', msg: 'bad request error: invalid Postal Code' },
    });
    expect(error.message).toBe(
      'POST /api/transaction failed with HTTP 400: bad request error: invalid Postal Code',
    );
    expect(error.status).toBe('failed');
    expect(error.msg).toBe('bad request error: invalid Postal Code');
    expect(error.httpStatus).toBe(400);
    expect(error.method).toBe('POST');
    expect(error.path).toBe('/api/transaction');
    expect(error.body).toEqual({ status: 'failed', msg: 'bad request error: invalid Postal Code' });
  });

  it('uses a text body as the reason when no envelope is present', () => {
    const error = ApiError.fromResponse({ ...base, httpStatus: 502, body: 'Bad Gateway' });
    expect(error.message).toBe('POST /api/transaction failed with HTTP 502: Bad Gateway');
    expect(error.status).toBeUndefined();
    expect(error.msg).toBeUndefined();
  });

  it('omits the reason for empty or unrecognised bodies', () => {
    expect(ApiError.fromResponse({ ...base, httpStatus: 500, body: '' }).message).toBe(
      'POST /api/transaction failed with HTTP 500',
    );
    expect(ApiError.fromResponse({ ...base, httpStatus: 500, body: null }).message).toBe(
      'POST /api/transaction failed with HTTP 500',
    );
    expect(ApiError.fromResponse({ ...base, httpStatus: 500, body: { foo: 'bar' } }).message).toBe(
      'POST /api/transaction failed with HTTP 500',
    );
    expect(
      ApiError.fromResponse({ ...base, httpStatus: 500, body: { status: 1, msg: 2 } }).status,
    ).toBeUndefined();
  });

  it('captures a status without msg and vice versa', () => {
    const onlyStatus = ApiError.fromResponse({
      ...base,
      httpStatus: 500,
      body: { status: 'error' },
    });
    expect(onlyStatus.status).toBe('error');
    expect(onlyStatus.msg).toBeUndefined();
    const onlyMsg = ApiError.fromResponse({ ...base, httpStatus: 500, body: { msg: 'boom' } });
    expect(onlyMsg.status).toBeUndefined();
    expect(onlyMsg.msg).toBe('boom');
  });

  it('exposes the correlation id and headers', () => {
    const headers = new Headers({ 'x-correlation-id': 'corr-1' });
    const error = ApiError.fromResponse({
      ...base,
      httpStatus: 500,
      body: null,
      correlationId: 'corr-1',
      headers,
    });
    expect(error.correlationId).toBe('corr-1');
    expect(error.headers.get('x-correlation-id')).toBe('corr-1');
  });
});

describe('RateLimitError.retryAfterMs', () => {
  it('parses seconds', () => {
    const error = ApiError.fromResponse({
      ...base,
      httpStatus: 429,
      body: null,
      headers: new Headers({ 'retry-after': '2' }),
    }) as RateLimitError;
    expect(error.retryAfterMs).toBe(2000);
  });

  it('is undefined without the header', () => {
    const error = ApiError.fromResponse({ ...base, httpStatus: 429, body: null }) as RateLimitError;
    expect(error.retryAfterMs).toBeUndefined();
  });
});

describe('parseRetryAfter', () => {
  it('handles null, numbers, dates and garbage', () => {
    expect(parseRetryAfter(null)).toBeUndefined();
    expect(parseRetryAfter('')).toBeUndefined();
    expect(parseRetryAfter('1.5')).toBe(1500);
    expect(parseRetryAfter('-3')).toBe(0);
    const future = new Date(Date.now() + 5000).toUTCString();
    const ms = parseRetryAfter(future);
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(5000);
    const past = new Date(Date.now() - 5000).toUTCString();
    expect(parseRetryAfter(past)).toBe(0);
    expect(parseRetryAfter('not a date')).toBeUndefined();
  });
});
