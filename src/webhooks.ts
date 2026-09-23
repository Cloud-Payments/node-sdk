import { createHmac, timingSafeEqual } from 'node:crypto';
import { InvalidArgumentError } from './errors.js';
import type { WebhookEvent } from './types/webhooks.js';

/**
 * Shared key used by the gateway to sign `"type": "test"` deliveries (webhook create/update
 * probes and the test endpoint).
 */
export const WEBHOOK_TEST_SIGNATURE_KEY = '00000000-0000-4000-8000-000000000001';

/** Header names used by webhook deliveries. */
export const WebhookHeaders = {
  /** HMAC-SHA256 of the raw body, Base64 URL encoded without padding. */
  SIGNATURE: 'signature',
  /** Same signature computed with the previous secret during rotation overlap. */
  SIGNATURE_PREVIOUS: 'signature-previous',
  /** Stable event id; use for idempotency. */
  EVENT_ID: 'x-webhook-event-id',
  /** Present on replays; the original delivery's event id. */
  REPLAY_OF: 'x-webhook-replay-of',
} as const;

/** Raw request body as received. Never re-serialise JSON before verifying. */
export type RawBody = string | Uint8Array;

/**
 * Compute the webhook signature for a raw body: `base64url(HMAC-SHA256(secret, body))`.
 */
export function computeWebhookSignature(rawBody: RawBody, secret: string): string {
  if (typeof secret !== 'string' || secret === '') {
    throw new InvalidArgumentError('secret is required and must be a non-empty string');
  }
  return createHmac('sha256', secret).update(rawBody).digest('base64url');
}

/**
 * Verify a webhook signature using a constant-time comparison.
 *
 * @param rawBody   Exact bytes of the request body, including the trailing newline the gateway sends.
 * @param signature Value of the `Signature` (or `Signature-Previous`) header.
 * @param secret    Your webhook signing secret, or {@link WEBHOOK_TEST_SIGNATURE_KEY} for test events.
 */
export function verifyWebhookSignature(
  rawBody: RawBody,
  signature: string | null | undefined,
  secret: string,
): boolean {
  if (typeof signature !== 'string' || signature === '') return false;
  const expected = Buffer.from(computeWebhookSignature(rawBody, secret));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/** Headers accepted by {@link constructWebhookEvent}: a `Headers` instance or a plain object. */
export type WebhookHeaderInput = Headers | Record<string, string | string[] | undefined>;

/** Options for {@link constructWebhookEvent}. */
export interface ConstructWebhookEventOptions {
  /**
   * Previous signing secret, accepted during rotation overlap. When provided, the
   * `Signature-Previous` header (and, as a fallback, `Signature`) is also checked against it.
   */
  previousSecret?: string;
  /**
   * Accept `"type": "test"` deliveries signed with the shared test key. Defaults to `true`.
   * Set to `false` to require every delivery to be signed with your own secret.
   */
  allowTestEvents?: boolean;
}

/** Result of {@link constructWebhookEvent}. */
export interface ConstructedWebhookEvent<TEvent extends WebhookEvent = WebhookEvent> {
  /** Parsed event payload. */
  event: TEvent;
  /** Value of `X-Webhook-Event-Id`; store it to deduplicate deliveries. */
  eventId: string | undefined;
  /** Value of `X-Webhook-Replay-Of` when the delivery is a replay. */
  replayOf: string | undefined;
  /** Which key verified the delivery. */
  verifiedWith: 'secret' | 'previousSecret' | 'testKey';
}

/**
 * Verify and parse a webhook delivery.
 *
 * ```ts
 * app.post('/hooks/payments', express.raw({ type: 'application/json' }), (req, res) => {
 *   const { event, eventId } = constructWebhookEvent(req.body, req.headers, process.env.WEBHOOK_SECRET!);
 *   // ... deduplicate on eventId, then process event
 *   res.sendStatus(200);
 * });
 * ```
 *
 * @throws {InvalidArgumentError} when the signature does not match or the body is not valid JSON.
 */
export function constructWebhookEvent<TEvent extends WebhookEvent = WebhookEvent>(
  rawBody: RawBody,
  headers: WebhookHeaderInput,
  secret: string,
  options: ConstructWebhookEventOptions = {},
): ConstructedWebhookEvent<TEvent> {
  const signature = getHeader(headers, WebhookHeaders.SIGNATURE);
  const signaturePrevious = getHeader(headers, WebhookHeaders.SIGNATURE_PREVIOUS);
  const eventId = getHeader(headers, WebhookHeaders.EVENT_ID);
  const replayOf = getHeader(headers, WebhookHeaders.REPLAY_OF);

  if (!signature) {
    throw new InvalidArgumentError('Missing Signature header');
  }

  const event = parseEvent<TEvent>(rawBody);

  let verifiedWith: ConstructedWebhookEvent['verifiedWith'] | undefined;
  if (verifyWebhookSignature(rawBody, signature, secret)) {
    verifiedWith = 'secret';
  } else if (options.previousSecret !== undefined) {
    if (
      verifyWebhookSignature(rawBody, signaturePrevious, options.previousSecret) ||
      verifyWebhookSignature(rawBody, signature, options.previousSecret)
    ) {
      verifiedWith = 'previousSecret';
    }
  }
  if (
    verifiedWith === undefined &&
    (options.allowTestEvents ?? true) &&
    event.type === 'test' &&
    verifyWebhookSignature(rawBody, signature, WEBHOOK_TEST_SIGNATURE_KEY)
  ) {
    verifiedWith = 'testKey';
  }
  if (verifiedWith === undefined) {
    throw new InvalidArgumentError('Webhook signature verification failed');
  }

  return { event, eventId, replayOf, verifiedWith };
}

function parseEvent<TEvent extends WebhookEvent>(rawBody: RawBody): TEvent {
  const text = typeof rawBody === 'string' ? rawBody : Buffer.from(rawBody).toString('utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new InvalidArgumentError('Webhook body is not valid JSON', { cause: error });
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as { type?: unknown }).type !== 'string'
  ) {
    throw new InvalidArgumentError('Webhook body is missing the "type" field');
  }
  return parsed as TEvent;
}

function getHeader(headers: WebhookHeaderInput, name: string): string | undefined {
  if (headers instanceof Headers) return headers.get(name) ?? undefined;
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== lower) continue;
    if (Array.isArray(value)) return value[0];
    return value;
  }
  return undefined;
}
