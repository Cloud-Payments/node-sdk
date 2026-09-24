# Payment Gateway Node.js SDK

A typed, dependency-free Node.js SDK for the payment gateway REST API. It covers transactions,
the customer vault, recurring billing, invoices, products, carts, custom fields, file batches,
BIN lookup, settlement batches, terminals, the partner API (merchant boarding and fraud rules)
and webhook signature verification.

- **Works with any white-labelled gateway host.** You pass your own `baseUrl`.
- **API key authentication only.** Private (`api_…`) keys; public keys are rejected.
- **Zero runtime dependencies.** Uses the global `fetch` available in Node 22+.
- **TypeScript first.** Every request and response is typed, and field names match the gateway's
  JSON exactly so you can read the SDK and the gateway reference side by side.
- **100% unit test coverage**, ESM and CommonJS builds.

## Requirements

- Node.js 22 or newer.
- A private API key and the base URL of your gateway environment.

## Installation

```bash
npm install @cloud-payments/node-sdk
```

## Quick start

```ts
import { GatewayClient } from '@cloud-payments/node-sdk';

const gateway = new GatewayClient({
  apiKey: process.env.GATEWAY_API_KEY!, // api_…
  baseUrl: 'https://sandbox.your-gateway.com', // your white-labelled host
});

const { data: txn } = await gateway.transactions.sale({
  amount: 1299, // cents: $12.99
  payment_method: {
    card: { number: '4111111111111111', expiration_date: '12/30', cvc: '123' },
  },
  billing_address: { first_name: 'Jane', last_name: 'Doe', postal_code: '60601' },
});

if (txn.response === 'approved') {
  console.log('Approved', txn.id, txn.response_body.card?.auth_code);
} else {
  console.log('Declined', txn.response_code, txn.response_body.card?.processor_response_text);
}
```

CommonJS works too:

```js
const { GatewayClient } = require('@cloud-payments/node-sdk');
```

## Configuration

```ts
const gateway = new GatewayClient({
  apiKey: 'api_…', // required
  baseUrl: 'https://sandbox.your-gateway.com', // required
  timeoutMs: 180_000, // default: 180 s, as recommended for authorizations
  maxRetries: 0, // default: 0 (see "Retries")
  retryDelayMs: 500, // base delay for exponential backoff
  headers: { 'X-Tenant': 'acme' }, // extra headers on every request
  userAgent: 'my-app/1.0', // override the User-Agent header
  fetch: customFetch, // inject a fetch implementation (proxies, tests)
  allowInsecureBaseUrl: false, // set true to allow http:// for local development
});
```

| Option                 | Default                               | Notes                                                                                        |
| ---------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------- |
| `apiKey`               | –                                     | Private API key. Keys starting with `pub_` are rejected because they only work client-side.  |
| `baseUrl`              | –                                     | Your gateway host. Trailing slashes are removed; a path prefix is kept; `https` is required. |
| `timeoutMs`            | `180000`                              | Per-request timeout. Override per call with `{ timeoutMs }`.                                 |
| `maxRetries`           | `0`                                   | Retries for network errors, timeouts, HTTP 429 and 5xx on idempotent requests.               |
| `retryDelayMs`         | `500`                                 | Backoff is `retryDelayMs × 2^attempt`; `Retry-After` on 429 is honoured.                     |
| `headers`              | `{}`                                  | Merged into every request. Per-request headers win.                                          |
| `userAgent`            | `cloud-payments-node-sdk/<version> …` |                                                                                              |
| `fetch`                | `globalThis.fetch`                    | Any `fetch`-compatible function.                                                             |
| `allowInsecureBaseUrl` | `false`                               | Only for local development against a plain-HTTP mock.                                        |

### Environments

Use your sandbox host while developing and your production host when going live. Sandbox
transactions are simulated and never leave the platform; see [docs/testing.md](docs/testing.md)
for test cards and trigger values.

## Responses

Every method resolves with the gateway's response envelope plus the `x-correlation-id` header:

