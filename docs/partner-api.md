# Partner API

These endpoints require a **partner** API key.

## Merchant boarding (`gateway.merchants`)

Create a merchant, its admin user and (optionally) that user's API keys in one call:

```ts
const merchant = await gateway.merchants.create({
  name: 'Test Merchant',
  description: 'Internal description',
  status: 'active',
  website: 'example.com',
  phone: '7403270078',
  receipt_email: 'receipts@example.com',
  fee_schedule_id: feeScheduleId,
  timezone: 'America/Chicago',
  accept_tos: true,
  billing: null, // or { type: 'ppd' | 'ccd', routing_number, account_number, account_type }
  billing_contact: contact,
  primary_contact: contact,
  limits: {
    sale: { single: 0, daily: 0, monthly: 0 },
    credit: { single: 0, daily: 0, monthly: 0 },
  },
  user: {
    username: 'merchant_admin',
    name: 'Admin User',
    phone: '5555555555',
    email: 'admin@example.com',
    timezone: 'America/Chicago',
    status: 'active',
    role: 'admin',
    send_welcome: true,
    create_api_key: true,
    create_pub_api_key: true,
  },
  permissions: {
    allow_customer_vault_access: true,
    allow_recurring_billing_access: true,
    allow_invoice_access: true,
  },
});

merchant.data.id;
merchant.data.api_key; // present when create_api_key was true – store it securely, it is not shown again
merchant.data.pub_api_key;
```

Permissions not provided default to `false`.

### Status, processors, users, Simple Payments pages

```ts
await gateway.merchants.setStatus(merchantId, 'disable'); // or 'active'

await gateway.merchants.createProcessor(merchantId, {
  name: 'Backup processor',
  description: 'Surcharge fallback',
  status: 'active',
  default_card: false,
  timezone: 'US/Central',
  settle_at: '23:00:00',
  tag: 'surchargefallback', // 'itfallback' | 'debitfallback' | 'splittransaction' | 'splitpaymentadjustment'
  supported_currencies: ['usd'],
  ruleset: [ruleId], // attach fraud rules
  settings: { tsys_sierra: {/* var sheet */} },
});

await gateway.merchants.createUser(merchantId, {
  username: 'ops_user',
  name: 'Ops',
  phone: '5555555555',
  email: 'ops@example.com',
  timezone: 'UTC',
  status: 'active',
  role: 'standard',
  create_api_key: true,
});

await gateway.merchants.createSimplePaymentPage(merchantId, {
  slug: 'donate',
  name: 'Donations',
  title: 'Support us',
  description: 'Every bit helps',
  layout: 'full',
  payment_settings: [{ payment_method: 'card' }],
  amount_options: [1000, 2500, 5000],
  manual_amount: true,
});
```

Processor tags mark a processor as a fallback or split leg; the tagged processor is only used in
its designated scenario. Each tag needs its own physical processor.

### Webhooks

```ts
await gateway.merchants.webhooks.test(merchantId, { webhook_id: webhookId });
await gateway.merchants.webhooks.test(merchantId, {
  url: 'https://example.com/hooks',
  signature_key: secret,
});
await gateway.merchants.webhooks.rotateSecret(merchantId, webhookId, { overlap_hours: 24 });
await gateway.merchants.webhooks.expirePreviousSecret(merchantId, webhookId);
```

## Fraud rules (`gateway.rules`)

Partner rules run on every transaction from every merchant you manage, once attached to the
processor handling the transaction. Requires the `manage_rule_engine` permission.

```ts
const rule = await gateway.rules.create({
  name: 'Block anonymous proxies',
  description: 'Portfolio-wide proxy block',
  settings: {
    enabled: true,
    enabled_advanced: false,
    enabled_community_rules: false,
    default_community_rule: 'deny',
    default_action_for_flagged_transactions: 'deny',
    whitelisted_ips: [],
  },
  pre: [
    { type: 'ip_proxy', operator: '=', action: 'deny', value: 'TOR|VPN|DCH', notification: 'true' },
  ],
  post: [],
  processor_ids: [processorId], // optional – leave empty to create without attaching
});

await gateway.rules.list();
await gateway.rules.get(rule.data.id);
await gateway.rules.search({ name: 'proxy' });
await gateway.rules.update(rule.data.id, { ...rule.data, description: 'updated' });
await gateway.rules.delete(rule.data.id);
```

Condition `type` values include amount and geography (`amount`, `country`, `billing_state`,
`ip_country`), IP and network (`ip_address`, `ip_proxy`, `ip_anomaly`), velocity checks
(`velocity_check_1hour`, `ip_velocity_check_24hours`, `account_velocity_check_30days`,
`bin_velocity_check`, `weekly_velocity_per_card`), card attributes (`card_type`, `card_brand`,
`bin_range`, `bin_generic_level`, `card_ban`, `bin_watch_list`), contact checks
(`email_address`, `email_domain`, `email_anomaly`, `address_match`), post-processor checks
(`avs_response`, `cvv_response`, decline categories, 3DS) and advanced scoring types when
`enabled_advanced` is on. Actions are `accept`, `deny`, `flag`, `accept_flag_batch` and
`deny_flag_batch`; the first matching rule wins.
