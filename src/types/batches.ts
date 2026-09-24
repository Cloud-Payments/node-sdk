import type { DateTimeString } from './common.js';

/** File batch status. */
export type FileBatchStatus =
  'unknown' | 'pending' | 'queued' | 'processing' | 'failed' | 'completed' | (string & {});

/** File batch record. */
export interface FileBatch {
  id: string;
  user_id?: string;
  file_name: string;
  status: FileBatchStatus;
  num_lines: number;
  processed_lines?: number;
  created_at: DateTimeString;
  updated_at: DateTimeString;
}
