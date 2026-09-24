import { afterAll, expect, test } from 'vitest';
import type { CreateInvoiceRequest } from '../../src/index.js';
import { ApiError } from '../../src/index.js';
import { card, cleanup, gateway, integration, runId } from './helpers.js';

function invoiceRequest(overrides: Partial<CreateInvoiceRequest> = {}): CreateInvoiceRequest {
  const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  return {
    currency: 'USD',
    company_name: 'SDK Test Co',
    customer_number: runId,
    payable_to: {
      company: 'SDK Test Co',
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
      email: 'jane.doe@example.com',
    },
    date_due: dueDate,
    items: [
      {
        name: 'Widget',
        description: 'SDK widget',
        quantity: 1,
        unit_price: 10000,
        status: 'pending',
      },
    ],
    tax_percent: '0.000',
    tax: 0,
    payment_methods: ['card'],
    card_processor_id: '',
    ach_processor_id: '',
    message: 'SDK integration invoice',
    send_via: 'none',
    ...overrides,
  };
}

integration('invoices (sandbox)', () => {
  const gw = gateway();
  const invoiceIds: string[] = [];

  afterAll(async () => {
    for (const id of invoiceIds)
      await cleanup(`delete invoice ${id}`, () => gw.invoices.delete(id));
  });

  test('create, get, search and update', async () => {
    const created = await gw.invoices.create(invoiceRequest());
    const id = created.data.id;
    invoiceIds.push(id);
    expect(created.data.status).toBe('pending');
    expect(created.data.total).toBe(10000);
    expect(created.data.amount_due).toBe(10000);
    expect(created.data.hosted_url).toMatch(/^https?:\/\//);

    const fetched = await gw.invoices.get(id);
    expect(fetched.data.id).toBe(id);

    const found = await gw.invoices.search({ id: { operator: '=', value: id }, limit: 5 });
    expect(found.data.some((i) => i.id === id)).toBe(true);

    const updated = await gw.invoices.update(id, invoiceRequest({ message: `updated ${runId}` }));
    expect(updated.data.message).toBe(`updated ${runId}`);
  });

  test('resend succeeds or is rejected when no delivery channel is configured', async () => {
    const created = await gw.invoices.create(invoiceRequest());
    invoiceIds.push(created.data.id);
    try {
      const resent = await gw.invoices.resend(created.data.id);
      expect(resent.status).toBe('success');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
    }
  });

  test('pay an invoice in full with a card', async () => {
    const created = await gw.invoices.create(invoiceRequest());
    invoiceIds.push(created.data.id);

    const payment = await gw.invoices.pay(created.data.id, { payment_method: { card: card() } });
    expect(payment.data.response).toBe('approved');
    expect(payment.data.amount).toBe(10000);

    const paid = await gw.invoices.get(created.data.id);
    expect(paid.data.amount_paid).toBe(10000);
    expect(paid.data.amount_due).toBe(0);
    expect(paid.data.status).toBe('paid');
  });

  test('partial payment by amount', async () => {
    const created = await gw.invoices.create(
      invoiceRequest({ allow_partial_payment: true, settings: { partial_payment_type: 'amount' } }),
    );
    invoiceIds.push(created.data.id);

    const payment = await gw.invoices.pay(created.data.id, {
      payment_method: { card: card() },
      partial_payment_amount: 3000,
    });
    expect(payment.data.response).toBe('approved');
    expect(payment.data.amount).toBe(3000);

    const partiallyPaid = await gw.invoices.get(created.data.id);
    expect(partiallyPaid.data.amount_paid).toBe(3000);
    expect(partiallyPaid.data.amount_due).toBe(7000);
    expect(partiallyPaid.data.status).toBe('partially_paid');
  });

  test('delete an unpaid invoice', async () => {
    const created = await gw.invoices.create(invoiceRequest());
    const deleted = await gw.invoices.delete(created.data.id);
    expect(deleted.status).toBe('success');
  });
});