```ts
const response = await gateway.transactions.get('txn_id');
response.status; // 'success'
response.msg; // 'success'
response.data; // the typed payload (a Transaction here)
response.total_count; // present on search / list endpoints
response.correlation_id; // quote this when contacting support
```

Search and list methods return `ApiListResponse<T>` where `data` is an array and `total_count`
is always present.

## Errors

Failures are thrown as instances of `GatewayError` subclasses. Match on the class, not on
message strings:

```ts
import {
  ApiError,
  AuthenticationError,
  BadRequestError,
  NetworkError,
  TimeoutError,
} from '@cloud-payments/node-sdk';

try {
  await gateway.transactions.sale(request);
} catch (error) {
  if (error instanceof BadRequestError) {
    console.error('Invalid request:', error.msg, error.correlationId);
  } else if (error instanceof AuthenticationError) {
    console.error(
      'Check the API key, key type (api_ vs pub_), IP/URL restrictions and environment',
    );
  } else if (error instanceof TimeoutError) {
    console.error('No response in', error.timeoutMs, 'ms');
  } else if (error instanceof NetworkError) {
    console.error('Transport failure', error.cause);
  } else if (error instanceof ApiError) {
    console.error(error.httpStatus, error.status, error.msg, error.body);
  } else {
    throw error;
  }
}
```

| Class                  | When                                                                  |
| ---------------------- | --------------------------------------------------------------------- |
| `ConfigurationError`   | Invalid `GatewayClient` options.                                      |
| `InvalidArgumentError` | Invalid method arguments (empty ids, bad webhook signature, …).       |
| `NetworkError`         | The request never produced an HTTP response.                          |
| `TimeoutError`         | The request exceeded `timeoutMs`.                                     |
| `RequestAbortedError`  | You aborted the request through an `AbortSignal`.                     |
| `ApiError`             | Non-2xx response or a 2xx envelope whose `status` is not `"success"`. |
| `BadRequestError`      | HTTP 400 (validation problems such as `invalid Postal Code`).         |
| `AuthenticationError`  | HTTP 401 / 403.                                                       |
| `NotFoundError`        | HTTP 404.                                                             |
| `RateLimitError`       | HTTP 429; `retryAfterMs` is derived from `Retry-After`.               |
| `ServerError`          | HTTP 5xx.                                                             |

**A declined transaction is not an error.** The gateway answers with `status: "success"` and
`data.response === "declined"`. Inspect `data.response`, `data.response_code` and
`data.response_body.card.processor_response_text`. The `categorizeResponseCode` and
`describeResponseCode` helpers translate `response_code` values (100–199 approved, 200–299
declined, 300–399 gateway decline, 400–499 processor error). See
[docs/error-handling.md](docs/error-handling.md).

## Timeouts, retries and idempotency

- Authorizations can take more than a minute. The default timeout is 180 s; keep it unless your
  gateway tells you otherwise.
- Retries are opt-in (`maxRetries`) and only apply to requests that are safe to repeat:
  `GET`/`DELETE`, `POST` requests that carry an `idempotency_key`, or calls made with
  `{ idempotent: true }`.
- Send an `idempotency_key` (UUID) with every transaction so a retried request returns the
  original result instead of charging twice:

```ts
import { randomUUID } from 'node:crypto';

await gateway.transactions.sale({
  amount: 1299,
  idempotency_key: randomUUID(),
  payment_method: { token },
});
```

Every method accepts request options as its last argument:

```ts
await gateway.transactions.search(
  { limit: 100 },
  { timeoutMs: 30_000, signal: controller.signal, maxRetries: 2 },
);
```

## Resources

