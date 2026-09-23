import { describe, it } from 'vitest';
import type { CreateInvoiceRequest } from '../../src/index.js';
import { createClient, expectRequest, lastCall } from '../helpers.js';

const invoice: CreateInvoiceRequest = {
  currency: 'USD',
  payable_to: { address_line_1: '1', city: 'c', state: 'IL', postal_code: '60000', country: 'US' },
  bill_to: { address_line_1: '2', city: 'c', state: 'IL', postal_code: '60000', country: 'US' },
  date_due: '2026-01-01T00:00:00Z',
  items: [{ status: 'pending', unit_price: 100, quantity: 1 }],
  payment_methods: ['card'],
  card_processor_id: '',
  ach_processor_id: '',
  send_via: 'none',
};

describe('invoices resource', () => {
  it('covers every endpoint', async () => {
    const { client, calls } = createClient();
    await client.invoices.get('inv1');
    expectRequest(lastCall(calls), { method: 'GET', path: '/api/invoice/inv1' });
    await client.invoices.search({ amount_due: { operator: '>', value: 0 } });
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/invoices/search',
      body: { amount_due: { operator: '>', value: 0 } },
    });
    await client.invoices.search();
    expectRequest(lastCall(calls), { method: 'POST', path: '/api/invoices/search', body: {} });
    await client.invoices.create(invoice);
    expectRequest(lastCall(calls), { method: 'POST', path: '/api/invoice', body: invoice });
    await client.invoices.update('inv1', { message: 'm' });
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/invoice/inv1',
      body: { message: 'm' },
    });
    await client.invoices.delete('inv1');
    expectRequest(lastCall(calls), { method: 'DELETE', path: '/api/invoice/inv1' });
    await client.invoices.resend('inv1');
    expectRequest(lastCall(calls), { method: 'POST', path: '/api/invoice/inv1/resend' });
    const pay = { payment_method: { token: 'tok' }, partial_payment_amount: 500 };
    await client.invoices.pay('public-hash', pay);
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/invoice/public-hash/pay',
      body: pay,
    });
  });
});
