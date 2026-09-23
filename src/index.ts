/**
 * Payment gateway Node.js SDK.
 *
 * @packageDocumentation
 */
export { GatewayClient, DEFAULT_TIMEOUT_MS } from './client.js';
export type { GatewayClientOptions } from './client.js';
export type { FetchLike } from './http.js';
export {
  GatewayError,
  ConfigurationError,
  InvalidArgumentError,
  NetworkError,
  TimeoutError,
  RequestAbortedError,
  ApiError,
  BadRequestError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  ServerError,
} from './errors.js';
export type { ApiErrorDetails } from './errors.js';
export {
  ResponseCode,
  RESPONSE_CODE_DESCRIPTIONS,
  categorizeResponseCode,
  isApprovedResponseCode,
  describeResponseCode,
} from './response-codes.js';
export type { ResponseCodeCategory, ResponseCodeValue } from './response-codes.js';
export {
  WEBHOOK_TEST_SIGNATURE_KEY,
  WebhookHeaders,
  computeWebhookSignature,
  verifyWebhookSignature,
  constructWebhookEvent,
} from './webhooks.js';
export type {
  ConstructWebhookEventOptions,
  ConstructedWebhookEvent,
  RawBody,
  WebhookHeaderInput,
} from './webhooks.js';
export * from './resources/index.js';
export * from './types/index.js';
export { VERSION } from './version.js';