| Property                    | Endpoints                                                                             | Guide                                                  |
| --------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `gateway.transactions`      | sale, authorize, verify, credit, capture, void, refund, get, search, calculateAmounts | [docs/transactions.md](docs/transactions.md)           |
| `gateway.vault`             | customers, `vault.addresses`, `vault.paymentMethods`                                  | [docs/customer-vault.md](docs/customer-vault.md)       |
| `gateway.recurring`         | `addOns`, `discounts`, `plans`, `subscriptions`                                       | [docs/recurring-billing.md](docs/recurring-billing.md) |
| `gateway.invoices`          | get, search, create, update, delete, resend, pay                                      | [docs/invoices.md](docs/invoices.md)                   |
| `gateway.products`          | get, search, list, create, update, delete, batchUpload                                | [docs/other-resources.md](docs/other-resources.md)     |
| `gateway.carts`             | get, search, list, create, update, delete                                             | [docs/other-resources.md](docs/other-resources.md)     |
| `gateway.customFields`      | create, list, listForMerchant, get, update, delete                                    | [docs/other-resources.md](docs/other-resources.md)     |
| `gateway.fileBatches`       | upload, get, download                                                                 | [docs/other-resources.md](docs/other-resources.md)     |
| `gateway.binLookup`         | lookup                                                                                | [docs/other-resources.md](docs/other-resources.md)     |
| `gateway.settlementBatches` | search, settleTerminal                                                                | [docs/other-resources.md](docs/other-resources.md)     |
| `gateway.terminals`         | list, settle                                                                          | [docs/other-resources.md](docs/other-resources.md)     |
| `gateway.merchants`         | create, setStatus, createProcessor, createUser, createSimplePaymentPage, `webhooks.*` | [docs/partner-api.md](docs/partner-api.md)             |
| `gateway.rules`             | list, get, search, create, update, delete                                             | [docs/partner-api.md](docs/partner-api.md)             |

### Transactions

```ts
// Authorize now, capture later
const auth = await gateway.transactions.authorize({ amount: 5000, payment_method: { token } });
await gateway.transactions.capture(auth.data.id, { amount: 4500 });

// Void before settlement, refund after settlement
await gateway.transactions.void(auth.data.id);
await gateway.transactions.refund('settled_txn_id', { amount: 500 });

// Look up and search
const txn = await gateway.transactions.get('txn_id');
const recent = await gateway.transactions.search({
  status: { operator: '=', value: 'settled' },
  created_at: { start_date: '2026-01-01T00:00:00Z', end_date: '2026-01-31T23:59:59Z' },
  limit: 100,
});
```

### Customer vault

```ts
const customer = await gateway.vault.create(
  {
    description: 'Jane Doe',
    default_payment: { token }, // from the Tokenizer, or { card: {...} } / { ach: {...} }
    default_billing_address: { first_name: 'Jane', last_name: 'Doe', postal_code: '60601' },
  },
  { validate: true }, // optional $0 verification
);

const customerId = customer.data.id;
const paymentMethodId = customer.data.data.customer.defaults.payment_method_id;

await gateway.transactions.sale({
  amount: 2500,
  payment_method: { customer: { id: customerId, payment_method_id: paymentMethodId } },
});
```

### Recurring billing

```ts
const plan = await gateway.recurring.plans.create({
  name: 'Pro monthly',
  amount: 4900,
  billing_cycle_interval: 1,
  billing_frequency: 'monthly',
  billing_days: '1',
});

const subscription = await gateway.recurring.subscriptions.create({
  plan_id: plan.data.id,
  customer: { id: customerId },
  amount: 4900,
  billing_cycle_interval: 1,
  billing_frequency: 'monthly',
  billing_days: '1',
});

await gateway.recurring.subscriptions.pause(subscription.data.id);
await gateway.recurring.subscriptions.activate(subscription.data.id, '2026-03-01');
```

### Invoices

```ts
const invoice = await gateway.invoices.create({
  currency: 'USD',
  payable_to: {
    company: 'ACME',
    address_line_1: '1 Main St',
    city: 'Chicago',
    state: 'IL',
    postal_code: '60601',
    country: 'US',
  },
  bill_to: {
    first_name: 'Jane',
    last_name: 'Doe',
    address_line_1: '2 Oak Ave',
    city: 'Chicago',
    state: 'IL',
    postal_code: '60602',
    country: 'US',
    email: 'jane@example.com',
  },
  date_due: '2026-12-31T06:00:00.000Z',
  items: [{ name: 'Widget', unit_price: 10000, quantity: 1, status: 'pending' }],
  payment_methods: ['card'],
  card_processor_id: '',
  ach_processor_id: '',
  send_via: 'email',
  email_to: 'jane@example.com',
});

console.log('Pay at', invoice.data.hosted_url);
```

