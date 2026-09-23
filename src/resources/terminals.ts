import { pathParam } from '../http.js';
import type { ApiListResponse, ApiResponse, RequestOptions } from '../types/common.js';
import type { Terminal } from '../types/terminals.js';
import { Resource } from './base.js';

/**
 * Physical terminals. Process terminal transactions through
 * `transactions.sale({ payment_method: { terminal: { id, print_receipt, signature_required } } })`.
 */
export class TerminalsResource extends Resource {
  /** List all terminals, including inactive ones (`GET /api/terminals`). */
  async list(options?: RequestOptions): Promise<ApiListResponse<Terminal>> {
    return this.http.get<Terminal[]>('/api/terminals', undefined, options) as Promise<
      ApiListResponse<Terminal>
    >;
  }

  /** Settle an individual terminal (`POST /api/terminal/{terminalId}/settle`). */
  async settle(terminalId: string, options?: RequestOptions): Promise<ApiResponse<unknown>> {
    return this.http.post<unknown>(
      `/api/terminal/${pathParam(terminalId, 'terminalId')}/settle`,
      undefined,
      undefined,
      options,
    );
  }
}
