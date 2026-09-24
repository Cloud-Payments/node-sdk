# Getting started

## 1. Get your credentials

Log in to your gateway control panel and open **Settings → API Keys**. You need:

- a **private API key** (`api_…`) for server-side calls – this is what the SDK uses;
- a **public key** (`pub_…`) only if you use the hosted Tokenizer or Wallet.js in the browser.

Never put the private key in client-side code, emails or support tickets. The SDK rejects
public keys so they cannot be used server-side by accident.

## 2. Pick the base URL

Each gateway deployment (including white-labelled ones) has its own sandbox and production
hosts. Pass the host of the environment you are targeting:

```ts
import { GatewayClient } from '@cloud-payments/node-sdk';

const gateway = new GatewayClient({
  apiKey: process.env.GATEWAY_API_KEY!,
  baseUrl: process.env.GATEWAY_BASE_URL!, // e.g. https://sandbox.your-gateway.com
});
```

Rules the SDK applies to `baseUrl`:

- `https` is required (`allowInsecureBaseUrl: true` permits `http` for local mocks);
- trailing slashes are removed, a path prefix such as `https://host/gateway` is kept;
- query strings and fragments are rejected.

Requests are sent to `baseUrl + '/api/...'`.

## 3. Make your first request

```ts
const { data: txn, correlation_id } = await gateway.transactions.sale({
  amount: 1299,
  payment_method: { card: { number: '4111111111111111', expiration_date: '12/30', cvc: '123' } },
});

console.log(txn.response, txn.response_code, correlation_id);
```

Amounts are always integers in the smallest currency unit (`1299` = $12.99).

## 4. Handle the outcome

There are three outcomes to distinguish:

| Outcome               | How it surfaces                                                                      |
| --------------------- | ------------------------------------------------------------------------------------ |
| Approved              | Resolves; `data.response === 'approved'`, `response_code` 100–199.                   |
| Declined              | Resolves; `data.response === 'declined'`, `response_code` 200–499.                   |
| Request / infra error | Rejects with a `GatewayError` subclass (see [error-handling.md](error-handling.md)). |

Always store `correlation_id` (from the `x-correlation-id` header) with your logs; support uses it
to find the request.

## 5. Move to production

1. Create a production API key in the production control panel.
2. Point `baseUrl` at the production host.
3. Configure webhooks for `transaction` and `settlement` events ([webhooks.md](webhooks.md)).
4. Keep the default 180 s timeout for transaction calls; authorizations can take over a minute.
5. Send an `idempotency_key` with every charge so retries can never double-charge.

## Request options

Every method accepts an optional final `RequestOptions` argument:

```ts
await gateway.vault.get('customer_id', {
  timeoutMs: 15_000, // override the client timeout
  signal: abortController.signal, // cancel from your side
  headers: { 'X-Request-Id': requestId }, // extra headers for this call
  maxRetries: 2, // override the client retry count
  idempotent: true, // mark a POST as safe to retry
});
```
