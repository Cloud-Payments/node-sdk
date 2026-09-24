# Recurring billing

`gateway.recurring` exposes four sub-resources: `addOns`, `discounts`, `plans` and
`subscriptions`.

## Add-ons and discounts

Adjust a recurring charge by a fixed amount **or** a percentage (never both):

```ts
const addOn = await gateway.recurring.addOns.create({
  name: 'Extra seat',
  amount: 500,
  duration: 0,
});
const discount = await gateway.recurring.discounts.create({
  name: 'Launch promo',
  percentage: 10000,
  duration: 3,
}); // 10.000 % for 3 cycles

await gateway.recurring.addOns.get(addOn.data.id);
await gateway.recurring.addOns.list();
await gateway.recurring.addOns.update(addOn.data.id, { amount: 600 });
await gateway.recurring.addOns.delete(addOn.data.id);
```

`duration: 0` keeps the adjustment until cancelled. Percentages are thousandths of a percent
(`43440` = 43.440 %).

## Plans

```ts
const plan = await gateway.recurring.plans.create({
  name: 'Pro',
  description: 'Pro tier',
  amount: 4900,
  billing_cycle_interval: 1, // every month
  billing_frequency: 'monthly', // 'monthly' | 'twice_monthly' | 'daily'
  billing_days: '1', // '1,15' for twice monthly, '0' for the last day of the month
  duration: 0,
  add_ons: [{ id: addOn.data.id }],
  discounts: [{ id: discount.data.id, duration: 1 }], // fields other than id override the record
});

await gateway.recurring.plans.update(plan.data.id, { amount: 5900, update_subscriptions: true });
await gateway.recurring.plans.list();
await gateway.recurring.plans.delete(plan.data.id);
```

## Subscriptions

```ts
const subscription = await gateway.recurring.subscriptions.create({
  plan_id: plan.data.id,
  customer: { id: customerId, payment_method_type: 'card', payment_method_id }, // ids default to the customer's defaults
  amount: 4900,
  billing_cycle_interval: 1,
  billing_frequency: 'monthly',
  billing_days: '1',
  next_bill_date: '2026-03-01',
  // Optional Level 3 data forwarded on every renewal:
  line_items: [{ name: 'Pro', quantity: 1, unit_price: 4900, amount: 4900 }],
  derive_amount_from_line_items: false,
});
```

### Lifecycle

```ts
const subs = gateway.recurring.subscriptions;
await subs.pause(id); // skipped until reactivated
await subs.activate(id, '2026-04-01'); // optional next_bill_date (YYYY-MM-DD)
await subs.markPastDue(id); // manual only – the gateway never sets past_due automatically
await subs.cancel(id); // permanent
await subs.complete(id);
await subs.delete(id);
```

| Status                            | Set by           | Meaning                                                                     |
| --------------------------------- | ---------------- | --------------------------------------------------------------------------- |
| `active`                          | automatic/manual | Billed on `next_bill_date`.                                                 |
| `failing`                         | automatic        | Last charge declined; retried on the next run.                              |
| `failed`                          | automatic        | Declined twice in a row; no more automatic retries – reactivate.            |
| `error`                           | automatic        | Configuration/data problem (missing payment method, vault load failure, …). |
| `completed`                       | automatic/manual | Reached its duration.                                                       |
| `paused`, `past_due`, `cancelled` | manual           | Operational states.                                                         |

Monitor `failing`, `failed` **and** `error` to catch billing problems. Each subscription also has
an `events` stream with per-attempt statuses (`success`, `declined`, `error`, `info`).

### Finding renewals

Renewals are ordinary transactions. Filter on `transaction_source === 'recurring'` and
`subscription_id`, either in `transactions.search` or in `transaction_create` webhooks:

```ts
const renewals = await gateway.transactions.search({
  customer_id: { operator: '=', value: customerId },
});
renewals.data.filter(
  (t) => t.transaction_source === 'recurring' && t.subscription_id === subscription.data.id,
);
```

### Search

```ts
await gateway.recurring.subscriptions.search({
  status: { operator: '=', value: 'failing' },
  next_bill_date: { operator: '<', value: '2026-03-01T00:00:00Z' },
  limit: 100,
});
```
