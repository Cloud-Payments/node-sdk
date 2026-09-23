import {
  ApiError,
  InvalidArgumentError,
  NetworkError,
  RateLimitError,
  RequestAbortedError,
  ServerError,
  TimeoutError,
} from './errors.js';
import type { ApiResponse, FileUpload, QueryParams, RequestOptions } from './types/common.js';

/** Minimal `fetch` signature accepted by the client (matches the global `fetch`). */
export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

/** @internal */
export interface HttpClientOptions {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
  fetch: FetchLike;
  headers: Record<string, string>;
  userAgent: string;
  /** Injectable sleep (used by tests). */
  sleep?: (ms: number) => Promise<void>;
}

/** @internal */
export type HttpMethod = 'GET' | 'POST' | 'DELETE';

/** @internal */
export interface RequestSpec {
  method: HttpMethod;
  path: string;
  query?: QueryParams;
  /** JSON body. */
  body?: unknown;
  /** Multipart body. Mutually exclusive with `body`. */
  form?: FormData;
  options?: RequestOptions;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Low-level HTTP transport used by every resource.
 *
 * Responsibilities: URL building, authentication header, JSON / multipart encoding, timeouts,
 * retries, response envelope validation and error mapping.
 *
 * @internal
 */
export class HttpClient {
  private readonly opts: HttpClientOptions;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(options: HttpClientOptions) {
    this.opts = options;
    this.sleep = options.sleep ?? defaultSleep;
  }

  get baseUrl(): string {
    return this.opts.baseUrl;
  }

  get<T>(path: string, query?: QueryParams, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.requestJson<T>({ method: 'GET', path, query, options });
  }

  post<T>(
    path: string,
    body?: unknown,
    query?: QueryParams,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.requestJson<T>({ method: 'POST', path, body, query, options });
  }

  delete<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.requestJson<T>({ method: 'DELETE', path, options });
  }

  /** Upload a single file as `multipart/form-data` under the field name `file`. */
  postFile<T>(path: string, file: FileUpload, options?: RequestOptions): Promise<ApiResponse<T>> {
    const form = new FormData();
    form.append('file', toBlob(file), file.fileName);
    return this.requestJson<T>({ method: 'POST', path, form, options });
  }

  /** Perform a request whose successful response body is plain text (for example a CSV download). */
  async getText(
    path: string,
    options?: RequestOptions,
  ): Promise<{ text: string; correlation_id?: string }> {
    const result = await this.send(
      { method: 'GET', path, options },
      'text/csv, text/plain, application/json',
    );
    return { text: result.text, correlation_id: result.correlationId };
  }

  private async requestJson<T>(spec: RequestSpec): Promise<ApiResponse<T>> {
    const result = await this.send(spec, 'application/json');
    if (isEnvelope(result.body)) {
      return {
        ...result.body,
        status: result.body.status,
        msg: typeof result.body.msg === 'string' ? result.body.msg : '',
        data: (result.body.data ?? null) as T,
        correlation_id: result.correlationId,
      };
    }
    // Some endpoints return a bare object instead of the standard envelope; normalise it.
    return {
      status: 'success',
      msg: '',
      data: result.body as T,
      correlation_id: result.correlationId,
    };
  }

  private async send(spec: RequestSpec, accept: string, attempt = 0): Promise<RawResult> {
    const options = spec.options ?? {};
    const maxRetries = options.maxRetries ?? this.opts.maxRetries;
    const idempotent = options.idempotent ?? isIdempotent(spec);

    try {
      const result = await this.attempt(spec, accept);
      if (!result.response.ok) throw this.toApiError(result);
      if (isEnvelope(result.body) && result.body.status !== 'success') {
        throw this.toApiError(result);
      }
      return result;
    } catch (error) {
      if (!idempotent || attempt >= maxRetries || !isRetryable(error)) throw error;
      await this.sleep(retryDelay(error, attempt, this.opts.retryDelayMs));
      return this.send(spec, accept, attempt + 1);
    }
  }

