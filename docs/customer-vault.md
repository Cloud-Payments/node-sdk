# Customer vault

`gateway.vault` stores customers, their addresses and payment methods so you can charge them
again without handling card data.

## Create a customer

```ts
const created = await gateway.vault.create(
  {
    id: 'my-customer-42', // optional custom id (2–40 chars: a-z A-Z 0-9 . - _ ^)
    description: 'Jane Doe – premium member',
    flags: ['surcharge_exempt'],
    default_payment: { token }, // or { card: { number, expiration_date } } / { ach: {...} } / { apple_pay: {...} } / { google_pay_token }
    default_billing_address: {
      first_name: 'Jane',
      last_name: 'Doe',
      line_1: '123 Main St',
      city: 'Chicago',
      state: 'IL',
      postal_code: '60601',
      country: 'US',
      email: 'jane@example.com',
    },
    default_shipping_address: {/* same shape */},
  },
  { validate: true }, // query params: validate ($0 verification), authorize ($1 auth), bypass_rule_engine
);

const customerId = created.data.id;
const defaults = created.data.data.customer.defaults;
defaults.payment_method_id; // store this to charge a specific method later
defaults.billing_address_id;
```

Vault addresses use `line_1` / `line_2` (transactions use `address_line_1` / `address_line_2`).

## Payment verification

Storing a payment method can trigger a small verification. Choose with the query params:

| Input                           | Verification                          |
| ------------------------------- | ------------------------------------- |
| Card with `{ validate: true }`  | $0.00 verification                    |
| Card with `{ authorize: true }` | $1.00 authorization, never captured   |
| Card with neither               | none (`initial_transaction_id` empty) |
| Token with `{ validate: true }` | $0.00 verification                    |
| Apple Pay                       | $1.00 authorization, always           |
| Google Pay                      | none                                  |

## Read, search, update, delete

```ts
const customer = await gateway.vault.get(customerId);
customer.data.data.customer.addresses; // StoredAddress[]
customer.data.data.customer.payments.cards; // StoredCard[]
customer.data.data.customer.payments.ach; // StoredAch[]

const matches = await gateway.vault.search({
  email: { operator: '=', value: 'jane@example.com' },
  limit: 10,
});

await gateway.vault.update(customerId, {
  notes: 'VIP',
  defaults: {
    payment_method_id: 'pm_id',
    payment_method_type: 'card',
    billing_address_id: 'addr_id',
  },
});

await gateway.vault.delete(customerId);
```

## Addresses

```ts
const withAddress = await gateway.vault.addresses.create(customerId, {
  first_name: 'Jane',
  line_1: '5 Elm St',
  city: 'Chicago',
  state: 'IL',
  postal_code: '60601',
  country: 'US',
});
withAddress.data.created_address_id;

await gateway.vault.addresses.update(customerId, addressId, { line_2: 'Apt 2' });
await gateway.vault.addresses.delete(customerId, addressId);
```

Creating an address that exactly matches an existing one fails with
`invalid: would create a duplicate address`; read the customer first and reuse the existing id.
Addresses cannot be fetched individually.

## Payment methods

```ts
const pm = gateway.vault.paymentMethods;

await pm.createCard(
  customerId,
  { number: '4111111111111111', expiration_date: '1230' },
  { authorize: true },
);
await pm.createAch(customerId, {
  account_number: '000123456789',
  routing_number: '110000000',
  account_type: 'checking',
  sec_code: 'web',
});
await pm.createFromToken(customerId, { token }, { validate: true });
await pm.createApplePay(customerId, { key_id, temporary_token }); // or { key_id, pkpaymenttoken }
await pm.createGooglePay(customerId, googlePayToken);

await pm.updateCard(customerId, paymentMethodId, {
  expiration_date: '1231',
  flags: ['surcharge_exempt'],
});
await pm.updateAch(customerId, paymentMethodId, {
  account_number,
  routing_number,
  account_type: 'checking',
  sec_code: 'ppd',
});
await pm.updateFromToken(customerId, paymentMethodId, { token });

await pm.deleteCard(customerId, cardId);
await pm.deleteAch(customerId, achId);
```

Each call returns the full customer record; the create calls also include
`created_payment_method_id`.

## Charging a stored customer

```ts
await gateway.transactions.sale({
  amount: 2500,
  payment_method: {
    customer: { id: customerId, payment_method_id, billing_address_id }, // ids are optional; defaults are used
  },
  billing_method: 'recurring', // CIT/MIT indicators when applicable
  initiated_by: 'merchant',
});
```

## Vaulting from a sale

Set `create_vault_record: true` on a transaction to create a customer from a successful sale, or
`create_vault_record_for: customerId` to add the payment method to an existing customer. The
transaction response then carries `customer_id` and `customer_payment_id`.
