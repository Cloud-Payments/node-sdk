import { randomUUID } from 'node:crypto';
import { expect, test } from 'vitest';
import {
  ApiError,
  AuthenticationError,
  GatewayClient,
  categorizeResponseCode,
} from '../../src/index.js';
import {
  TEST_CARDS,
  billingAddress,
  card,
  env,
  gateway,
  integration,
  runId,
  skipIfUnavailable,
} from './helpers.js';

integration('transactions (sandbox)', () => {
  const gw = gateway();
  let saleId = '';

  test('sale with the approval test card is approved', async () => {
    const response = await gw.transactions.sale({
      amount: 1299,
      currency: 'USD',
      order_id: runId.slice(0, 17),
      description: 'SDK integration sale',
      idempotency_key: randomUUID(),
      payment_method: { card: card() },
      billing_address: billingAddress,
    });

    expect(response.status).toBe('success');
    expect(response.correlation_id).toBeTypeOf('string');
    expect(response.data.id).toBeTypeOf('string');
    expect(response.data.type).toBe('sale');
    expect(response.data.response).toBe('approved');
    expect(response.data.response_code).toBe(100);
    expect(response.data.amount).toBe(1299);
    expect(response.data.response_body.card?.masked_card).toMatch(/1111$/);
    saleId = response.data.id;
  });

  test('re-sending the same idempotency key returns the original transaction', async () => {
    const key = randomUUID();
    const request = { amount: 1500, idempotency_key: key, payment_method: { card: card() } };
    const first = await gw.transactions.sale(request);
    const second = await gw.transactions.sale(request);
    expect(second.data.id).toBe(first.data.id);
  });

  test('decline test card resolves (not throws) with a decline', async () => {
    const response = await gw.transactions.sale({
      amount: 1000,
      payment_method: { card: card(TEST_CARDS.declined) },
    });
    expect(response.status).toBe('success');
    expect(response.data.response).not.toBe('approved');
    expect(categorizeResponseCode(response.data.response_code)).toBe('declined');
  });

  test('partial approval test card authorizes less than the requested amount', async () => {
    const response = await gw.transactions.sale({
      amount: 10000,
      allow_partial_payment: true,
      payment_method: { card: card(TEST_CARDS.partialApproval) },
    });
    expect(response.data.response).toBe('approved');
    expect(response.data.amount_authorized).toBeLessThanOrEqual(10000);
  });

  test('verification does not require an amount', async () => {
    const response = await gw.transactions.verify({
      payment_method: { card: card() },
      billing_address: billingAddress,
    });
    expect(response.data.type).toBe('verification');
    expect(response.data.response).toBe('approved');
  });

  test('authorize, capture, then retrieve', async () => {
    const auth = await gw.transactions.authorize({
      amount: 5000,
      payment_method: { card: card() },
    });
    expect(auth.data.type).toBe('authorize');
    expect(auth.data.response).toBe('approved');

    const captured = await gw.transactions.capture(auth.data.id, { amount: 4500 });
    expect(captured.data.response).toBe('approved');
    expect(captured.data.amount_captured).toBe(4500);

    const fetched = await gw.transactions.get(auth.data.id);
    expect(fetched.data?.id).toBe(auth.data.id);
    expect(fetched.data?.amount_captured).toBe(4500);
  });

  test('authorize then void', async () => {
    const auth = await gw.transactions.authorize({
      amount: 2000,
      payment_method: { card: card() },
    });
    const voided = await gw.transactions.void(auth.data.id);
    expect(voided.status).toBe('success');

    const fetched = await gw.transactions.get(auth.data.id);
    expect(fetched.data?.status).toBe('voided');
  });

  test('refund is accepted once settled, otherwise the gateway rejects it', async () => {
    try {
      const refund = await gw.transactions.refund(saleId, { amount: 100 });
      expect(refund.data.type).toBe('refund');
      expect(refund.data.referenced_transaction_id).toBe(saleId);
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).correlationId).toBeTypeOf('string');
    }
  });

  test('search finds the sale by id', async () => {
    const results = await gw.transactions.search({
      transaction_id: { operator: '=', value: saleId },
      limit: 10,
    });
    expect(results.total_count).toBeGreaterThanOrEqual(1);
    expect(results.data.some((txn) => txn.id === saleId)).toBe(true);
  });

  test('search with a date range and status filter returns typed records', async () => {
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    const results = await gw.transactions.search({
      status: { operator: '=', value: 'pending_settlement' },
      created_at: { start_date: start.toISOString(), end_date: end.toISOString() },
      limit: 5,
    });
    expect(Array.isArray(results.data)).toBe(true);
    for (const txn of results.data) expect(txn.status).toBe('pending_settlement');
  });

  test('unknown transaction id yields null data or a not-found error', async () => {
    try {
      const response = await gw.transactions.get('00000000000000000000');
      expect(response.data).toBeNull();
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
    }
  });

  test('amount calculation returns a calculated object', async (ctx) => {
    try {
      const amounts = await gw.transactions.calculateAmounts({
        subtotal: 1000,
        payment_method: 'card',
        cc_bin: TEST_CARDS.surchargeable,
        country: 'US',
        state: 'IL',
      });
      expect(amounts.status).toBe('success');
      expect(amounts.data).toBeTypeOf('object');
    } catch (error) {
      skipIfUnavailable(ctx, error, 'Amount calculation');
    }
  });

  test('an invalid request is rejected with an ApiError carrying the gateway message', async () => {
    const error = await gw.transactions
      .create({ type: 'sale', amount: 100, payment_method: {} })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).httpStatus).toBeGreaterThanOrEqual(400);
    expect((error as ApiError).message).toContain('/api/transaction');
  });

  test('an invalid API key is rejected with AuthenticationError', async () => {
    const bad = new GatewayClient({
      apiKey: 'api_invalid_key_for_sdk_tests',
      baseUrl: env.baseUrl ?? '',
      allowInsecureBaseUrl: env.allowInsecureBaseUrl,
    });
    await expect(bad.terminals.list()).rejects.toBeInstanceOf(AuthenticationError);
  });
});
