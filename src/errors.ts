/**
 * Error hierarchy thrown by the SDK.
 *
 * ```
 * GatewayError
 * ├── ConfigurationError      – invalid client options
 * ├── InvalidArgumentError    – invalid method arguments (caught before any request is sent)
 * ├── NetworkError            – the request never produced an HTTP response
 * ├── TimeoutError            – the request exceeded the configured timeout
 * ├── RequestAbortedError     – the caller aborted the request via an AbortSignal
 * └── ApiError                – the gateway returned an error response
 *     ├── BadRequestError     – HTTP 400
 *     ├── AuthenticationError – HTTP 401 / 403
 *     ├── NotFoundError       – HTTP 404
 *     ├── RateLimitError      – HTTP 429
 *     └── ServerError         – HTTP 5xx
 * ```
 */

/** Base class for every error thrown by this SDK. */
export class GatewayError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
  }
}

/** Thrown when the client is constructed with invalid options. */
export class ConfigurationError extends GatewayError {}

/** Thrown when a method is called with invalid arguments (before any HTTP request is made). */
export class InvalidArgumentError extends GatewayError {}

/** Thrown when the request failed before an HTTP response was received (DNS, TLS, socket errors…). */
export class NetworkError extends GatewayError {}

/** Thrown when a request exceeded its timeout. */
export class TimeoutError extends GatewayError {
  /** The timeout that was exceeded, in milliseconds. */
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.timeoutMs = timeoutMs;
  }
}

/** Thrown when the caller aborts a request through an `AbortSignal`. */
export class RequestAbortedError extends GatewayError {
  constructor(reason?: unknown) {
    super('Request was aborted', { cause: reason });
  }
}

/** Details attached to an {@link ApiError}. */
export interface ApiErrorDetails {
  /** HTTP status code of the response. */
  httpStatus: number;
  /** HTTP method of the request. */
  method: string;
  /** Request path (without the base URL). */
  path: string;
  /** Raw response body (parsed JSON when possible, otherwise text). */
  body: unknown;
  /** Value of the `x-correlation-id` response header, when present. Include it in support requests. */
  correlationId?: string;
  /** Response headers. */
  headers: Headers;
}

/**
 * Thrown when the gateway returns an error response. This covers both non-2xx HTTP
 * responses and 2xx responses whose envelope `status` is not `"success"`.
 *
 * Note: a **declined** transaction is not an error. The gateway returns
 * `status: "success"` with `data.response === "declined"`; inspect the transaction instead.
 */
export class ApiError extends GatewayError {
  readonly httpStatus: number;
  readonly method: string;
  readonly path: string;
  readonly body: unknown;
  readonly correlationId: string | undefined;
  readonly headers: Headers;
  /** The `status` field of the response envelope (for example `"failed"`), when present. */
  readonly status: string | undefined;
  /** The `msg` field of the response envelope, when present. */
  readonly msg: string | undefined;

  constructor(message: string, details: ApiErrorDetails) {
    super(message);
    this.httpStatus = details.httpStatus;
    this.method = details.method;
    this.path = details.path;
    this.body = details.body;
    this.correlationId = details.correlationId;
    this.headers = details.headers;
    const envelope = asEnvelope(details.body);
    this.status = envelope?.status;
    this.msg = envelope?.msg;
  }

  /**
   * Build the most specific {@link ApiError} subclass for the given response.
   */
  static fromResponse(details: ApiErrorDetails): ApiError {
    const envelope = asEnvelope(details.body);
    const reason =
      envelope?.msg ??
      (typeof details.body === 'string' && details.body ? details.body : undefined);
    const message = `${details.method} ${details.path} failed with HTTP ${details.httpStatus}${reason ? `: ${reason}` : ''}`;
    const status = details.httpStatus;
    if (status === 400) return new BadRequestError(message, details);
    if (status === 401 || status === 403) return new AuthenticationError(message, details);
    if (status === 404) return new NotFoundError(message, details);
    if (status === 429) return new RateLimitError(message, details);
    if (status >= 500) return new ServerError(message, details);
    return new ApiError(message, details);
  }
}

/** HTTP 400 – the request was rejected as invalid (for example `bad request error: invalid Postal Code`). */
export class BadRequestError extends ApiError {}

/**
 * HTTP 401 / 403 – the API key was missing, invalid, a public (`pub_`) key, restricted by IP/URL,
 * or used against the wrong environment or account type.
 */
export class AuthenticationError extends ApiError {}

/** HTTP 404 – the resource does not exist. */
export class NotFoundError extends ApiError {}

/** HTTP 429 – too many requests. Honour `retryAfterMs` before retrying. */
export class RateLimitError extends ApiError {
  /** Suggested wait time derived from the `Retry-After` header, in milliseconds (when present). */
  get retryAfterMs(): number | undefined {
    return parseRetryAfter(this.headers.get('retry-after'));
  }
}

/** HTTP 5xx – the gateway failed to process the request. */
export class ServerError extends ApiError {}

/**
 * Parse a `Retry-After` header value (seconds or HTTP date) into milliseconds.
 * @internal
 */
export function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, date - Date.now());
}

function asEnvelope(body: unknown): { status?: string; msg?: string } | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  const record = body as Record<string, unknown>;
  const status = typeof record.status === 'string' ? record.status : undefined;
  const msg = typeof record.msg === 'string' ? record.msg : undefined;
  if (status === undefined && msg === undefined) return undefined;
  return { status, msg };
}
