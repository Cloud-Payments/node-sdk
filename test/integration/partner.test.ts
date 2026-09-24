import { afterAll, expect, test } from 'vitest';
import {
  cleanup,
  env,
  partnerGateway,
  partnerIntegration,
  runId,
  skipIfUnavailable,
} from './helpers.js';

partnerIntegration('partner API (sandbox, GATEWAY_PARTNER_API_KEY)', () => {
  const gw = partnerGateway();
  let ruleId = '';

  afterAll(async () => {
    if (ruleId) await cleanup('delete rule', () => gw.rules.delete(ruleId));
  });

  test('fraud rule CRUD', async (ctx) => {
    const rule = {
      name: `SDK proxy block ${runId}`,
      description: 'Created by the SDK integration suite',
      settings: {
        enabled: false,
        enabled_advanced: false,
        enabled_community_rules: false,
        default_community_rule: 'deny' as const,
        default_action_for_flagged_transactions: 'deny',
        whitelisted_ips: [],
      },
      pre: [
        {
          type: 'ip_proxy',
          operator: '=',
          action: 'deny' as const,
          value: 'TOR|VPN',
          notification: 'false',
        },
      ],
      post: [],
    };
    try {
      const created = await gw.rules.create(rule);
      ruleId = created.data.id;
      expect(created.data.name).toBe(rule.name);
    } catch (error) {
      skipIfUnavailable(ctx, error, 'Fraud rules');
    }

    const fetched = await gw.rules.get(ruleId);
    expect(fetched.data.id).toBe(ruleId);

    const all = await gw.rules.list();
    expect(all.data.some((r) => r.id === ruleId)).toBe(true);

    const found = await gw.rules.search({ name: rule.name });
    expect(Array.isArray(found.data)).toBe(true);

    const updated = await gw.rules.update(ruleId, { ...rule, description: 'updated' });
    expect(updated.status).toBe('success');

    const deleted = await gw.rules.delete(ruleId);
    expect(deleted.status).toBe('success');
    ruleId = '';
  });

  test.skipIf(!env.feeScheduleId)(
    'board a merchant, change its status and add a user (GATEWAY_FEE_SCHEDULE_ID)',
    async () => {
      const contact = {
        first_name: 'Sdk',
        last_name: 'Tester',
        company: `SDK Merchant ${runId}`,
        address_line_1: '1 Main St',
        address_line_2: '',
        city: 'Chicago',
        state: 'IL',
        postal_code: '60601',
        country: 'US',
        email: `sdk-${runId}@example.com`,
        phone: '3125551234',
      };
      const created = await gw.merchants.create({
        name: `SDK Merchant ${runId}`,
        description: 'Created by the SDK integration suite',
        status: 'active',
        phone: '3125551234',
        receipt_email: `sdk-${runId}@example.com`,
        fee_schedule_id: env.feeScheduleId ?? '',
        timezone: 'UTC',
        accept_tos: true,
        billing: null,
        billing_contact: contact,
        primary_contact: contact,
        user: {
          username: `sdk_${runId}`,
          name: 'SDK Admin',
          phone: '3125551234',
          email: `sdk-admin-${runId}@example.com`,
          timezone: 'UTC',
          status: 'active',
          role: 'admin',
          send_welcome: false,
          create_api_key: true,
        },
      });
      const merchant = created.data.id;
      expect(merchant).toBeTypeOf('string');
      expect(created.data.api_key ?? '').toMatch(/^api_/);

      const disabled = await gw.merchants.setStatus(merchant, 'disable');
      expect(disabled.status).toBe('success');
      const enabled = await gw.merchants.setStatus(merchant, 'active');
      expect(enabled.data.status).toBe('active');

      const user = await gw.merchants.createUser(merchant, {
        username: `sdk_user_${runId}`,
        name: 'SDK User',
        phone: '3125551234',
        email: `sdk-user-${runId}@example.com`,
        timezone: 'UTC',
        status: 'active',
        role: 'standard',
        create_api_key: false,
      });
      expect(user.data.username).toBe(`sdk_user_${runId}`);
    },
  );

  test.skipIf(!env.webhookId)('webhook test probe (GATEWAY_WEBHOOK_ID)', async () => {
    const merchant = process.env.GATEWAY_MERCHANT_ID ?? '';
    const result = await gw.merchants.webhooks.test(merchant, { webhook_id: env.webhookId ?? '' });
    expect(result.status).toBe('success');
  });
});
