import { describe, expect, it } from 'vitest';
import {
  InvalidArgumentError,
  WEBHOOK_TEST_SIGNATURE_KEY,
  WebhookHeaders,
  computeWebhookSignature,
  constructWebhookEvent,
  verifyWebhookSignature,
} from '../src/index.js';

// Test vector published in the gateway documentation.
const DOC_SECRET = '12345678-1234-1234-1234-123456789012';
const DOC_BODY = '{"data":"this is test data"}';
const DOC_SIGNATURE = 'JacUiw_ztpEZJWvOhhKoHTLBf4b-aZv9n_0YmJJxltc';

const SECRET = 'live-secret';
const PREVIOUS = 'old-secret';
const eventBody =
  JSON.stringify({
    status: 'success',
    msg: 'success',
    type: 'transaction_create',
    account_type: 'merchant',
    account_type_id: 'm1',
    transaction_id: 't1',
    action_at: '2026-01-01T00:00:00Z',
    data: { id: 't1', status: 'pending_settlement' },
  }) + '\n';
const testBody = JSON.stringify({
  status: 'success',
  msg: 'success',
  type: 'test',
  account_type: 'merchant',
  account_type_id: 'm1',
  action_at: '2026-01-01T00:00:00Z',
});

describe('computeWebhookSignature', () => {
  it('matches the documented test vector', () => {
    expect(computeWebhookSignature(DOC_BODY, DOC_SECRET)).toBe(DOC_SIGNATURE);
    expect(computeWebhookSignature(Buffer.from(DOC_BODY), DOC_SECRET)).toBe(DOC_SIGNATURE);
  });

  it('requires a secret', () => {
    expect(() => computeWebhookSignature(DOC_BODY, '')).toThrow(InvalidArgumentError);
    expect(() => computeWebhookSignature(DOC_BODY, undefined as never)).toThrow(
      InvalidArgumentError,
    );
  });
});

describe('verifyWebhookSignature', () => {
  it('accepts valid signatures and rejects everything else', () => {
    expect(verifyWebhookSignature(DOC_BODY, DOC_SIGNATURE, DOC_SECRET)).toBe(true);
    expect(verifyWebhookSignature(DOC_BODY, DOC_SIGNATURE, 'wrong')).toBe(false);
    expect(verifyWebhookSignature(`${DOC_BODY}\n`, DOC_SIGNATURE, DOC_SECRET)).toBe(false);
    expect(verifyWebhookSignature(DOC_BODY, 'short', DOC_SECRET)).toBe(false);
    expect(verifyWebhookSignature(DOC_BODY, '', DOC_SECRET)).toBe(false);
    expect(verifyWebhookSignature(DOC_BODY, null, DOC_SECRET)).toBe(false);
    expect(verifyWebhookSignature(DOC_BODY, undefined, DOC_SECRET)).toBe(false);
  });
});

describe('constructWebhookEvent', () => {
  const sign = (body: string, secret: string) => computeWebhookSignature(body, secret);

  it('verifies with the current secret and returns event metadata', () => {
    const headers = new Headers({
      Signature: sign(eventBody, SECRET),
      'X-Webhook-Event-Id': 'evt-1',
    });
    const result = constructWebhookEvent(eventBody, headers, SECRET);
    expect(result.verifiedWith).toBe('secret');
    expect(result.eventId).toBe('evt-1');
    expect(result.replayOf).toBeUndefined();
    expect(result.event.type).toBe('transaction_create');
    expect(result.event.transaction_id).toBe('t1');
  });

  it('accepts plain header objects, array values and mixed case names', () => {
    const headers = {
      SIGNATURE: [sign(eventBody, SECRET), 'ignored'],
      'x-webhook-event-id': 'evt-2',
      'X-Webhook-Replay-Of': 'evt-1',
      other: undefined,
    };
    const result = constructWebhookEvent(Buffer.from(eventBody), headers, SECRET);
    expect(result.eventId).toBe('evt-2');
    expect(result.replayOf).toBe('evt-1');
  });

  it('supports secret rotation through Signature-Previous or Signature', () => {
    const viaPrevious = constructWebhookEvent(
      eventBody,
      { signature: sign(eventBody, 'unrelated'), 'signature-previous': sign(eventBody, PREVIOUS) },
      SECRET,
      { previousSecret: PREVIOUS },
    );
    expect(viaPrevious.verifiedWith).toBe('previousSecret');

    const viaSignature = constructWebhookEvent(
      eventBody,
      { signature: sign(eventBody, PREVIOUS) },
      SECRET,
      {
        previousSecret: PREVIOUS,
      },
    );
    expect(viaSignature.verifiedWith).toBe('previousSecret');
  });

  it('accepts test events signed with the shared test key', () => {
    const result = constructWebhookEvent(
      testBody,
      { signature: sign(testBody, WEBHOOK_TEST_SIGNATURE_KEY) },
      SECRET,
    );
    expect(result.verifiedWith).toBe('testKey');
    expect(result.event.type).toBe('test');
  });

  it('rejects test-key signatures when test events are disabled or the type is not test', () => {
    expect(() =>
      constructWebhookEvent(
        testBody,
        { signature: sign(testBody, WEBHOOK_TEST_SIGNATURE_KEY) },
        SECRET,
        { allowTestEvents: false },
      ),
    ).toThrow('Webhook signature verification failed');
    expect(() =>
      constructWebhookEvent(
        eventBody,
        { signature: sign(eventBody, WEBHOOK_TEST_SIGNATURE_KEY) },
        SECRET,
      ),
    ).toThrow(InvalidArgumentError);
  });

  it('rejects invalid signatures, including with a previous secret configured', () => {
    expect(() => constructWebhookEvent(eventBody, { signature: 'bad' }, SECRET)).toThrow(
      'Webhook signature verification failed',
    );
    expect(() =>
      constructWebhookEvent(eventBody, { signature: 'bad' }, SECRET, { previousSecret: PREVIOUS }),
    ).toThrow(InvalidArgumentError);
  });

  it('rejects missing signature headers and malformed bodies', () => {
    expect(() => constructWebhookEvent(eventBody, {}, SECRET)).toThrow('Missing Signature header');
    expect(() => constructWebhookEvent(eventBody, new Headers(), SECRET)).toThrow(
      'Missing Signature header',
    );
    expect(() => constructWebhookEvent('{not json', { signature: 'x' }, SECRET)).toThrow(
      'Webhook body is not valid JSON',
    );
    expect(() => constructWebhookEvent('"str"', { signature: 'x' }, SECRET)).toThrow(
      'missing the "type" field',
    );
    expect(() => constructWebhookEvent('null', { signature: 'x' }, SECRET)).toThrow(
      'missing the "type" field',
    );
    expect(() => constructWebhookEvent('{"type":5}', { signature: 'x' }, SECRET)).toThrow(
      'missing the "type" field',
    );
  });

  it('exports header name constants', () => {
    expect(WebhookHeaders.SIGNATURE).toBe('signature');
    expect(WebhookHeaders.EVENT_ID).toBe('x-webhook-event-id');
  });
});
