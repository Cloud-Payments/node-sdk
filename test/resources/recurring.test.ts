import { describe, it } from 'vitest';
import { createClient, expectRequest, lastCall } from '../helpers.js';

describe('recurring resource', () => {
  it('manages add-ons and discounts', async () => {
    const { client, calls } = createClient();
    for (const [resource, path, plural] of [
      [client.recurring.addOns, '/api/recurring/addon', '/api/recurring/addons'],
      [client.recurring.discounts, '/api/recurring/discount', '/api/recurring/discounts'],
    ] as const) {
      await resource.create({ name: 'n', amount: 100 });
      expectRequest(lastCall(calls), { method: 'POST', path, body: { name: 'n', amount: 100 } });
      await resource.get('id1');
      expectRequest(lastCall(calls), { method: 'GET', path: `${path}/id1` });
      await resource.list();
      expectRequest(lastCall(calls), { method: 'GET', path: plural });
      await resource.update('id1', { percentage: 5000 });
      expectRequest(lastCall(calls), {
        method: 'POST',
        path: `${path}/id1`,
        body: { percentage: 5000 },
      });
      await resource.delete('id1');
      expectRequest(lastCall(calls), { method: 'DELETE', path: `${path}/id1` });
    }
  });

  it('manages plans', async () => {
    const { client, calls } = createClient();
    const plan = {
      name: 'p',
      amount: 100,
      billing_cycle_interval: 1,
      billing_frequency: 'monthly' as const,
      billing_days: '1',
    };
    await client.recurring.plans.create(plan);
    expectRequest(lastCall(calls), { method: 'POST', path: '/api/recurring/plan', body: plan });
    await client.recurring.plans.get('plan1');
    expectRequest(lastCall(calls), { method: 'GET', path: '/api/recurring/plan/plan1' });
    await client.recurring.plans.list();
    expectRequest(lastCall(calls), { method: 'GET', path: '/api/recurring/plans' });
    await client.recurring.plans.update('plan1', { amount: 200, update_subscriptions: true });
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/recurring/plan/plan1',
      body: { amount: 200, update_subscriptions: true },
    });
    await client.recurring.plans.delete('plan1');
    expectRequest(lastCall(calls), { method: 'DELETE', path: '/api/recurring/plan/plan1' });
  });

  it('manages subscriptions', async () => {
    const { client, calls } = createClient();
    const subs = client.recurring.subscriptions;
    const body = {
      customer: { id: 'c1' },
      amount: 100,
      billing_cycle_interval: 1,
      billing_frequency: 'monthly' as const,
      billing_days: '1',
    };
    await subs.create(body);
    expectRequest(lastCall(calls), { method: 'POST', path: '/api/recurring/subscription', body });
    await subs.get('s1');
    expectRequest(lastCall(calls), { method: 'GET', path: '/api/recurring/subscription/s1' });
    await subs.search({ status: { operator: '=', value: 'active' } });
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/recurring/subscription/search',
      body: { status: { operator: '=', value: 'active' } },
    });
    await subs.search();
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/recurring/subscription/search',
      body: {},
    });
    await subs.update('s1', { amount: 200 });
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/recurring/subscription/s1',
      body: { amount: 200 },
    });
    await subs.delete('s1');
    expectRequest(lastCall(calls), { method: 'DELETE', path: '/api/recurring/subscription/s1' });

    await subs.pause('s1');
    expectRequest(lastCall(calls), {
      method: 'GET',
      path: '/api/recurring/subscription/s1/status/paused',
    });
    await subs.markPastDue('s1');
    expectRequest(lastCall(calls), {
      method: 'GET',
      path: '/api/recurring/subscription/s1/status/past_due',
    });
    await subs.cancel('s1');
    expectRequest(lastCall(calls), {
      method: 'GET',
      path: '/api/recurring/subscription/s1/status/cancelled',
    });
    await subs.activate('s1');
    expectRequest(lastCall(calls), {
      method: 'GET',
      path: '/api/recurring/subscription/s1/status/active',
    });
    await subs.activate('s1', '2026-02-19');
    expectRequest(lastCall(calls), {
      method: 'GET',
      path: '/api/recurring/subscription/s1/status/active',
      query: { next_bill_date: '2026-02-19' },
    });
    await subs.complete('s1');
    expectRequest(lastCall(calls), {
      method: 'GET',
      path: '/api/recurring/subscription/s1/status/completed',
    });
  });
});
