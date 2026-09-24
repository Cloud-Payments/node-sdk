# Transactions

`gateway.transactions` wraps `POST /api/transaction` and its related endpoints.

## Creating transactions

| Method                         | Type           | Notes                                                  |
| ------------------------------ | -------------- | ------------------------------------------------------ |
| `sale(request)`                | `sale`         | Authorize and capture in one call.                     |
| `authorize(request)`           | `authorize`    | Authorize now, capture later with `capture`.           |
| `verify(request)`              | `verification` | Verify a card without charging; `amount` not required. |
| `credit(request)`              | `credit`       | Blind credit (requires the merchant permission).       |
| `create({ type, ...request })` | any            | When the type is decided at runtime.                   |

Minimum fields: `amount` (cents) and exactly one `payment_method`.

```ts
await gateway.transactions.sale({
  amount: 1299,
  currency: 'USD',
  order_id: 'ORDER-12345', // ≤ 17 alphanumeric characters
  description: 'Monthly subscription payment',
  idempotency_key: randomUUID(),
  payment_method: { card: { number: '4111111111111111', expiration_date: '12/30', cvc: '123' } },
  billing_address: {
    first_name: 'John',
    last_name: 'Doe',
    address_line_1: '123 Main St',
    city: 'Chicago',
    state: 'IL',
    postal_code: '60601',
    country: 'US',
  },
});
```

If your account has no default processor, pass `processor_id`.

### Payment methods

Set exactly one property on `payment_method`:

| Property           | Use                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| `card`             | Card number, `expiration_date` (`MM/YY`), optional `cvc`, track data, 3DS data.                               |
| `token`            | Token from the hosted Tokenizer (expires after 2 minutes).                                                    |
| `customer`         | `{ id, payment_method_id?, payment_method_type?, billing_address_id?, shipping_address_id? }` from the vault. |
| `ach`              | `routing_number`, `account_number`, `sec_code` (`web`/`ccd`/`ppd`/`tel`), `account_type`.                     |
| `terminal`         | `{ id, print_receipt, signature_required }` for a physical terminal.                                          |
| `apm`              | Alternative payment methods (Klarna, OXXO, Alipay, WeChat Pay, SEPA, DragonPay).                              |
| `apple_pay_token`  | Wallet.js `temporary_token` or `key_id` + `pkpaymenttoken`. Production only.                                  |
| `google_pay_token` | The token from Google, as string or parsed object. Production only.                                           |

Chip data goes in `payment_method.emv` alongside `card`.

3DS data collected by your own provider goes in `card.cardholder_authentication`:

```ts
payment_method: {
  card: { number, expiration_date, cvc, cardholder_authentication: { eci: '05', cavv: '…', version: '2' } },
}
```

### Amounts and fees

- `amount` is the final total including fees and taxes.
- `base_amount` lets the gateway add surcharges / fee-program amounts for you.
- `tax_amount`, `shipping_amount`, `discount_amount`, `tip_amount` are informational and must
  already be included in `amount`.
- `payment_adjustment: { type: 'flat' | 'percentage', value }` applies a convenience fee.

For complex totals call `calculateAmounts` first and pass the result as `amounts`:

```ts
const amounts = await gateway.transactions.calculateAmounts({
  subtotal: 10000,
  payment_method: 'card',
  cc_bin: '4005519200000004',
  country: 'US',
  state: 'IL',
  tax_amount: { type: 'percentage', value: 8250, include: true },
});

await gateway.transactions.sale({
  amount: amounts.data.amount!,
  amounts: amounts.data,
  payment_method: { token },
});
```

### Other options

| Field                                                                                                               | Purpose                                                                |
| ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `line_items`, `summary_commodity_code`, `ship_from_postal_code`                                                     | Level 3 data (also needs `order_id`, `tax_amount`, both postal codes). |
| `custom_fields`, `group_name`                                                                                       | Values keyed by custom field id; values are arrays of strings.         |
| `create_vault_record`, `create_vault_record_for`                                                                    | Store the payment method after a successful sale.                      |
| `email_receipt`, `email_address`                                                                                    | Email a receipt.                                                       |
| `descriptor`                                                                                                        | Statement descriptor (processor dependent).                            |
| `allow_partial_payment`                                                                                             | Accept partial approvals; compare `amount_authorized` with `amount`.   |
| `split_transaction_amount`                                                                                          | Run a secondary transaction on the split processor.                    |
| `billing_method`, `initiated_by`, `card_on_file_indicator`, `stored_credential_indicator`, `initial_transaction_id` | CIT/MIT indicators.                                                    |
| `iias_status`, `additional_amounts.hsa`                                                                             | HSA / FSA transactions.                                                |
| `processor_specific`                                                                                                | Processor-specific settings (PaySafe Direct).                          |

## Reading the response

```ts
const { data } = await gateway.transactions.sale(request);

data.id; // transaction id
data.status; // 'pending_settlement', 'authorized', 'declined', 'settled', …
data.response; // 'approved' | 'declined' | …
data.response_code; // 100 approved, 110 partial approval, 2xx declined, 3xx gateway decline, 4xx processor error
data.amount_authorized; // compare with data.amount for partial approvals
data.response_body.card?.auth_code;
data.response_body.card?.avs_response_code; // AVS result
data.response_body.card?.cvv_response_code; // CVV result
data.customer_id; // populated when create_vault_record was true
data.transaction_source; // 'api', 'recurring', 'invoice', …
data.subscription_id; // populated for recurring renewals
```

Only the relevant member of `response_body` (`card`, `ach`, `terminal`, `apm`, `cash`) is
present. `captured_at` and `settled_at` are `null` until they happen.

Use `categorizeResponseCode(code)` / `describeResponseCode(code)` to interpret `response_code`.

## Capture, void, refund

```ts
await gateway.transactions.capture(id, { amount: 1299, tax_amount: 100, order_id: 'ORDER-1' }); // amount defaults to the authorized amount
await gateway.transactions.void(id); // pending settlement only; processed as an auth reversal where applicable
await gateway.transactions.refund(id, { amount: 500 }); // settled only; omit amount for a full refund
```

Multiple partial refunds are allowed until the settled total is reached. `void` resolves with
`data: null`.

## Retrieve and search

```ts
const one = await gateway.transactions.get(id); // data is the Transaction, or null if not found

const list = await gateway.transactions.search({
  type: { operator: '=', value: 'sale' },
  status: { operator: '=', value: 'pending_settlement' },
  amount: { operator: '>', value: 1000 },
  created_at: { start_date: '2026-01-01T00:00:00Z', end_date: '2026-01-31T23:59:59Z' },
  billing_address: { last_name: { operator: '=', value: 'Smith' } },
  limit: 50,
  offset: 0,
});
list.total_count;
list.data; // Transaction[]
```

String fields accept `=` / `!=`; integer fields also accept `<` / `>`. Without `created_at`
the gateway searches the prior four months.

## Duplicate protection

Send an `idempotency_key` (UUID) and optionally `idempotency_time` (seconds, default 300).
Re-sending the same key inside the window returns the original transaction instead of charging
again. When a request carries an `idempotency_key` the SDK also considers it safe to retry
(see `maxRetries`).
