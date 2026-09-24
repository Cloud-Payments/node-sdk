import { pathParam } from '../http.js';
import type { ApiResponse, FileUpload, RequestOptions } from '../types/common.js';
import type { FileBatch } from '../types/batches.js';
import { Resource } from './base.js';

/**
 * File batches: upload a CSV of transactions, poll its status and download the results
 * (`/api/filebatch`). Results are available for 10 days after completion.
 */
export class FileBatchesResource extends Resource {
  /** Upload a transactions CSV (`POST /api/filebatch`). */
  async upload(file: FileUpload, options?: RequestOptions): Promise<ApiResponse<FileBatch>> {
    return this.http.postFile<FileBatch>('/api/filebatch', file, options);
  }

  /** Retrieve batch status (`GET /api/filebatch/{batchId}`). */
  get(batchId: string, options?: RequestOptions): Promise<ApiResponse<FileBatch>> {
    return this.http.get<FileBatch>(
      `/api/filebatch/${pathParam(batchId, 'batchId')}`,
      undefined,
      options,
    );
  }

  /**
   * Download the results CSV of a completed batch (`GET /api/filebatch/{batchId}/download`).
   * Rejects with an {@link ApiError} while the batch is not in `completed` status.
   */
  async download(
    batchId: string,
    options?: RequestOptions,
  ): Promise<{ text: string; correlation_id?: string }> {
    return this.http.getText(`/api/filebatch/${pathParam(batchId, 'batchId')}/download`, options);
  }
}
