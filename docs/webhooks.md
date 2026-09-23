# Webhooks

The gateway POSTs JSON events to your HTTPS endpoint for `transaction`, `settlement` and
`cardsync` (account updater) families. Webhook configurations are created in the control panel or
through the partner API; this SDK helps you **verify and parse** deliveries and manage signing
secrets.

## Verifying deliveries

Every delivery carries:

| Header                | Purpose                                                          |
| --------------------- | ---------------------------------------------------------------- |
| `Signature`           | `base64url(HMAC-SHA256(secret, rawBody))` – no `=` padding.      |
| `Signature-Previous`  | Same, computed with the previous secret during rotation overlap. |
| `X-Webhook-Event-Id`  | Stable event id; use it for idempotency.                         |
| `X-Webhook-Replay-Of` | On replays, the original delivery's event id.                    |

Verify against the **raw bytes** of the body (it ends with a trailing newline). Never re-serialise
the JSON before verifying.

```ts
import { constructWebhookEvent, InvalidArgumentError } from '@cloud-payments/node-sdk';

// Express: app.post('/hooks', express.raw({ type: 'application/json' }), handler)
function handler(req, res) {
  try {
    const { event, eventId, replayOf, verifiedWith } = constructWebhookEvent(
      req.body, // Buffer
      req.headers,
      process.env.WEBHOOK_SECRET!,
      { previousSecret: process.env.WEBHOOK_PREVIOUS_SECRET }, // optional, during rotation
    );

    if (alreadyProcessed(eventId)) return res.sendStatus(200);
    enqueue(event); // do the work asynchronously
    res.sendStatus(200);
  } catch (error) {
    if (error instanceof InvalidArgumentError) return res.sendStatus(400); // bad signature / body
    res.sendStatus(500);
  }
}
```

`constructWebhookEvent`:

1. requires the `Signature` header;
2. parses the JSON body and requires a string `type`;
3. accepts the delivery if it verifies with `secret`, with `previousSecret` (either header), or,
   for `"type": "test"` probes, with the shared test key `00000000-0000-4000-8000-000000000001`
   (disable with `allowTestEvents: false`);
4. returns `{ event, eventId, replayOf, verifiedWith }`.

Lower-level helpers:

```ts
verifyWebhookSignature(rawBody, req.headers['signature'], secret); // boolean, constant-time
computeWebhookSignature(rawBody, secret); // string
```

## Responding

- Test probes (webhook create/update, test endpoint) must get exactly **HTTP 200**.
- Live deliveries accept 200–204. Anything else, a timeout (15 s) or a connection failure triggers
  retries with exponential backoff; repeated failures set the webhook to `auto_disabled`.
- Return 2xx for "already processed" cases – do not return 5xx.

## Event payloads

```ts
import type {
  TransactionWebhookEvent,
  SettlementBatchWebhookEvent,
} from '@cloud-payments/node-sdk';

switch (event.type) {
  case 'transaction_create':
  case 'transaction_update':
  case 'transaction_void':
  case 'transaction_capture':
  case 'transaction_settlement': {
    const txn = (event as TransactionWebhookEvent).data; // Transaction
    break;
  }
  case 'settlement_batch': {
    const batch = (event as SettlementBatchWebhookEvent).data;
    break;
  }
  case 'transaction_automatic_account_updater_vault_update':
  case 'test':
    break;
}
```

Notes:

- Invoice payments carry the invoice id in `data.order_id` / `data.po_number`.
- Subscription renewals are `transaction_create` events with `data.transaction_source === 'recurring'`
  and `data.subscription_id` set – there is no separate subscription event.
- Treat unknown fields in `data` as additive.

## Managing secrets (partner API)

```ts
await gateway.merchants.webhooks.test(merchantId, { webhook_id: webhookId }); // synchronous probe
await gateway.merchants.webhooks.rotateSecret(merchantId, webhookId, { overlap_hours: 24 });
await gateway.merchants.webhooks.expirePreviousSecret(merchantId, webhookId);
```

During the overlap window, deliveries include `Signature-Previous`; pass the old secret as
`previousSecret` until you have switched your configuration to the new one.
