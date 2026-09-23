import { randomUUID } from 'node:crypto';
import { describe, type TestContext } from 'vitest';
import { ApiError, GatewayClient } from '../../src/index.js';

/** Environment-driven configuration for the integration suite. */
export const env = {
  apiKey: process.env.GATEWAY_API_KEY?.trim() || undefined,
  baseUrl: process.env.GATEWAY_BASE_URL?.trim() || undefined,
  partnerApiKey: process.env.GATEWAY_PARTNER_API_KEY?.trim() || undefined,
  feeScheduleId: process.env.GATEWAY_FEE_SCHEDULE_ID?.trim() || undefined,
  terminalId: process.env.GATEWAY_TERMINAL_ID?.trim() || undefined,
  webhookId: process.env.GATEWAY_WEBHOOK_ID?.trim() || undefined,
  allowInsecureBaseUrl: process.env.GATEWAY_ALLOW_INSECURE_BASE_URL === 'true',
};

export const hasCredentials = Boolean(env.apiKey && env.baseUrl);
export const hasPartnerCredentials = Boolean(env.partnerApiKey && env.baseUrl);

/** `describe` that is skipped when merchant credentials are not configured. */
export function integration(name: string, factory: () => void): void {
  describe.skipIf(!hasCredentials)(name, factory);
}

/** `describe` that is skipped when partner credentials are not configured. */
export function partnerIntegration(name: string, factory: () => void): void {
  describe.skipIf(!hasPartnerCredentials)(name, factory);
}

/**
 * Vitest still collects skipped suites, so the client must be constructible without credentials.
 * These placeholders are only ever used by suites that are skipped.
 */
const PLACEHOLDER_KEY = 'api_missing_credentials';
const PLACEHOLDER_URL = 'https://gateway.invalid';

/** Unique suffix so records created by this run are easy to find and never collide. */
export const runId = `sdk${Date.now().toString(36)}${randomUUID().slice(0, 4)}`;

let merchantClient: GatewayClient | undefined;
let partnerClient: GatewayClient | undefined;

/** Merchant client built from GATEWAY_API_KEY / GATEWAY_BASE_URL. */
export function gateway(): GatewayClient {
  merchantClient ??= new GatewayClient({
    apiKey: env.apiKey ?? PLACEHOLDER_KEY,
    baseUrl: env.baseUrl ?? PLACEHOLDER_URL,
    allowInsecureBaseUrl: env.allowInsecureBaseUrl,
    maxRetries: 1,
  });
  return merchantClient;
}

/** Partner client built from GATEWAY_PARTNER_API_KEY / GATEWAY_BASE_URL. */
export function partnerGateway(): GatewayClient {
  partnerClient ??= new GatewayClient({
    apiKey: env.partnerApiKey ?? PLACEHOLDER_KEY,
    baseUrl: env.baseUrl ?? PLACEHOLDER_URL,
    allowInsecureBaseUrl: env.allowInsecureBaseUrl,
    maxRetries: 1,
  });
  return partnerClient;
}

/** Sandbox test cards (see docs/testing.md). */
export const TEST_CARDS = {
  approved: '4111111111111111',
  declined: '4000000000000002',
  partialApproval: '4000000000000051',
  surchargeable: '4005519200000004',
} as const;

export function card(number: string = TEST_CARDS.approved) {
  return { number, expiration_date: '12/30', cvc: '123' };
}

export const TEST_ACH = {
  account_number: '111111111',
  routing_number: '111111111',
  account_type: 'checking' as const,
  sec_code: 'web' as const,
};

export const billingAddress = {
  first_name: 'Jane',
  last_name: 'Doe',
  address_line_1: '123 Main St',
  city: 'Chicago',
  state: 'IL',
  postal_code: '60601',
  country: 'US',
  email: 'jane.doe@example.com',
  phone: '3125551234',
};

/**
 * Skip the current test when the gateway reports that a feature is not available to this
 * account (HTTP 400/401/403/404). Any other error is rethrown so real failures still surface.
 */
export function skipIfUnavailable(ctx: TestContext, error: unknown, feature: string): never {
  if (error instanceof ApiError && [400, 401, 403, 404].includes(error.httpStatus)) {
    ctx.skip(
      `${feature} is not available for this account (HTTP ${error.httpStatus}: ${error.msg ?? error.message})`,
    );
  }
  throw error;
}

let cachedMerchantId: string | undefined;

/**
 * Resolve the merchant id behind the API key. Uses the `owner_id` of a throw-away vault record,
 * falling back to the `merchant_id` on a small verification transaction.
 */
export async function merchantId(): Promise<string> {
  if (cachedMerchantId) return cachedMerchantId;
  const gw = gateway();
  try {
    const customer = await gw.vault.create({ description: `merchant lookup ${runId}` });
    cachedMerchantId = customer.data.owner_id;
    await gw.vault.delete(customer.data.id).catch(() => undefined);
  } catch {
    const verification = await gw.transactions.verify({ payment_method: { card: card() } });
    cachedMerchantId = verification.data.merchant_id ?? verification.data.user_id;
  }
  if (!cachedMerchantId) throw new Error('Could not determine the merchant id for the API key');
  return cachedMerchantId;
}

/** Run a cleanup step without letting its failure mask the test result. */
export async function cleanup(label: string, action: () => Promise<unknown>): Promise<void> {
  try {
    await action();
  } catch (error) {
    console.warn(`cleanup failed (${label}):`, error instanceof Error ? error.message : error);
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
