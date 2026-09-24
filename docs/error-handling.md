# Error handling

## Three outcomes

1. **The request succeeded** – the promise resolves with `{ status: 'success', msg, data, total_count?, correlation_id }`.
2. **The gateway processed a transaction but the issuer declined it** – the promise still
   resolves; look at `data.response` and `data.response_code`.
3. **Something failed** – the promise rejects with a `GatewayError` subclass.

## Error classes

```
GatewayError
├── ConfigurationError      invalid GatewayClient options
├── InvalidArgumentError    invalid method arguments, bad webhook signature / body
├── NetworkError            no HTTP response (DNS, TLS, socket) – `cause` holds the original error
├── TimeoutError            exceeded `timeoutMs` – `timeoutMs`
├── RequestAbortedError     you aborted via AbortSignal – `cause` is the abort reason
└── ApiError                gateway error response
    ├── BadRequestError     HTTP 400
    ├── AuthenticationError HTTP 401 / 403
    ├── NotFoundError       HTTP 404
    ├── RateLimitError      HTTP 429 – `retryAfterMs`
    └── ServerError         HTTP 5xx
```

`ApiError` exposes `httpStatus`, `method`, `path`, `status` and `msg` (from the response
envelope), `body` (parsed JSON or raw text), `headers` and `correlationId`. A 2xx response whose
envelope `status` is not `"success"` (for example downloading a batch that is not complete) is
also thrown as an `ApiError` with `httpStatus` 200.

```ts
try {
  await gateway.transactions.refund(id, { amount: 500 });
} catch (error) {
  if (error instanceof ApiError) {
    logger.error({ status: error.httpStatus, msg: error.msg, correlationId: error.correlationId });
  }
  throw error;
}
```

### Unauthorized responses

An `AuthenticationError` usually means one of:

- missing or deleted API key;
- a public key (`pub_`) used server-side;
- IP or URL restrictions on the key (`localhost` is never a valid URL);
- wrong account type (partner vs merchant) or wrong environment (sandbox vs production).

## Transaction response codes

```ts
import {
  ResponseCode,
  categorizeResponseCode,
  describeResponseCode,
  isApprovedResponseCode,
} from '@cloud-payments/node-sdk';

const { data } = await gateway.transactions.sale(request);

if (data.response_code === ResponseCode.PARTIAL_APPROVAL) {
  // data.amount_authorized < data.amount – capture the rest another way or void
}

categorizeResponseCode(data.response_code); // 'approved' | 'declined' | 'gateway_declined' | 'processor_error' | 'pending' | 'unknown'
describeResponseCode(202); // 'Insufficient funds'
isApprovedResponseCode(110); // true
```

| Range   | Meaning                                                                                         |
| ------- | ----------------------------------------------------------------------------------------------- |
| 100–199 | Approved (100), pending customer approval (101), partial approval (110).                        |
| 200–299 | Declined by the issuer (insufficient funds 202, expired card 223, invalid CVC 225, …).          |
| 300–399 | Gateway decline: generic 300, duplicate 301, rule engine 310, chargeback / fraud flags 320–323. |
| 400–499 | Processor error: configuration 410, communication 421, duplicate at processor 430, format 440.  |

AVS (`avs_response_code`) and CVV (`cvv_response_code`) results live on
`data.response_body.card`.

## Retries

Set `maxRetries` to retry network errors, timeouts, HTTP 429 and 5xx. Only idempotent requests
are retried: `GET`, `DELETE`, `POST` with an `idempotency_key`, or calls with
`{ idempotent: true }`. Backoff is exponential (`retryDelayMs × 2^attempt`) and `Retry-After` is
honoured on 429. A `RateLimitError` exposes `retryAfterMs` if you handle 429 yourself.
