import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BinLookupResource,
  CartsResource,
  ConfigurationError,
  CustomFieldsResource,
  CustomerVaultResource,
  DEFAULT_TIMEOUT_MS,
  FileBatchesResource,
  GatewayClient,
  InvoicesResource,
  MerchantsResource,
  ProductsResource,
  RecurringResource,
  RulesResource,
  SettlementBatchesResource,
  TerminalsResource,
  TransactionsResource,
  VERSION,
} from '../src/index.js';
import { API_KEY, BASE_URL, createClient, lastCall, mockFetch } from './helpers.js';

describe('GatewayClient configuration', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exposes every resource', () => {
    const { client } = createClient();
    expect(client.transactions).toBeInstanceOf(TransactionsResource);
    expect(client.vault).toBeInstanceOf(CustomerVaultResource);
    expect(client.recurring).toBeInstanceOf(RecurringResource);
    expect(client.invoices).toBeInstanceOf(InvoicesResource);
    expect(client.products).toBeInstanceOf(ProductsResource);
    expect(client.carts).toBeInstanceOf(CartsResource);
    expect(client.customFields).toBeInstanceOf(CustomFieldsResource);
    expect(client.fileBatches).toBeInstanceOf(FileBatchesResource);
    expect(client.binLookup).toBeInstanceOf(BinLookupResource);
    expect(client.settlementBatches).toBeInstanceOf(SettlementBatchesResource);
    expect(client.terminals).toBeInstanceOf(TerminalsResource);
    expect(client.merchants).toBeInstanceOf(MerchantsResource);
    expect(client.rules).toBeInstanceOf(RulesResource);
    expect(client.baseUrl).toBe(BASE_URL);
  });

  it('requires an options object', () => {
    expect(() => new GatewayClient(undefined as never)).toThrow(ConfigurationError);
    expect(() => new GatewayClient(null as never)).toThrow('GatewayClient options are required');
  });

  it('validates the api key', () => {
    const { fetch } = mockFetch();
    expect(() => new GatewayClient({ apiKey: '', baseUrl: BASE_URL, fetch })).toThrow(
      'apiKey is required',
    );
    expect(() => new GatewayClient({ apiKey: '   ', baseUrl: BASE_URL, fetch })).toThrow(
      'apiKey is required',
    );
    expect(() => new GatewayClient({ apiKey: 42 as never, baseUrl: BASE_URL, fetch })).toThrow(
      'apiKey is required',
    );
    expect(() => new GatewayClient({ apiKey: 'pub_abc', baseUrl: BASE_URL, fetch })).toThrow(
      /public key/,
    );
  });

  it('trims the api key before sending it', async () => {
    const { fetch, calls } = mockFetch();
    const client = new GatewayClient({ apiKey: `  ${API_KEY}  `, baseUrl: BASE_URL, fetch });
    await client.terminals.list();
    expect(lastCall(calls).headers.Authorization).toBe(API_KEY);
  });

  it('validates the base url', () => {
    const { fetch } = mockFetch();
    const make = (baseUrl: unknown, extra: Record<string, unknown> = {}) =>
      new GatewayClient({ apiKey: API_KEY, baseUrl: baseUrl as string, fetch, ...extra });
    expect(() => make(undefined)).toThrow('baseUrl is required');
    expect(() => make('')).toThrow('baseUrl is required');
    expect(() => make('not a url')).toThrow('baseUrl is not a valid URL');
    expect(() => make('http://localhost:8080')).toThrow(/must use https/);
    expect(() => make('ftp://gateway.test', { allowInsecureBaseUrl: true })).toThrow(
      /must use https/,
    );
    expect(() => make('https://gateway.test/?x=1')).toThrow(/query string or fragment/);
    expect(() => make('https://gateway.test/#frag')).toThrow(/query string or fragment/);
    expect(make('http://localhost:8080', { allowInsecureBaseUrl: true }).baseUrl).toBe(
      'http://localhost:8080',
    );
    expect(make('https://gateway.test///').baseUrl).toBe('https://gateway.test');
    expect(make(' https://gateway.test/ ').baseUrl).toBe('https://gateway.test');
    expect(make('https://gateway.test/proxy/').baseUrl).toBe('https://gateway.test/proxy');
  });

  it('validates numeric options', () => {
    const { fetch } = mockFetch();
    const base = { apiKey: API_KEY, baseUrl: BASE_URL, fetch };
    expect(() => new GatewayClient({ ...base, timeoutMs: 0 })).toThrow(
      'timeoutMs must be a positive number',
    );
    expect(() => new GatewayClient({ ...base, timeoutMs: Number.NaN })).toThrow(ConfigurationError);
    expect(() => new GatewayClient({ ...base, maxRetries: -1 })).toThrow(
      'maxRetries must be a non-negative integer',
    );
    expect(() => new GatewayClient({ ...base, maxRetries: 1.5 })).toThrow(ConfigurationError);
    expect(() => new GatewayClient({ ...base, retryDelayMs: -5 })).toThrow(
      'retryDelayMs must be a non-negative number',
    );
    expect(() => new GatewayClient({ ...base, retryDelayMs: Number.POSITIVE_INFINITY })).toThrow(
      ConfigurationError,
    );
    expect(
      new GatewayClient({ ...base, timeoutMs: 1, maxRetries: 2, retryDelayMs: 0 }),
    ).toBeInstanceOf(GatewayClient);
  });

  it('uses the global fetch by default and fails clearly when it is missing', () => {
    const globalFetch = vi.fn();
    vi.stubGlobal('fetch', globalFetch);
    expect(new GatewayClient({ apiKey: API_KEY, baseUrl: BASE_URL })).toBeInstanceOf(GatewayClient);
    vi.stubGlobal('fetch', undefined);
    expect(() => new GatewayClient({ apiKey: API_KEY, baseUrl: BASE_URL })).toThrow(
      /fetch implementation is required/,
    );
  });

  it('applies default headers, user agent and timeout', async () => {
    const { client, calls } = createClient([], { headers: { 'X-Tenant': 't1' } });
    await client.terminals.list();
    const call = lastCall(calls);
    expect(call.headers['X-Tenant']).toBe('t1');
    expect(call.headers['User-Agent']).toBe(
      `cloud-payments-node-sdk/${VERSION} node/${process.version}`,
    );
    expect(DEFAULT_TIMEOUT_MS).toBe(180_000);
  });

  it('allows overriding the user agent', async () => {
    const { client, calls } = createClient([], { userAgent: 'my-app/2.0' });
    await client.terminals.list();
    expect(lastCall(calls).headers['User-Agent']).toBe('my-app/2.0');
  });
});
