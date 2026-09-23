import { afterAll, expect, test } from 'vitest';
import {
  TEST_ACH,
  TEST_CARDS,
  billingAddress,
  card,
  cleanup,
  gateway,
  integration,
  runId,
} from './helpers.js';

integration('customer vault (sandbox)', () => {
  const gw = gateway();
  const createdCustomers: string[] = [];
  let customerId = '';
  let defaultPaymentMethodId = '';
  let addressId = '';

  afterAll(async () => {
    for (const id of createdCustomers)
      await cleanup(`delete customer ${id}`, () => gw.vault.delete(id));
  });

  test('create a customer with a card and billing address', async () => {
    const response = await gw.vault.create({
      description: `SDK integration ${runId}`,
      default_payment: { card: { number: TEST_CARDS.approved, expiration_date: '12/30' } },
      default_billing_address: {
        first_name: billingAddress.first_name,
        last_name: billingAddress.last_name,
        line_1: billingAddress.address_line_1,
        city: billingAddress.city,
        state: billingAddress.state,
        postal_code: billingAddress.postal_code,
        country: billingAddress.country,
        email: billingAddress.email,
        phone: billingAddress.phone,
      },
    });

    expect(response.status).toBe('success');
    customerId = response.data.id;
    createdCustomers.push(customerId);
    const customer = response.data.data.customer;
    expect(customer.payments.cards).toHaveLength(1);
    expect(customer.payments.cards[0]?.masked_number).toMatch(/1111$/);
    expect(customer.defaults.payment_method_type).toBe('card');
    defaultPaymentMethodId = customer.defaults.payment_method_id;
    expect(defaultPaymentMethodId).toBeTypeOf('string');
    expect(customer.addresses.length).toBeGreaterThanOrEqual(1);
  });

  test('get, search and update the customer', async () => {
    const fetched = await gw.vault.get(customerId);
    expect(fetched.data.id).toBe(customerId);
    expect(fetched.data.data.customer.description).toContain(runId);

    const found = await gw.vault.search({ id: { operator: '=', value: customerId }, limit: 5 });
    expect(found.data.some((c) => c.id === customerId)).toBe(true);

    const updated = await gw.vault.update(customerId, {
      description: `updated ${runId}`,
      notes: 'integration notes',
    });
    expect(updated.data.data.customer.description).toBe(`updated ${runId}`);
  });

  test('address create, update and delete', async () => {
    const created = await gw.vault.addresses.create(customerId, {
      first_name: 'Ship',
      last_name: 'To',
      line_1: '456 Oak Ave',
      city: 'Chicago',
      state: 'IL',
      postal_code: '60602',
      country: 'US',
    });
    addressId = created.data.created_address_id ?? '';
    expect(addressId).toBeTypeOf('string');
    expect(addressId).not.toBe('');

    const updated = await gw.vault.addresses.update(customerId, addressId, {
      first_name: 'Ship',
      last_name: 'To',
      line_1: '456 Oak Ave',
      line_2: 'Suite 2',
      city: 'Chicago',
      state: 'IL',
      postal_code: '60602',
      country: 'US',
    });
    expect(
      updated.data.data.customer.addresses.some(
        (a) => a.id === addressId && a.line_2 === 'Suite 2',
      ),
    ).toBe(true);

    const deleted = await gw.vault.addresses.delete(customerId, addressId);
    expect(deleted.status).toBe('success');
  });

  test('card payment method create, update and delete', async () => {
    const created = await gw.vault.paymentMethods.createCard(customerId, {
      number: TEST_CARDS.surchargeable,
      expiration_date: '11/31',
    });
    const cardId = created.data.created_payment_method_id ?? '';
    expect(cardId).not.toBe('');
    expect(created.data.data.customer.payments.cards).toHaveLength(2);

    const updated = await gw.vault.paymentMethods.updateCard(customerId, cardId, {
      expiration_date: '10/32',
    });
    expect(updated.status).toBe('success');

    const deleted = await gw.vault.paymentMethods.deleteCard(customerId, cardId);
    expect(deleted.status).toBe('success');
    const after = await gw.vault.get(customerId);
    expect(after.data.data.customer.payments.cards.some((c) => c.id === cardId)).toBe(false);
  });

  test('ACH payment method create, update and delete', async () => {
    const created = await gw.vault.paymentMethods.createAch(customerId, TEST_ACH);
    const achId = created.data.created_payment_method_id ?? '';
    expect(achId).not.toBe('');
    expect(created.data.data.customer.payments.ach.length).toBeGreaterThanOrEqual(1);

    const updated = await gw.vault.paymentMethods.updateAch(customerId, achId, {
      ...TEST_ACH,
      sec_code: 'ppd',
    });
    expect(updated.status).toBe('success');

    const deleted = await gw.vault.paymentMethods.deleteAch(customerId, achId);
    expect(deleted.status).toBe('success');
  });

  test('charge the stored customer', async () => {
    const response = await gw.transactions.sale({
      amount: 2500,
      payment_method: { customer: { id: customerId, payment_method_id: defaultPaymentMethodId } },
    });
    expect(response.data.response).toBe('approved');
    expect(response.data.customer_id).toBe(customerId);
  });

  test('create_vault_record on a sale creates a customer', async () => {
    const response = await gw.transactions.sale({
      amount: 1100,
      create_vault_record: true,
      payment_method: { card: card() },
      billing_address: billingAddress,
    });
    expect(response.data.response).toBe('approved');
    expect(response.data.customer_id).toBeTypeOf('string');
    expect(response.data.customer_id).not.toBe('');
    createdCustomers.push(response.data.customer_id);

    const customer = await gw.vault.get(response.data.customer_id);
    expect(customer.data.data.customer.payments.cards.length).toBeGreaterThanOrEqual(1);
  });

  test('delete the customer', async () => {
    const deleted = await gw.vault.delete(customerId);
    expect(deleted.status).toBe('success');
    createdCustomers.splice(createdCustomers.indexOf(customerId), 1);
  });
});
