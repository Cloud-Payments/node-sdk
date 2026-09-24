# Other resources

## Products (`gateway.products`)

Products are scoped to a merchant id.

```ts
await gateway.products.create(merchantId, {
  sku: 'SKU-001',
  name: 'Widget',
  price: 1500,
  fixed_amount: true,
  fixed_qty: false,
  description: 'A widget',
});
await gateway.products.get(merchantId, productId);
await gateway.products.list(merchantId);
await gateway.products.search(merchantId, {
  name: { operator: '=', value: 'Widget' },
  price: { operator: '<', value: 2000 },
});
await gateway.products.update(merchantId, productId, { price: 1600 });
await gateway.products.delete(merchantId, productId);
```

### CSV batch upload

```ts
import { readFile } from 'node:fs/promises';

const result = await gateway.products.batchUpload(merchantId, {
  content: await readFile('products.csv'),
  fileName: 'products.csv',
});
result.data.imported; // created
result.data.errors; // [{ row, message }] – row 1 is the header
```

Columns: `name` (required), `sku`, `price` (cents; required when `fixed_amount` is true),
`fixed_amount`, `fixed_qty`, `local_tax`, `national_tax`, `max_quantity`, `unit_of_measure`,
`description`. Maximum 5000 rows.

## Carts (`gateway.carts`)

```ts
await gateway.carts.create(merchantId, {
  type: 'normal', // or 'donation'
  name: 'Store front',
  payments: ['card', 'ach'],
  products: [productId],
  success_url: 'https://example.com/thanks',
  cancel_url: 'https://example.com/cancel',
});
await gateway.carts.get(merchantId, cartId); // products expanded
await gateway.carts.list(merchantId);
await gateway.carts.search(merchantId, { name: { operator: '=', value: 'Store front' } });
await gateway.carts.update(merchantId, cartId, { show_available_products: true });
await gateway.carts.delete(merchantId, cartId);
```

## Custom fields (`gateway.customFields`)

Create fields first, then send their ids on transactions.

```ts
const field = await gateway.customFields.create({
  name: 'Order source',
  type: 'text', // 'text', 'multiselect', 'radio', …
  group_name: 'default',
  required: false,
  validation_type: 'open', // 'open' | 'alpha' | 'numeric' | 'alphanumeric' | 'sentence'
  values: null, // or [{ name, value }] for select-style fields
});

await gateway.customFields.list();
await gateway.customFields.listForMerchant(merchantId);
await gateway.customFields.get(field.data.id);
await gateway.customFields.update(field.data.id, {
  name: 'Order source',
  type: 'text',
  required: true,
});
await gateway.customFields.delete(field.data.id);

await gateway.transactions.sale({
  amount: 1000,
  payment_method: { token },
  group_name: 'default', // required only for non-default groups
  custom_fields: { [field.data.id]: ['web'] }, // values are always string arrays
});
```

## File batches (`gateway.fileBatches`)

Upload a CSV of transactions, poll until `completed`, then download the results CSV.

```ts
const upload = await gateway.fileBatches.upload({ content: csvText, fileName: 'transactions.csv' });
const batchId = upload.data.id;

let status = await gateway.fileBatches.get(batchId);
while (!['completed', 'failed'].includes(status.data.status)) {
  await new Promise((r) => setTimeout(r, 5000));
  status = await gateway.fileBatches.get(batchId);
}

const { text: resultsCsv } = await gateway.fileBatches.download(batchId); // ApiError until completed
```

Upload format: quoted, comma-separated fields with a header row (`transaction_type`, `amount`,
`cc_number`, `cc_expiration`, `customer_id`, `order_id`, billing/shipping columns, …). Results are
kept for 10 days.

## BIN lookup (`gateway.binLookup`)

```ts
const info = await gateway.binLookup.lookup({ bin: '424242', country: 'US', state: 'IL' });
info.data.card_brand; // 'Visa'
info.data.card_type; // 'credit' | 'debit'
info.data.is_surchargeable; // for the given country/state

await gateway.binLookup.lookup({ temp_token: tokenizerToken });
await gateway.binLookup.lookup({ customer_id: customerId, payment_method_id });
```

## Settlement batches (`gateway.settlementBatches`)

```ts
const batches = await gateway.settlementBatches.search({
  batch_date: { start_date: '2026-01-01T00:00:00Z', end_date: '2026-01-31T23:59:59Z' },
  limit: 100,
});
batches.data.summary; // per merchant / processor / day totals
batches.data.results; // SettlementBatch[]

await gateway.settlementBatches.settleTerminal(terminalId);
```

## Terminals (`gateway.terminals`)

```ts
const terminals = await gateway.terminals.list(); // includes inactive terminals
await gateway.terminals.settle(terminalId);

await gateway.transactions.sale({
  amount: 500,
  payment_method: { terminal: { id: terminalId, print_receipt: 'both', signature_required: true } },
});
```

The terminal batch number is returned in
`response_body.terminal.processor_specific.BatchNum`.
