import { afterAll, beforeAll, expect, test } from 'vitest';
import { ApiError } from '../../src/index.js';
import {
  cleanup,
  gateway,
  integration,
  merchantId,
  runId,
  skipIfUnavailable,
  sleep,
} from './helpers.js';

integration('products, carts and custom fields (sandbox)', () => {
  const gw = gateway();
  let merchant = '';
  const productIds: string[] = [];
  const cartIds: string[] = [];
  const customFieldIds: string[] = [];

  beforeAll(async () => {
    merchant = await merchantId();
  });

  afterAll(async () => {
    for (const id of cartIds)
      await cleanup(`delete cart ${id}`, () => gw.carts.delete(merchant, id));
    for (const id of productIds)
      await cleanup(`delete product ${id}`, () => gw.products.delete(merchant, id));
    for (const id of customFieldIds)
      await cleanup(`delete custom field ${id}`, () => gw.customFields.delete(id));
  });

  test('product CRUD', async (ctx) => {
    let productId = '';
    try {
      const created = await gw.products.create(merchant, {
        sku: `sku${runId}`.slice(0, 20),
        name: `product ${runId}`,
        price: 1500,
        fixed_amount: true,
        fixed_qty: false,
        description: 'SDK product',
      });
      productId = created.data.id;
      productIds.push(productId);
      expect(created.data.price).toBe(1500);
    } catch (error) {
      skipIfUnavailable(ctx, error, 'Products');
    }

    const fetched = await gw.products.get(merchant, productId);
    expect(fetched.data.id).toBe(productId);

    const list = await gw.products.list(merchant);
    expect(list.data.some((p) => p.id === productId)).toBe(true);

    const found = await gw.products.search(merchant, {
      name: { operator: '=', value: `product ${runId}` },
    });
    expect(found.data.some((p) => p.id === productId)).toBe(true);

    const updated = await gw.products.update(merchant, productId, {
      sku: `sku${runId}`.slice(0, 20),
      name: `product ${runId}`,
      price: 1600,
      fixed_amount: true,
      fixed_qty: false,
      description: 'SDK product updated',
    });
    expect(updated.data.price).toBe(1600);

    const deleted = await gw.products.delete(merchant, productId);
    expect(deleted.status).toBe('success');
    productIds.splice(productIds.indexOf(productId), 1);
  });

  test('product CSV batch upload', async (ctx) => {
    const csv = [
      'sku,name,price,fixed_amount,fixed_qty,description',
      `b1${runId},Batch one ${runId},1000,true,false,SDK batch product`,
      `b2${runId},Batch two ${runId},0,false,false,Pay any amount`,
      '',
    ].join('\n');
    try {
      const result = await gw.products.batchUpload(merchant, {
        content: csv,
        fileName: 'products.csv',
      });
      expect(result.data.total).toBe(2);
      expect(result.data.imported).toBe(2);
      expect(result.data.failed).toBe(0);
      productIds.push(...result.data.products.map((p) => p.id));
    } catch (error) {
      skipIfUnavailable(ctx, error, 'Product batch upload');
    }
  });

  test('cart CRUD', async (ctx) => {
    let cartId = '';
    try {
      const created = await gw.carts.create(merchant, {
        type: 'normal',
        name: `cart ${runId}`,
        description: 'SDK cart',
        payments: ['card'],
        show_available_products: true,
      });
      cartId = created.data.id;
      cartIds.push(cartId);
      expect(created.data.name).toBe(`cart ${runId}`);
    } catch (error) {
      skipIfUnavailable(ctx, error, 'Carts');
    }

    const fetched = await gw.carts.get(merchant, cartId);
    expect(fetched.data.id).toBe(cartId);

    const list = await gw.carts.list(merchant);
    expect(list.data.some((c) => c.id === cartId)).toBe(true);

    const found = await gw.carts.search(merchant, {
      name: { operator: '=', value: `cart ${runId}` },
    });
    expect(found.data.some((c) => c.id === cartId)).toBe(true);

    const updated = await gw.carts.update(merchant, cartId, {
      type: 'normal',
      name: `cart ${runId} updated`,
    });
    expect(updated.data.name).toBe(`cart ${runId} updated`);

    const deleted = await gw.carts.delete(merchant, cartId);
    expect(deleted.status).toBe('success');
    cartIds.splice(cartIds.indexOf(cartId), 1);
  });

  test('custom field CRUD and use on a transaction', async (ctx) => {
    let fieldId = '';
    try {
      const created = await gw.customFields.create({
        name: `field ${runId}`,
        type: 'text',
        group_name: 'default',
        required: false,
        validation_type: 'open',
        values: null,
      });
      fieldId = created.data.id;
      customFieldIds.push(fieldId);
      expect(created.data.name).toBe(`field ${runId}`);
    } catch (error) {
      skipIfUnavailable(ctx, error, 'Custom fields');
    }

    const fetched = await gw.customFields.get(fieldId);
    expect(fetched.data.id).toBe(fieldId);

    const all = await gw.customFields.list();
    expect(all.data.some((f) => f.id === fieldId)).toBe(true);

    const forMerchant = await gw.customFields.listForMerchant(merchant);
    expect(forMerchant.data.some((f) => f.id === fieldId)).toBe(true);

    const updated = await gw.customFields.update(fieldId, {
      name: `field ${runId}`,
      type: 'text',
      group_name: 'default',
      required: false,
      validation_type: 'open',
      values: null,
    });
    expect(updated.status).toBe('success');

    const sale = await gw.transactions.sale({
      amount: 700,
      payment_method: {
        card: { number: '4111111111111111', expiration_date: '12/30', cvc: '123' },
      },
      custom_fields: { [fieldId]: ['integration'] },
    });
    expect(sale.data.response).toBe('approved');
    expect(sale.data.custom_fields?.[fieldId]).toEqual(['integration']);

    const deleted = await gw.customFields.delete(fieldId);
    expect(deleted.status).toBe('success');
    customFieldIds.splice(customFieldIds.indexOf(fieldId), 1);
  });
});

integration('file batches (sandbox)', () => {
  const gw = gateway();

  test('upload a transaction CSV, poll its status and download the results', async (ctx) => {
    const csv = [
      '"transaction_type","amount","cc_number","cc_expiration"',
      '"sale","100","4111111111111111","12/30"',
      '',
    ].join('\n');
    let batchId = '';
    try {
      const upload = await gw.fileBatches.upload({ content: csv, fileName: `batch-${runId}.csv` });
      batchId = upload.data.id;
      expect(upload.data.file_name).toBeTypeOf('string');
      expect(upload.data.num_lines).toBe(1);
    } catch (error) {
      skipIfUnavailable(ctx, error, 'File batches');
    }

    let batch = await gw.fileBatches.get(batchId);
    expect(batch.data.id).toBe(batchId);
    const deadline = Date.now() + 60_000;
    while (!['completed', 'failed'].includes(batch.data.status) && Date.now() < deadline) {
      await sleep(5000);
      batch = await gw.fileBatches.get(batchId);
    }

    if (batch.data.status === 'completed') {
      const download = await gw.fileBatches.download(batchId);
      expect(download.text.split('\n')[0]).toContain('"id"');
    } else {
      const error = await gw.fileBatches.download(batchId).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ApiError);
    }
  });
});
