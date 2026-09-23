import type { ApiResponse, RequestOptions } from '../types/common.js';
import type { BinLookup, BinLookupRequest } from '../types/bin-lookup.js';
import { Resource } from './base.js';

/** BIN lookup (`POST /api/lookup/bin/protected`). */
export class BinLookupResource extends Resource {
  /**
   * Look up card metadata and surchargeability by BIN, Tokenizer token or vaulted customer.
   * Provide `country` and `state` to have `is_surchargeable` evaluated for that region.
   */
  async lookup(
    request: BinLookupRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<BinLookup>> {
    return this.http.post<BinLookup>('/api/lookup/bin/protected', request, undefined, options);
  }
}