## Webhooks

Verify every delivery against the raw request body before acting on it:

```ts
import { createServer } from 'node:http';
import { constructWebhookEvent, InvalidArgumentError } from '@cloud-payments/node-sdk';

createServer((req, res) => {
  const chunks: Buffer[] = [];
  req.on('data', (chunk: Buffer) => chunks.push(chunk));
  req.on('end', () => {
    try {
      const { event, eventId } = constructWebhookEvent(
        Buffer.concat(chunks),
        req.headers,
        process.env.WEBHOOK_SECRET!,
        {
          previousSecret: process.env.WEBHOOK_PREVIOUS_SECRET, // during secret rotation
        },
      );
      // 1. deduplicate on eventId  2. enqueue event  3. respond quickly
      if (event.type === 'transaction_create') console.log('New transaction', event.transaction_id);
      res.writeHead(200).end();
    } catch (error) {
      res.writeHead(error instanceof InvalidArgumentError ? 400 : 500).end();
    }
  });
}).listen(3000);
```

`constructWebhookEvent` checks the `Signature` header (and `Signature-Previous` during rotation),
accepts `"type": "test"` probes signed with the shared test key, parses the JSON and returns the
`X-Webhook-Event-Id` for deduplication. Lower-level helpers `verifyWebhookSignature` and
`computeWebhookSignature` are also exported. See [docs/webhooks.md](docs/webhooks.md).

## TypeScript

All request and response types are exported from the package root:

```ts
import type {
  Transaction,
  TransactionRequest,
  Customer,
  Subscription,
  Invoice,
  WebhookEvent,
} from '@cloud-payments/node-sdk';
```

Enumerated fields such as `TransactionStatus` accept the documented literals (with editor
autocomplete) and also any other string, so new values added by the gateway never break your
build. Treat unknown response fields as additive.

## Documentation

- [Getting started](docs/getting-started.md)
- [Transactions](docs/transactions.md)
- [Customer vault](docs/customer-vault.md)
- [Recurring billing](docs/recurring-billing.md)
- [Invoices](docs/invoices.md)
- [Other resources](docs/other-resources.md) – products, carts, custom fields, file batches, BIN lookup, settlement batches, terminals
- [Partner API](docs/partner-api.md) – merchant boarding, processors, users, fraud rules, webhook management
- [Webhooks](docs/webhooks.md)
- [Error handling](docs/error-handling.md)
- [Testing in the sandbox](docs/testing.md)
- Runnable scripts in [`examples/`](examples/)
- Generate the API reference with `npm run docs:api` (output in `docs/api/`)

## Running the tests

Two suites ship with the SDK:

| Command                    | What it does                                                                                     | Needs a key |
| -------------------------- | ------------------------------------------------------------------------------------------------ | ----------- |
| `npm test`                 | Unit tests. `fetch` is mocked, every request and response shape is asserted, 100% coverage gate. | No          |
| `npm run test:integration` | Integration tests. Real requests against **your sandbox** for every resource.                    | Yes         |

To run the integration suite, provide your sandbox credentials either as environment variables or
in a git-ignored `.env` file (copy `.env.example`):

```bash
cp .env.example .env   # then edit GATEWAY_API_KEY and GATEWAY_BASE_URL
npm run test:integration
```

The suite creates and then deletes its own customers, plans, subscriptions, invoices, products,
carts and custom fields (all named with a unique run id), processes sandbox test-card
transactions, and skips endpoints your account does not have enabled. Partner endpoints run only
when `GATEWAY_PARTNER_API_KEY` is set. Without credentials every integration test is reported as
skipped, so `npm run test:all` is safe to run anywhere. See [docs/testing.md](docs/testing.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). The unit test suite enforces 100% line, branch, function
and statement coverage.

## License

[MIT](LICENSE)
