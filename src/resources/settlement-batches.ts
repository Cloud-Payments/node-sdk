import { pathParam } from '../http.js';
import type { ApiResponse, RequestOptions } from '../types/common.js';
import type {
  SettlementBatchSearchRequest,
  SettlementBatchSearchResult,
} from '../types/settlement.js';
import { Resource } from './base.js';

/** Settlement batches. */
export class SettlementBatchesResource extends Resource {
  /** Search settlement batches (`POST /api/settlement/batch/search`). */
  async search(
    request: SettlementBatchSearchRequest = {},
    options?: RequestOptions,
  ): Promise<ApiResponse<SettlementBatchSearchResult> & { total_count?: number }> {
    return this.http.post<SettlementBatchSearchResult>(
      '/api/settlement/batch/search',
      request,
      undefined,
      options,
    );
  }

  /** Settle an individual terminal (`POST /api/terminal/{terminalId}/settle`). */
  async settleTerminal(
    terminalId: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<unknown>> {
    return this.http.post<unknown>(
      `/api/terminal/${pathParam(terminalId, 'terminalId')}/settle`,
      undefined,
      undefined,
      options,
    );
  }
}
