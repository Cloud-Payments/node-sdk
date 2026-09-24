# Invoices

`gateway.invoices` creates invoices, sends them, and records payments.

## Create

```ts
const invoice = await gateway.invoices.create({
  currency: 'USD',
  company_name: 'ACME Inc.',
  customer_number: 'CUST-123', // your reference
  customer_id: vaultCustomerId, // optional vault customer
  invoice_number: 'INV-2026-001', // optional; written to the paying transaction's order_id
  payable_to: {
    company: 'ACME Inc.',
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
  items: [
    { name: 'Widget', description: 'A widget', quantity: 2, unit_price: 5000, status: 'pending' },
    {
      name: 'Support',
      quantity: 1,
      unit_price: 10000,
      status: 'pending',
      taxable: true,
      tax_rate: '8.250',
    },
  ],
  enable_tax: true,
  tax_percent: '8.250',
  allow_partial_payment: true,
  settings: { partial_payment_type: 'amount', allow_tipping: false },
  transaction_type: 'sale',
  payment_methods: ['card', 'ach'],
  card_processor_id: '', // '' uses the default processor
  ach_processor_id: '',
  message: 'Thank you for your business!',
  save_customer_vault: 'optional',
  send_via: 'email', // 'email' | 'text' | 'both' | 'none'
  email_to: 'jane@example.com',
});

invoice.data.id;
invoice.data.hosted_url; // link customers can pay from
invoice.data.public_url; // public hash (also accepted by pay())
invoice.data.amount_due;
```

Once paid, the invoice id (or `invoice_number`) is set on the transaction's `order_id` and
`po_number`, so `transactions.search({ order_id: ... })` finds the payment.

## Read, search, update, delete, resend

```ts
await gateway.invoices.get(invoiceId);
await gateway.invoices.search({
  amount_due: { operator: '>', value: 0 },
  date_due: { start_date: '2026-01-01T00:00:00Z', end_date: '2026-12-31T23:59:59Z' },
  limit: 50,
});
await gateway.invoices.update(invoiceId, {
  message: 'Updated terms',
  date_due: '2027-01-31T06:00:00.000Z',
});
await gateway.invoices.resend(invoiceId);
await gateway.invoices.delete(invoiceId);
```

## Pay

`pay` accepts the invoice id or its public hash and a payment method (`card`, `ach`,
`customer` or `token`):

```ts
const payment = await gateway.invoices.pay(invoiceId, {
  payment_method: { customer: { id: customerId } },
});
payment.data; // the resulting Transaction
```

### Partial payments

Enable `allow_partial_payment` and choose `settings.partial_payment_type`:

- `"amount"` – pay any portion with `partial_payment_amount` (cents). If the invoice has tax, a
  partial amount must be below the pre-tax balance, or equal the full amount due.
- `"line_items"` – reject line items with `rejected_items` + `reject_message` and pay the rest.

```ts
await gateway.invoices.pay(invoiceId, { payment_method: { token }, partial_payment_amount: 3000 });

await gateway.invoices.pay(invoiceId, {
  payment_method: { token },
  rejected_items: [{ id: lineItemId }],
  reject_message: 'Customer declined this item',
});
```

The invoice becomes `partially_paid`, then `paid` when the balance reaches zero. Further
payments are accepted while the status is `pending`, `declined`, `partially_paid` or `past_due`.
