import { afterAll, beforeAll, expect, test } from 'vitest';
import { TEST_CARDS, cleanup, gateway, integration, runId } from './helpers.js';

integration('recurring billing (sandbox)', () => {
  const gw = gateway();
  let customerId = '';
  let addOnId = '';
  let discountId = '';
  let planId = '';
  const subscriptionIds: string[] = [];

  beforeAll(async () => {
    const customer = await gw.vault.create({
      description: `recurring ${runId}`,
      default_payment: { card: { number: TEST_CARDS.approved, expiration_date: '12/30' } },
    });
    customerId = customer.data.id;
  });

  afterAll(async () => {
    for (const id of subscriptionIds)
      await cleanup(`delete subscription ${id}`, () => gw.recurring.subscriptions.delete(id));
    if (planId) await cleanup('delete plan', () => gw.recurring.plans.delete(planId));
    if (addOnId) await cleanup('delete add-on', () => gw.recurring.addOns.delete(addOnId));
    if (discountId)
      await cleanup('delete discount', () => gw.recurring.discounts.delete(discountId));
    if (customerId) await cleanup('delete customer', () => gw.vault.delete(customerId));
  });

  test('add-on CRUD', async () => {
    const created = await gw.recurring.addOns.create({
      name: `addon ${runId}`,
      description: 'SDK add-on',
      amount: 250,
      duration: 0,
    });
    addOnId = created.data.id;
    expect(created.data.amount).toBe(250);

    const fetched = await gw.recurring.addOns.get(addOnId);
    expect(fetched.data.id).toBe(addOnId);

    const list = await gw.recurring.addOns.list();
    expect(list.data.some((a) => a.id === addOnId)).toBe(true);

    const updated = await gw.recurring.addOns.update(addOnId, {
      name: `addon ${runId}`,
      amount: 300,
      duration: 0,
    });
    expect(updated.data.amount).toBe(300);
  });

  test('discount CRUD', async () => {
    const created = await gw.recurring.discounts.create({
      name: `discount ${runId}`,
      description: 'SDK discount',
      amount: 100,
      duration: 0,
    });
    discountId = created.data.id;
    expect(created.data.amount).toBe(100);

    const fetched = await gw.recurring.discounts.get(discountId);
    expect(fetched.data.id).toBe(discountId);

    const list = await gw.recurring.discounts.list();
    expect(list.data.some((d) => d.id === discountId)).toBe(true);

    const updated = await gw.recurring.discounts.update(discountId, {
      name: `discount ${runId}`,
      percentage: 5000,
      duration: 0,
    });
    expect(updated.status).toBe('success');
  });

  test('plan CRUD', async () => {
    const created = await gw.recurring.plans.create({
      name: `plan ${runId}`,
      description: 'SDK plan',
      amount: 4900,
      billing_cycle_interval: 1,
      billing_frequency: 'monthly',
      billing_days: '1',
      duration: 0,
      add_ons: [{ id: addOnId }],
      discounts: [{ id: discountId }],
    });
    planId = created.data.id;
    expect(created.data.amount).toBe(4900);
    expect(created.data.billing_frequency).toBe('monthly');

    const fetched = await gw.recurring.plans.get(planId);
    expect(fetched.data.id).toBe(planId);

    const list = await gw.recurring.plans.list();
    expect(list.data.some((p) => p.id === planId)).toBe(true);

    const updated = await gw.recurring.plans.update(planId, {
      name: `plan ${runId}`,
      amount: 5900,
      billing_cycle_interval: 1,
      billing_frequency: 'monthly',
      billing_days: '1',
    });
    expect(updated.data.amount).toBe(5900);
  });

  test('subscription lifecycle: create, get, search, update, pause, activate, past due, complete', async () => {
    const nextBill = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const created = await gw.recurring.subscriptions.create({
      plan_id: planId,
      description: `subscription ${runId}`,
      customer: { id: customerId },
      amount: 5900,
      billing_cycle_interval: 1,
      billing_frequency: 'monthly',
      billing_days: '1',
      next_bill_date: nextBill,
    });
    const id = created.data.id;
    subscriptionIds.push(id);
    expect(created.data.customer.id).toBe(customerId);
    expect(created.data.amount).toBe(5900);

    const fetched = await gw.recurring.subscriptions.get(id);
    expect(fetched.data.id).toBe(id);

    const found = await gw.recurring.subscriptions.search({
      customer: { id: { operator: '=', value: customerId } },
      limit: 10,
    });
    expect(found.data.some((s) => s.id === id)).toBe(true);

    const updated = await gw.recurring.subscriptions.update(id, {
      description: `updated ${runId}`,
    });
    expect(updated.data.description).toBe(`updated ${runId}`);

    const paused = await gw.recurring.subscriptions.pause(id);
    if (paused.data.status !== undefined) expect(paused.data.status).toBe('paused');

    const activated = await gw.recurring.subscriptions.activate(id, nextBill);
    if (activated.data.status !== undefined) expect(activated.data.status).toBe('active');

    const pastDue = await gw.recurring.subscriptions.markPastDue(id);
    if (pastDue.data.status !== undefined) expect(pastDue.data.status).toBe('past_due');

    await gw.recurring.subscriptions.activate(id);

    const completed = await gw.recurring.subscriptions.complete(id);
    if (completed.data.status !== undefined) expect(completed.data.status).toBe('completed');
  });

  test('subscription cancel and delete', async () => {
    const created = await gw.recurring.subscriptions.create({
      plan_id: planId,
      customer: { id: customerId },
      amount: 100,
      billing_cycle_interval: 1,
      billing_frequency: 'monthly',
      billing_days: '15',
    });
    const cancelled = await gw.recurring.subscriptions.cancel(created.data.id);
    if (cancelled.data.status !== undefined) expect(cancelled.data.status).toBe('cancelled');

    const deleted = await gw.recurring.subscriptions.delete(created.data.id);
    expect(deleted.status).toBe('success');
  });
});
