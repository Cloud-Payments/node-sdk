import { ConfigurationError } from './errors.js';
import { HttpClient, type FetchLike } from './http.js';
import {
  BinLookupResource,
  CartsResource,
  CustomFieldsResource,
  CustomerVaultResource,
  FileBatchesResource,
  InvoicesResource,
  MerchantsResource,
  ProductsResource,
  RecurringResource,
  RulesResource,
  SettlementBatchesResource,
  TerminalsResource,
  TransactionsResource,
} from './resources/index.js';
import { VERSION } from './version.js';

/** Default request timeout. The gateway recommends at least 180 seconds for authorizations. */
export const DEFAULT_TIMEOUT_MS = 180_000;

/** Options for {@link GatewayClient}. */
export interface GatewayClientOptions {
  /**
   * Private API key (`api_…`). Public keys (`pub_…`) are client-side only and are rejected.
   * Never expose this key in browsers, emails or support tickets.
   */
  apiKey: string;
  /**
   * Base URL of your gateway environment, for example `https://sandbox.<your-gateway>.com`
   * or your white-labelled production host. No trailing slash or path is needed.
   */
  baseUrl: string;
  /** Request timeout in milliseconds. Defaults to {@link DEFAULT_TIMEOUT_MS}. */
  timeoutMs?: number;
  /**
   * Number of retries for retryable failures (network errors, timeouts, HTTP 429 and 5xx).
   * Only `GET`/`DELETE` requests and requests carrying an `idempotency_key` are retried.
   * Defaults to `0`.
   */
  maxRetries?: number;
  /** Base delay for exponential backoff between retries, in milliseconds. Defaults to `500`. */
  retryDelayMs?: number;
  /** Custom `fetch` implementation (defaults to the global `fetch`). */
  fetch?: FetchLike;
  /** Extra headers sent with every request. */
  headers?: Record<string, string>;
  /** Override the `User-Agent` header. */
  userAgent?: string;
  /** Allow a plain `http://` base URL (local development only). */
  allowInsecureBaseUrl?: boolean;
}

/**
 * Entry point of the SDK.
 *
 * ```ts
 * import { GatewayClient } from '@cloud-payments/node-sdk';
 *
 * const gateway = new GatewayClient({
 *   apiKey: process.env.GATEWAY_API_KEY!,
 *   baseUrl: 'https://sandbox.your-gateway.com',
 * });
 *
 * const { data: txn } = await gateway.transactions.sale({
 *   amount: 1299,
 *   payment_method: { card: { number: '4111111111111111', expiration_date: '12/30', cvc: '123' } },
 * });
 * ```
 */
export class GatewayClient {
  /** Process sales, authorizations, captures, voids, refunds and searches. */
  readonly transactions: TransactionsResource;
  /** Store customers, addresses and payment methods. */
  readonly vault: CustomerVaultResource;
  /** Add-ons, discounts, plans and subscriptions. */
  readonly recurring: RecurringResource;
  /** Create, send and pay invoices. */
  readonly invoices: InvoicesResource;
  /** Merchant products. */
  readonly products: ProductsResource;
  /** Hosted shopping carts. */
  readonly carts: CartsResource;
  /** Custom transaction fields. */
  readonly customFields: CustomFieldsResource;
  /** CSV transaction batches. */
  readonly fileBatches: FileBatchesResource;
  /** Card BIN metadata. */
  readonly binLookup: BinLookupResource;
  /** Settlement batches. */
  readonly settlementBatches: SettlementBatchesResource;
  /** Physical terminals. */
  readonly terminals: TerminalsResource;
  /** Partner API: merchant boarding, processors, users, webhooks. */
  readonly merchants: MerchantsResource;
  /** Partner API: fraud rules. */
  readonly rules: RulesResource;

  private readonly http: HttpClient;

  constructor(options: GatewayClientOptions) {
    this.http = new HttpClient(resolveOptions(options));
    this.transactions = new TransactionsResource(this.http);
    this.vault = new CustomerVaultResource(this.http);
    this.recurring = new RecurringResource(this.http);
    this.invoices = new InvoicesResource(this.http);
    this.products = new ProductsResource(this.http);
    this.carts = new CartsResource(this.http);
    this.customFields = new CustomFieldsResource(this.http);
    this.fileBatches = new FileBatchesResource(this.http);
    this.binLookup = new BinLookupResource(this.http);
    this.settlementBatches = new SettlementBatchesResource(this.http);
    this.terminals = new TerminalsResource(this.http);
    this.merchants = new MerchantsResource(this.http);
    this.rules = new RulesResource(this.http);
  }

  /** Normalised base URL the client sends requests to. */
  get baseUrl(): string {
    return this.http.baseUrl;
  }
}

function resolveOptions(
  options: GatewayClientOptions,
): ConstructorParameters<typeof HttpClient>[0] {
  if (typeof options !== 'object' || options === null) {
    throw new ConfigurationError('GatewayClient options are required');
  }
  const apiKey = typeof options.apiKey === 'string' ? options.apiKey.trim() : '';
  if (apiKey === '') {
    throw new ConfigurationError('apiKey is required');
  }
  if (apiKey.startsWith('pub_')) {
    throw new ConfigurationError(
      'apiKey is a public key (pub_…). Public keys are for client-side tokenization only; use your private API key (api_…) for server-side requests.',
    );
  }

  const baseUrl = normaliseBaseUrl(options.baseUrl, options.allowInsecureBaseUrl ?? false);

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new ConfigurationError('timeoutMs must be a positive number');
  }
  const maxRetries = options.maxRetries ?? 0;
  if (!Number.isInteger(maxRetries) || maxRetries < 0) {
    throw new ConfigurationError('maxRetries must be a non-negative integer');
  }
  const retryDelayMs = options.retryDelayMs ?? 500;
  if (!Number.isFinite(retryDelayMs) || retryDelayMs < 0) {
    throw new ConfigurationError('retryDelayMs must be a non-negative number');
  }

  const fetchImpl: FetchLike | undefined = options.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    throw new ConfigurationError(
      'A fetch implementation is required (Node 22+ provides one globally)',
    );
  }

  return {
    apiKey,
    baseUrl,
    timeoutMs,
    maxRetries,
    retryDelayMs,
    fetch: fetchImpl,
    headers: { ...options.headers },
    userAgent: options.userAgent ?? `cloud-payments-node-sdk/${VERSION} node/${process.version}`,
  };
}

function normaliseBaseUrl(value: unknown, allowInsecure: boolean): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ConfigurationError(
      'baseUrl is required, for example "https://sandbox.your-gateway.com"',
    );
  }
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new ConfigurationError(`baseUrl is not a valid URL: ${value}`);
  }
  if (url.protocol !== 'https:' && !(allowInsecure && url.protocol === 'http:')) {
    throw new ConfigurationError(
      `baseUrl must use https (got ${url.protocol}). Set allowInsecureBaseUrl: true to allow http for local development.`,
    );
  }
  if (url.search || url.hash) {
    throw new ConfigurationError('baseUrl must not contain a query string or fragment');
  }
  return url.toString().replace(/\/+$/, '');
}
