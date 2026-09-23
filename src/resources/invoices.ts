import { pathParam } from '../http.js';
import type { ApiListResponse, ApiResponse, RequestOptions } from '../types/common.js';
import type {
  CreateInvoiceRequest,
  Invoice,
  InvoiceSearchRequest,
  PayInvoiceRequest,
  UpdateInvoiceRequest,
} from '../types/invoices.js';
import type { Transaction } from '../types/transactions.js';
import { Resource } from './base.js';

/**
 * Invoices (`/api/invoice`).
 *
 * When an invoice is paid its id (or `invoice_number`) is written to the transaction's
 * `order_id` and `po_number`, so transactions and invoices can be cross-referenced.
 */
export class InvoicesResource extends Resource {
  /** Retrieve an invoice (`GET /api/invoice/{invoiceId}`). */
  get(invoiceId: string, options?: RequestOptions): Promise<ApiResponse<Invoice>> {
    return this.http.get<Invoice>(
      `/api/invoice/${pathParam(invoiceId, 'invoiceId')}`,
      undefined,
      options,
    );
  }

  /** Search invoices (`POST /api/invoices/search`). */
  async search(
    request: InvoiceSearchRequest = {},
    options?: RequestOptions,
  ): Promise<ApiListResponse<Invoice>> {
    return this.http.post<Invoice[]>(
      '/api/invoices/search',
      request,
      undefined,
      options,
    ) as Promise<ApiListResponse<Invoice>>;
  }

  /** Create an invoice (`POST /api/invoice`). The response includes `hosted_url` for the payment page. */
  async create(
    request: CreateInvoiceRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<Invoice>> {
    return this.http.post<Invoice>('/api/invoice', request, undefined, options);
  }

  /** Update an invoice (`POST /api/invoice/{invoiceId}`). */
  async update(
    invoiceId: string,
    request: UpdateInvoiceRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<Invoice>> {
    return this.http.post<Invoice>(
      `/api/invoice/${pathParam(invoiceId, 'invoiceId')}`,
      request,
      undefined,
      options,
    );
  }

  /** Delete an invoice (`DELETE /api/invoice/{invoiceId}`). */
  async delete(invoiceId: string, options?: RequestOptions): Promise<ApiResponse<null>> {
    return this.http.delete<null>(`/api/invoice/${pathParam(invoiceId, 'invoiceId')}`, options);
  }

  /** Resend invoice notifications (`POST /api/invoice/{invoiceId}/resend`). */
  async resend(invoiceId: string, options?: RequestOptions): Promise<ApiResponse<null>> {
    return this.http.post<null>(
      `/api/invoice/${pathParam(invoiceId, 'invoiceId')}/resend`,
      undefined,
      undefined,
      options,
    );
  }

  /**
   * Pay an invoice (`POST /api/invoice/{id}/pay`).
   * @param invoiceIdOrPublicHash Either the invoice id or its public hash.
   */
  async pay(
    invoiceIdOrPublicHash: string,
    request: PayInvoiceRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<Transaction>> {
    return this.http.post<Transaction>(
      `/api/invoice/${pathParam(invoiceIdOrPublicHash, 'invoiceIdOrPublicHash')}/pay`,
      request,
      undefined,
      options,
    );
  }
}
