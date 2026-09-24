import { describe, it } from 'vitest';
import { createClient, expectRequest, lastCall } from '../helpers.js';

describe('customer vault resource', () => {
  it('manages customers', async () => {
    const { client, calls } = createClient();
    await client.vault.create(
      { description: 'd', default_payment: { token: 'tok' } },
      { validate: true },
    );
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/vault/customer',
      body: { description: 'd', default_payment: { token: 'tok' } },
      query: { validate: 'true' },
    });
    await client.vault.create();
    expectRequest(lastCall(calls), { method: 'POST', path: '/api/vault/customer', body: {} });

    await client.vault.get('cust1');
    expectRequest(lastCall(calls), { method: 'GET', path: '/api/vault/cust1' });

    await client.vault.search({ email: { operator: '=', value: 'a@b.c' } });
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/vault/customer/search',
      body: { email: { operator: '=', value: 'a@b.c' } },
    });
    await client.vault.search();
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/vault/customer/search',
      body: {},
    });

    await client.vault.update('cust1', { notes: 'n' });
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/vault/customer/cust1',
      body: { notes: 'n' },
    });

    await client.vault.delete('cust1');
    expectRequest(lastCall(calls), { method: 'DELETE', path: '/api/vault/cust1' });
  });

  it('manages addresses', async () => {
    const { client, calls } = createClient();
    const address = { first_name: 'A', line_1: '1 St' };
    await client.vault.addresses.create('cust1', address);
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/vault/customer/cust1/address',
      body: address,
    });
    await client.vault.addresses.update('cust1', 'addr1', address);
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/vault/customer/cust1/address/addr1',
      body: address,
    });
    await client.vault.addresses.delete('cust1', 'addr1');
    expectRequest(lastCall(calls), {
      method: 'DELETE',
      path: '/api/vault/customer/cust1/address/addr1',
    });
  });

  it('manages payment methods', async () => {
    const { client, calls } = createClient();
    const pm = client.vault.paymentMethods;
    await pm.createCard(
      'c1',
      { number: '4111111111111111', expiration_date: '1230' },
      { authorize: true, bypass_rule_engine: false },
    );
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/vault/customer/c1/card',
      body: { number: '4111111111111111', expiration_date: '1230' },
      query: { authorize: 'true', bypass_rule_engine: 'false' },
    });
    const ach = {
      account_number: '1',
      routing_number: '2',
      account_type: 'checking' as const,
      sec_code: 'web' as const,
    };
    await pm.createAch('c1', ach);
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/vault/customer/c1/ach',
      body: ach,
    });
    await pm.createFromToken('c1', { token: 'tok' }, { validate: true });
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/vault/customer/c1/token',
      body: { token: 'tok' },
      query: { validate: 'true' },
    });
    await pm.createApplePay('c1', { key_id: 'k', temporary_token: 't' });
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/vault/customer/c1/applepay',
      body: { key_id: 'k', temporary_token: 't' },
    });
    const gpay = {
      signature: 's',
      intermediateSigningKey: {},
      protocolVersion: 'ECv2',
      signedMessage: 'm',
    };
    await pm.createGooglePay('c1', gpay);
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/vault/customer/c1/googlepay',
      body: gpay,
    });

    await pm.updateCard('c1', 'p1', { expiration_date: '1231', flags: ['surcharge_exempt'] });
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/vault/customer/c1/card/p1',
      body: { expiration_date: '1231', flags: ['surcharge_exempt'] },
    });
    await pm.updateAch('c1', 'p1', ach);
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/vault/customer/c1/ach/p1',
      body: ach,
    });
    await pm.updateFromToken('c1', 'p1', { token: 'tok' });
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/vault/customer/c1/token/p1',
      body: { token: 'tok' },
    });

    await pm.deleteCard('c1', 'p1');
    expectRequest(lastCall(calls), { method: 'DELETE', path: '/api/vault/customer/c1/card/p1' });
    await pm.deleteAch('c1', 'p2');
    expectRequest(lastCall(calls), { method: 'DELETE', path: '/api/vault/customer/c1/ach/p2' });
  });
});
