import { describe, expect, it } from 'vitest';
import { createClient, expectRequest, jsonResponse, lastCall } from '../helpers.js';

describe('products resource', () => {
  it('covers every endpoint', async () => {
    const { client, calls } = createClient();
    await client.products.get('m1', 'p1');
    expectRequest(lastCall(calls), { method: 'GET', path: '/api/merchant/m1/product/p1' });
    await client.products.search('m1', { name: { operator: '=', value: 'x' } });
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/merchant/m1/product/search',
      body: { name: { operator: '=', value: 'x' } },
    });
    await client.products.search('m1');
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/merchant/m1/product/search',
      body: {},
    });
    await client.products.list('m1');
    expectRequest(lastCall(calls), { method: 'GET', path: '/api/merchant/m1/product' });
    const product = {
      sku: 'S',
      name: 'N',
      price: 100,
      fixed_amount: true,
      fixed_qty: true,
      description: 'D',
    };
    await client.products.create('m1', product);
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/merchant/m1/product',
      body: product,
    });
    await client.products.update('m1', 'p1', { price: 200 });
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/merchant/m1/product/p1',
      body: { price: 200 },
    });
    await client.products.delete('m1', 'p1');
    expectRequest(lastCall(calls), { method: 'DELETE', path: '/api/merchant/m1/product/p1' });
    await client.products.batchUpload('m1', { content: 'sku,name\n', fileName: 'products.csv' });
    const call = lastCall(calls);
    expect(call.method).toBe('POST');
    expect(call.url).toBe(`${client.baseUrl}/api/merchant/m1/product/batch`);
    expect(call.body).toBeInstanceOf(FormData);
  });
});

describe('carts resource', () => {
  it('covers every endpoint', async () => {
    const { client, calls } = createClient();
    await client.carts.get('m1', 'c1');
    expectRequest(lastCall(calls), { method: 'GET', path: '/api/merchant/m1/cart/c1' });
    await client.carts.search('m1', { name: { operator: '=', value: 'x' } });
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/merchant/m1/cart/search',
      body: { name: { operator: '=', value: 'x' } },
    });
    await client.carts.search('m1');
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/merchant/m1/cart/search',
      body: {},
    });
    await client.carts.list('m1');
    expectRequest(lastCall(calls), { method: 'GET', path: '/api/merchant/m1/cart' });
    const cart = { type: 'normal' as const, name: 'Cart' };
    await client.carts.create('m1', cart);
    expectRequest(lastCall(calls), { method: 'POST', path: '/api/merchant/m1/cart', body: cart });
    await client.carts.update('m1', 'c1', { name: 'New' });
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/merchant/m1/cart/c1',
      body: { name: 'New' },
    });
    await client.carts.delete('m1', 'c1');
    expectRequest(lastCall(calls), { method: 'DELETE', path: '/api/merchant/m1/cart/c1' });
  });
});

describe('custom fields resource', () => {
  it('covers every endpoint', async () => {
    const { client, calls } = createClient();
    const field = { name: 'F', type: 'text', required: true };
    await client.customFields.create(field);
    expectRequest(lastCall(calls), { method: 'POST', path: '/api/customfield', body: field });
    await client.customFields.list();
    expectRequest(lastCall(calls), { method: 'GET', path: '/api/customfields' });
    await client.customFields.listForMerchant('m1');
    expectRequest(lastCall(calls), { method: 'GET', path: '/api/customfields/m1' });
    await client.customFields.get('f1');
    expectRequest(lastCall(calls), { method: 'GET', path: '/api/customfield/f1' });
    await client.customFields.update('f1', field);
    expectRequest(lastCall(calls), { method: 'POST', path: '/api/customfield/f1', body: field });
    await client.customFields.delete('f1');
    expectRequest(lastCall(calls), { method: 'DELETE', path: '/api/customfield/f1' });
  });
});

describe('file batches resource', () => {
  it('uploads, polls and downloads', async () => {
    const { client, calls } = createClient([
      jsonResponse({ status: 'success', msg: 'success', data: { id: 'b1', status: 'pending' } }),
      jsonResponse({ id: 'b1', status: 'completed', num_lines: 1, processed_lines: 1 }),
      new Response('"id","type"\n"t1","sale"\n', {
        status: 200,
        headers: { 'content-type': 'text/csv' },
      }),
    ]);
    const upload = await client.fileBatches.upload({
      content: '"transaction_type","amount"\n"sale","100"\n',
      fileName: 'batch.csv',
    });
    expect(upload.data.id).toBe('b1');
    expect(lastCall(calls).url).toBe(`${client.baseUrl}/api/filebatch`);
    expect(lastCall(calls).body).toBeInstanceOf(FormData);

    const status = await client.fileBatches.get('b1');
    expectRequest(lastCall(calls), { method: 'GET', path: '/api/filebatch/b1' });
    expect(status.data.status).toBe('completed');

    const download = await client.fileBatches.download('b1');
    expectRequest(lastCall(calls), { method: 'GET', path: '/api/filebatch/b1/download' });
    expect(download.text).toContain('"t1","sale"');
  });
});

describe('bin lookup, settlement batches and terminals', () => {
  it('covers every endpoint', async () => {
    const { client, calls } = createClient();
    await client.binLookup.lookup({ bin: '424242', country: 'US', state: 'IL' });
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/lookup/bin/protected',
      body: { bin: '424242', country: 'US', state: 'IL' },
    });

    await client.settlementBatches.search({ limit: 10 });
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/settlement/batch/search',
      body: { limit: 10 },
    });
    await client.settlementBatches.search();
    expectRequest(lastCall(calls), {
      method: 'POST',
      path: '/api/settlement/batch/search',
      body: {},
    });
    await client.settlementBatches.settleTerminal('t1');
    expectRequest(lastCall(calls), { method: 'POST', path: '/api/terminal/t1/settle' });

    await client.terminals.list();
    expectRequest(lastCall(calls), { method: 'GET', path: '/api/terminals' });
    await client.terminals.settle('t1');
    expectRequest(lastCall(calls), { method: 'POST', path: '/api/terminal/t1/settle' });
  });
});
