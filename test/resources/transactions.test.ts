import { describe, expect, it } from 'vitest';
import { InvalidArgumentError } from '../../src/index.js';
import { createClient, expectRequest, jsonResponse, lastCall } from '../helpers.js';

const card = { number: '4111111111111111', expiration_date: '12/30', cvc: '123' };

describe('transactions resource', () => {
  it('creates transactions with typed helpers', async () => {
    const { client, calls } = createClient();
    await client.transactions.create({ type: 'sale', amount: 100, payment_method: { card } });
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/transaction',
      body: { type: 'sale', amount: 100, payment_method: { card } },
    });

    await client.transactions.sale({ amount: 1299, payment_method: { card } });
    expect(JSON.parse(lastCall(calls).body as string)).toMatchObject({
      type: 'sale',
      amount: 1299,
    });

    await client.transactions.authorize({ amount: 1299, payment_method: { token: 'tok' } });
    expect(JSON.parse(lastCall(calls).body as string)).toMatchObject({
      type: 'authorize',
      payment_method: { token: 'tok' },
    });

    await client.transactions.verify({ payment_method: { card } });
    expect(JSON.parse(lastCall(calls).body as string)).toEqual({
      type: 'verification',
      payment_method: { card },
    });

    await client.transactions.credit({ amount: 500, payment_method: { customer: { id: 'c1' } } });
    expect(JSON.parse(lastCall(calls).body as string)).toMatchObject({
      type: 'credit',
      amount: 500,
    });
  });

  it('captures with and without a body', async () => {
    const { client, calls } = createClient();
    await client.transactions.capture('txn 1', { amount: 1000 });
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/transaction/txn%201/capture',
      body: { amount: 1000 },
    });
    await client.transactions.capture('txn1');
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/transaction/txn1/capture',
      body: {},
    });
  });

  it('voids and refunds', async () => {
    const { client, calls } = createClient([
      jsonResponse({ status: 'success', msg: 'success', data: null }),
    ]);
    const voided = await client.transactions.void('txn1');
    expectRequest(lastCall(calls), { method: 'POST', path: '/api/transaction/txn1/void' });
    expect(voided.data).toBeNull();

    await client.transactions.refund('txn1', { amount: 500, surcharge: 0 });
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/transaction/txn1/refund',
      body: { amount: 500, surcharge: 0 },
    });
    await client.transactions.refund('txn1');
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/transaction/txn1/refund',
      body: {},
    });
  });

  it('gets a transaction and unwraps the array response', async () => {
    const { client, calls } = createClient([
      jsonResponse({ status: 'success', msg: 'success', data: [{ id: 'txn1' }], total_count: 1 }),
      jsonResponse({ status: 'success', msg: 'success', data: [], total_count: 0 }),
      jsonResponse({ status: 'success', msg: 'success', data: { id: 'txn1' } }),
    ]);
    const found = await client.transactions.get('txn1');
    expectRequest(lastCall(calls), { method: 'GET', path: '/api/transaction/txn1' });
    expect(found.data).toEqual({ id: 'txn1' });
    expect(found.total_count).toBe(1);
    expect((await client.transactions.get('missing')).data).toBeNull();
    expect((await client.transactions.get('txn1')).data).toEqual({ id: 'txn1' });
  });

  it('searches, calculates amounts and looks up fees', async () => {
    const { client, calls } = createClient();
    await client.transactions.search({ amount: { operator: '>', value: 100 }, limit: 5 });
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/transaction/search',
      body: { amount: { operator: '>', value: 100 }, limit: 5 },
    });
    await client.transactions.search();
    expectRequest(lastCall(calls), { method: 'POST', path: '/api/transaction/search', body: {} });

    await client.transactions.calculateAmounts({
      subtotal: 1000,
      payment_method: 'card',
      cc_bin: '411111',
    });
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/calculate/amounts',
      body: { subtotal: 1000, payment_method: 'card', cc_bin: '411111' },
    });

    await client.transactions.lookupFees({
      type: 'integrations',
      payment_method: 'card',
      base_amount: 1000,
    });
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/lookup/fees',
      body: { type: 'integrations', payment_method: 'card', base_amount: 1000 },
    });
  });

  it('validates ids before sending', async () => {
    const { client, fetch } = createClient();
    await expect(client.transactions.capture('')).rejects.toBeInstanceOf(InvalidArgumentError);
    await expect(client.transactions.get(' ')).rejects.toThrow('transactionId is required');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('passes request options through', async () => {
    const { client, calls } = createClient();
    await client.transactions.sale(
      { amount: 1, payment_method: { card } },
      { headers: { 'X-Trace': 't' } },
    );
    expect(lastCall(calls).headers['X-Trace']).toBe('t');
  });
});
