import type {
  AmountCents,
  DateRangeSearch,
  DateTimeString,
  Pagination,
  StringSearch,
} from './common.js';

/** Request body for `POST /api/settlement/batch/search`. */
export interface SettlementBatchSearchRequest extends Pagination {
  batch_date?: DateRangeSearch;
  settlement_batch_id?: StringSearch;
}

/** Settlement batch summary row. */
export interface SettlementBatchSummary {
  merchant_id: string;
  batch_date: string;
  processor_id: string;
  processor_name: string;
  num_transactions: number;
  captured: AmountCents;
  credit: AmountCents;
}

/** Settlement batch record. */
export interface SettlementBatch {
  id: string;
  merchant_id: string;
  batch_date: DateTimeString;
  processor_id: string;
  processor_name: string;
  processor_type: string;
  batch_number: number;
  num_transactions: number;
  amount_captured: AmountCents;
  amount_credit: AmountCents;
  net_deposit: AmountCents;
  response_code: number;
  response_message: string;
}

/** Result of a settlement batch search. */
export interface SettlementBatchSearchResult {
  summary: SettlementBatchSummary[];
  results: SettlementBatch[];
}
