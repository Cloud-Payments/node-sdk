import { pathParam } from '../http.js';
import type { ApiListResponse, ApiResponse, RequestOptions } from '../types/common.js';
import type {
  AmountsCalculation,
  AmountsCalculationRequest,
  CaptureRequest,
  FeeLookup,
  FeeLookupRequest,
  RefundRequest,
  Transaction,
  TransactionRequest,
  TransactionSearchRequest,
} from '../types/transactions.js';
import { Resource } from './base.js';

/**
 * Process and manage transactions.
 *
 * Authorization responses can take well over a minute; the client's default timeout of
 * 180 seconds follows the gateway's recommendation for these calls.
 */
export class TransactionsResource extends Resource {
  /**
   * Process a transaction (`POST /api/transaction`).
   *
   * Prefer the typed helpers {@link sale}, {@link authorize}, {@link verify} and {@link credit}
   * unless the transaction type is determined at runtime.
   *
   * A **declined** transaction resolves normally with `data.response === "declined"`; only
   * transport and gateway errors reject.
   */
  async create(
    request: TransactionRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<Transaction>> {
    return this.http.post<Transaction>('/api/transaction', request, undefined, options);
  }

  /** Authorize and capture in a single call. */
  async sale(
    request: Omit<TransactionRequest, 'type'>,
    options?: RequestOptions,
  ): Promise<ApiResponse<Transaction>> {
    return this.create({ ...request, type: 'sale' }, options);
  }

  /** Authorize now and {@link capture} later. */
  async authorize(
    request: Omit<TransactionRequest, 'type'>,
    options?: RequestOptions,
  ): Promise<ApiResponse<Transaction>> {
    return this.create({ ...request, type: 'authorize' }, options);
  }

  /** Verify a payment method without charging it. `amount` is not required. */
  async verify(
    request: Omit<TransactionRequest, 'type' | 'amount'> & { amount?: number },
    options?: RequestOptions,
  ): Promise<ApiResponse<Transaction>> {
    return this.create({ ...request, type: 'verification' }, options);
  }

  /** Issue a credit (blind credit; requires the matching merchant permission). */
  async credit(
    request: Omit<TransactionRequest, 'type'>,
    options?: RequestOptions,
  ): Promise<ApiResponse<Transaction>> {
    return this.create({ ...request, type: 'credit' }, options);
  }

  /** Capture a previously authorized transaction (`POST /api/transaction/{id}/capture`). */
  async capture(
    transactionId: string,
    request: CaptureRequest = {},
    options?: RequestOptions,
  ): Promise<ApiResponse<Transaction>> {
    return this.http.post<Transaction>(
      `/api/transaction/${pathParam(transactionId, 'transactionId')}/capture`,
      request,
      undefined,
      options,
    );
  }

  /**
   * Void a transaction that is pending settlement (`POST /api/transaction/{id}/void`).
   * Processed as an auth reversal where applicable. The gateway returns `data: null`.
   */
  async void(
    transactionId: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<Transaction | null>> {
    return this.http.post<Transaction | null>(
      `/api/transaction/${pathParam(transactionId, 'transactionId')}/void`,
      undefined,
      undefined,
      options,
    );
  }

  /**
   * Refund a settled transaction (`POST /api/transaction/{id}/refund`).
   * Omit `amount` for a full refund; multiple partial refunds are allowed up to the settled total.
   */
  async refund(
    transactionId: string,
    request: RefundRequest = {},
    options?: RequestOptions,
  ): Promise<ApiResponse<Transaction>> {
    return this.http.post<Transaction>(
      `/api/transaction/${pathParam(transactionId, 'transactionId')}/refund`,
      request,
      undefined,
      options,
    );
  }

  /**
   * Retrieve a transaction (`GET /api/transaction/{id}`).
   *
   * The gateway returns the transaction inside a single-element array; this method unwraps it
   * and returns `data: null` when the array is empty.
   */
  async get(
    transactionId: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<Transaction | null>> {
    const response = await this.http.get<Transaction | Transaction[] | null>(
      `/api/transaction/${pathParam(transactionId, 'transactionId')}`,
      undefined,
      options,
    );
    const data = Array.isArray(response.data) ? (response.data[0] ?? null) : response.data;
    return { ...response, data };
  }

  /**
   * Search transactions (`POST /api/transaction/search`).
   * Without a `created_at` range the gateway defaults to the prior four months.
   */
  async search(
    request: TransactionSearchRequest = {},
    options?: RequestOptions,
  ): Promise<ApiListResponse<Transaction>> {
    return this.http.post<Transaction[]>(
      '/api/transaction/search',
      request,
      undefined,
      options,
    ) as Promise<ApiListResponse<Transaction>>;
  }

  /**
   * Calculate totals including taxes, fees, surcharges, discounts and shipping before submitting a
   * transaction (`POST /api/calculate/amounts`). Pass the result as `amounts` on the transaction.
   */
  async calculateAmounts(
    request: AmountsCalculationRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<AmountsCalculation>> {
    return this.http.post<AmountsCalculation>(
      '/api/calculate/amounts',
      request,
      undefined,
      options,
    );
  }

  /**
   * Look up applicable fees (`POST /api/lookup/fees`).
   * @deprecated Use {@link calculateAmounts}.
   */
  async lookupFees(
    request: FeeLookupRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<FeeLookup>> {
    return this.http.post<FeeLookup>('/api/lookup/fees', request, undefined, options);
  }
}
