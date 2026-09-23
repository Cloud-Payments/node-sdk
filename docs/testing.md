# Testing in the sandbox

Point `baseUrl` at your sandbox host. Sandbox transactions are simulated and never leave the
platform. Test values only work in the sandbox; production rejects them.

## Cards

Any card number not listed as a trigger is approved. Any future expiration date (for example
`12/30`) and any CVV work.

| Card               | Brand / type      | Surchargeable | Notes                 |
| ------------------ | ----------------- | ------------- | --------------------- |
| `4111111111111111` | Visa debit        | No            | Default approval card |
| `4005519200000004` | Visa credit       | Yes           | Surcharge testing     |
| `4012000033330026` | Visa credit       | Yes           | Also triggers 3DS     |
| `5555555555554444` | Mastercard debit  | No            |                       |
| `2223000048400011` | Mastercard credit | Yes           |                       |
| `378282246310005`  | Amex              | Yes           |                       |
| `6011111111111117` | Discover          | Yes           |                       |

### Decline and edge-case triggers

| Card               | Result                               |
| ------------------ | ------------------------------------ |
| `4000000000000002` | Generic decline                      |
| `4000000000009995` | Insufficient funds                   |
| `4000000000009987` | Lost card                            |
| `4000000000009979` | Stolen card                          |
| `4000000000000069` | Expired card                         |
| `4000000000000010` | Auth succeeds, refund declines       |
| `4000000000000051` | Partial approval (50% of the amount) |

### CVV and AVS

| Input                   | Result code           |
| ----------------------- | --------------------- |
| CVV `200` (Amex `2000`) | `N` – no match        |
| CVV `201` (Amex `2011`) | `U` – not verified    |
| CVV `301` (Amex `3011`) | `S` – not supported   |
| Any other CVV           | `M` – match           |
| Postal code `20000`     | AVS `N` – no match    |
| Postal code `20001`     | AVS `U` – unavailable |
| Any other postal code   | AVS `M` – match       |

## ACH

Any validly formatted account and routing number is approved (for example account `111111111`,
routing `111111111`). Routing number triggers:

| Routing     | Result                                       |
| ----------- | -------------------------------------------- |
| `000000000` | Immediate decline                            |
| `000000001` | Approved, then returned during settlement    |
| `000000002` | Approved, then late return during settlement |

Returns arrive through `transaction_update` webhooks.

## Terminals

Assign these TPNs to a sandbox terminal and pass `payment_method.terminal.id`:

| TPN            | Result                       |
| -------------- | ---------------------------- |
| `000000000001` | Success                      |
| `000000000002` | Decline                      |
| `000000000003` | Error                        |
| `000000000004` | Success including tip amount |

## Wallets

Apple Pay and Google Pay are **not** available in the sandbox; test them against production.

## Unit testing your own code

Inject a `fetch` mock through the `fetch` option so no network is involved:

```ts
import { GatewayClient } from '@cloud-payments/node-sdk';

const fetch = vi.fn(
  async () =>
    new Response(
      JSON.stringify({
        status: 'success',
        msg: 'success',
        data: { id: 'txn_1', response: 'approved', response_code: 100 },
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json', 'x-correlation-id': 'test' },
      },
    ),
);

const gateway = new GatewayClient({ apiKey: 'api_test', baseUrl: 'https://gateway.test', fetch });
```
