import { expect, test } from 'vitest';
import { env, gateway, integration, skipIfUnavailable } from './helpers.js';

integration('BIN lookup, settlement batches and terminals (sandbox)', () => {
  const gw = gateway();

  test('BIN lookup returns card metadata', async (ctx) => {
    try {
      const result = await gw.binLookup.lookup({ bin: '424242', country: 'US', state: 'IL' });
      expect(result.status).toBe('success');
      expect(result.data).toBeTypeOf('object');
    } catch (error) {
      skipIfUnavailable(ctx, error, 'BIN lookup');
    }
  });

  test('settlement batch search returns summary and results', async () => {
    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    const result = await gw.settlementBatches.search({
      batch_date: { start_date: start.toISOString(), end_date: end.toISOString() },
      limit: 10,
      offset: 0,
    });
    expect(result.status).toBe('success');
    expect(Array.isArray(result.data.results ?? [])).toBe(true);
  });

  test('terminals list', async () => {
    const result = await gw.terminals.list();
    expect(result.status).toBe('success');
    expect(Array.isArray(result.data ?? [])).toBe(true);
  });

  test.skipIf(!env.terminalId)('settle a terminal (GATEWAY_TERMINAL_ID)', async () => {
    const result = await gw.terminals.settle(env.terminalId ?? '');
    expect(result.status).toBe('success');
  });

  test('deprecated fee lookup', async (ctx) => {
    try {
      const fees = await gw.transactions.lookupFees({
        type: 'integrations',
        payment_method: 'card',
        base_amount: 1000,
        bin: '4005519200000004',
        state: 'IL',
      });
      expect(fees.status).toBe('success');
    } catch (error) {
      skipIfUnavailable(ctx, error, 'Fee lookup');
    }
  });
});