  private async attempt(spec: RequestSpec, accept: string): Promise<RawResult> {
    const options = spec.options ?? {};
    const url = buildUrl(this.opts.baseUrl, spec.path, spec.query);
    const headers: Record<string, string> = {
      Authorization: this.opts.apiKey,
      Accept: accept,
      'User-Agent': this.opts.userAgent,
      ...this.opts.headers,
      ...options.headers,
    };

    let bodyInit: BodyInit | undefined;
    if (spec.form) {
      bodyInit = spec.form;
    } else if (spec.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      bodyInit = JSON.stringify(spec.body);
    }

    const timeoutMs = options.timeoutMs ?? this.opts.timeoutMs;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new TimeoutError(timeoutMs)), timeoutMs);
    const callerSignal = options.signal;
    const onCallerAbort = (): void => controller.abort(callerSignal?.reason);
    if (callerSignal) {
      if (callerSignal.aborted) {
        clearTimeout(timer);
        throw new RequestAbortedError(callerSignal.reason);
      }
      callerSignal.addEventListener('abort', onCallerAbort, { once: true });
    }

    let response: Response;
    let text: string;
    try {
      response = await this.opts.fetch(url, {
        method: spec.method,
        headers,
        body: bodyInit,
        signal: controller.signal,
      });
      text = await response.text();
    } catch (error) {
      if (controller.signal.aborted) {
        const reason: unknown = controller.signal.reason;
        if (reason instanceof TimeoutError) throw reason;
        throw new RequestAbortedError(reason);
      }
      throw new NetworkError(`${spec.method} ${spec.path} failed: ${errorMessage(error)}`, {
        cause: error,
      });
    } finally {
      clearTimeout(timer);
      callerSignal?.removeEventListener('abort', onCallerAbort);
    }
    return {
      method: spec.method,
      path: spec.path,
      response,
      text,
      body: parseBody(text, response.headers.get('content-type')),
      correlationId: response.headers.get('x-correlation-id') ?? undefined,
    };
  }

  private toApiError(result: RawResult): ApiError {
    return ApiError.fromResponse({
      httpStatus: result.response.status,
      method: result.method,
      path: result.path,
      body: result.body,
      correlationId: result.correlationId,
      headers: result.response.headers,
    });
  }
}

interface RawResult {
  method: HttpMethod;
  path: string;
  response: Response;
  text: string;
  body: unknown;
  correlationId: string | undefined;
}

interface Envelope {
  status: string;
  msg?: unknown;
  data?: unknown;
}

function isEnvelope(body: unknown): body is Envelope {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return false;
  const record = body as Record<string, unknown>;
  return typeof record.status === 'string' && ('data' in record || 'msg' in record);
}

function parseBody(text: string, contentType: string | null): unknown {
  if (text.length === 0) return null;
  const trimmed = text.trimStart();
  const looksJson = trimmed.startsWith('{') || trimmed.startsWith('[');
  if (!looksJson && !(contentType ?? '').includes('json')) return text;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/** @internal */
export function buildUrl(baseUrl: string, path: string, query?: QueryParams): string {
  if (!path.startsWith('/'))
    throw new InvalidArgumentError(`Request path must start with "/": ${path}`);
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) params.set(key, String(value));
  }
  const qs = params.toString();
  return `${baseUrl}${path}${qs ? `?${qs}` : ''}`;
}

function isIdempotent(spec: RequestSpec): boolean {
  if (spec.method !== 'POST') return true;
  const body = spec.body;
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as Record<string, unknown>).idempotency_key === 'string' &&
    (body as Record<string, unknown>).idempotency_key !== ''
  );
}

function isRetryable(error: unknown): boolean {
  return (
    error instanceof NetworkError ||
    error instanceof TimeoutError ||
    error instanceof RateLimitError ||
    error instanceof ServerError
  );
}

function retryDelay(error: unknown, attempt: number, baseDelayMs: number): number {
  if (error instanceof RateLimitError && error.retryAfterMs !== undefined)
    return error.retryAfterMs;
  return baseDelayMs * 2 ** attempt;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    const cause = (error as { cause?: unknown }).cause;
    const causeMessage = cause instanceof Error ? ` (${cause.message})` : '';
    return `${error.message}${causeMessage}`;
  }
  return String(error);
}

function toBlob(file: FileUpload): Blob {
  const type = file.contentType ?? 'text/csv';
  if (file.content instanceof Blob) return file.content;
  return new Blob([file.content as BlobPart], { type });
}

/**
 * Validate and URL-encode a path parameter.
 * @internal
 */
export function pathParam(value: string, name: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new InvalidArgumentError(`${name} is required and must be a non-empty string`);
  }
  return encodeURIComponent(value);
}
