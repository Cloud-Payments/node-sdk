import { describe, it } from 'vitest';
import type { CreateMerchantRequest } from '../../src/index.js';
import { createClient, expectRequest, lastCall } from '../helpers.js';

const contact = {
  first_name: 'A',
  last_name: 'B',
  company: 'C',
  address_line_1: '1',
  city: 'c',
  state: 'IL',
  postal_code: '60000',
  country: 'US',
  email: 'a@b.c',
  phone: '5555555555',
};

const merchant: CreateMerchantRequest = {
  name: 'M',
  description: 'D',
  status: 'active',
  phone: '5555555555',
  receipt_email: 'r@b.c',
  fee_schedule_id: 'fee1',
  timezone: 'UTC',
  billing_contact: contact,
  primary_contact: contact,
  user: {
    username: 'user_one',
    name: 'U',
    phone: '5555555555',
    email: 'u@b.c',
    timezone: 'UTC',
    status: 'active',
    role: 'admin',
  },
};

describe('merchants resource', () => {
  it('covers boarding endpoints', async () => {
    const { client, calls } = createClient();
    await client.merchants.create(merchant);
    expectRequest(lastCall(calls), { method: 'POST', path: '/api/merchant', body: merchant });
    await client.merchants.setStatus('m1', 'disable');
    expectRequest(lastCall(calls), { method: 'GET', path: '/api/merchant/m1/status/disable' });
    const processor = {
      name: 'P',
      description: 'D',
      status: 'active' as const,
      timezone: 'UTC',
      settle_at: '23:00:00',
    };
    await client.merchants.createProcessor('m1', processor);
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/merchant/m1/processor',
      body: processor,
    });
    await client.merchants.createUser('m1', merchant.user);
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/merchant/m1/user',
      body: merchant.user,
    });
    const page = { slug: 'pay', name: 'N', title: 'T', description: 'D', layout: 'full' };
    await client.merchants.createSimplePaymentPage('m1', page);
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/merchant/m1/simple-payment',
      body: page,
    });
  });

  it('covers webhook endpoints', async () => {
    const { client, calls } = createClient();
    await client.merchants.webhooks.test('m1', { webhook_id: 'w1' });
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/merchant/m1/webhook/test',
      body: { webhook_id: 'w1' },
    });
    await client.merchants.webhooks.rotateSecret('m1', 'w1', { overlap_hours: 48 });
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/merchant/m1/webhook/w1/rotate-secret',
      body: { overlap_hours: 48 },
    });
    await client.merchants.webhooks.rotateSecret('m1', 'w1');
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/merchant/m1/webhook/w1/rotate-secret',
      body: {},
    });
    await client.merchants.webhooks.expirePreviousSecret('m1', 'w1');
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/merchant/m1/webhook/w1/expire-previous-secret',
    });
  });
});

describe('rules resource', () => {
  it('covers every endpoint', async () => {
    const { client, calls } = createClient();
    const rule = {
      name: 'R',
      settings: { enabled: true },
      pre: [{ type: 'ip_proxy', operator: '=', action: 'deny' as const, value: 'TOR' }],
      post: [],
    };
    await client.rules.list();
    expectRequest(lastCall(calls), { method: 'GET', path: '/api/rules-engine/rules' });
    await client.rules.get('r1');
    expectRequest(lastCall(calls), { method: 'GET', path: '/api/rules-engine/rules/r1' });
    await client.rules.search({ name: 'proxy' });
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/rules-engine/rules/search',
      body: { name: 'proxy' },
    });
    await client.rules.search();
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/rules-engine/rules/search',
      body: {},
    });
    await client.rules.create(rule);
    expectRequest(lastCall(calls), { method: 'POST', path: '/api/rules-engine/rules', body: rule });
    await client.rules.update('r1', rule);
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/rules-engine/rules/r1',
      body: rule,
    });
    await client.rules.delete('r1');
    expectRequest(lastCall(calls), { method: 'DELETE', path: '/api/rules-engine/rules/r1' });
  });
});
