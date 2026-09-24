/**
 * Types shared across resources.
 * Field names intentionally mirror the gateway's JSON (snake_case) so the SDK can be used
 * side by side with the gateway's own API reference.
 */

/** Amount in the smallest currency unit (cents for USD): `1299` = $12.99. */
export type AmountCents = number;

/** ISO 4217 currency code, for example `"USD"`. */
export type CurrencyCode = string;

/** ISO 8601 / RFC 3339 timestamp string, for example `"2024-01-31T23:59:59Z"`. */
export type DateTimeString = string;

/** Operators accepted by string search fields. */
export type StringSearchOperator = '=' | '!=';

/** Operators accepted by numeric search fields. */
export type NumericSearchOperator = '=' | '!=' | '<' | '>';

/** Match or exclude a string value. */
export interface StringSearch {
  operator: StringSearchOperator;
  value: string;
}

/** Compare an integer value. */
export interface IntSearch {
  operator: NumericSearchOperator;
  value: number;
}

/** Match a date range (UTC timestamps such as `"2024-01-01T00:00:00Z"`). */
export interface DateRangeSearch {
  start_date: DateTimeString;
  end_date: DateTimeString;
}

/** Pagination parameters accepted by search endpoints. */
export interface Pagination {
  /** Maximum records to return (typically 1–100). */
  limit?: number;
  /** Number of records to skip. */
  offset?: number;
}

/** Address as used on transactions, invoices and merchant contacts. */
export interface Address {
  /** Up to 50 characters. */
  first_name?: string;
  /** Up to 50 characters. */
  last_name?: string;
  /** Up to 100 characters. */
  company?: string;
  /** Up to 100 characters. */
  address_line_1?: string;
  /** Up to 100 characters. */
  address_line_2?: string;
  /** Up to 50 characters. */
  city?: string;
  /** State abbreviation, for example `"IL"`. */
  state?: string;
  postal_code?: string;
  /** Two-letter country code, for example `"US"`. */
  country?: string;
  /** Must be a valid email address. */
  email?: string;
  /** Digits only. */
  phone?: string;
  /** Digits only. */
  fax?: string;
}

/**
 * Standard response envelope returned by every gateway endpoint.
 *
 * The SDK adds `correlation_id` from the `x-correlation-id` response header; quote it when
 * contacting support.
 */
export interface ApiResponse<TData> {
  /** `"success"` for every response returned by the SDK (failures are thrown as {@link ApiError}). */
  status: string;
  /** Human-readable message from the gateway. */
  msg: string;
  /** Response payload. */
  data: TData;
  /** Total number of matching records (search / list endpoints only). */
  total_count?: number;
  /** Value of the `x-correlation-id` response header. */
  correlation_id?: string;
}

/** Response envelope for search and list endpoints. */
export interface ApiListResponse<TItem> extends ApiResponse<TItem[]> {
  total_count: number;
}

/** Per-request options accepted by every SDK method. */
export interface RequestOptions {
  /** Abort the request from the caller's side. */
  signal?: AbortSignal;
  /** Override the client-level timeout for this request, in milliseconds. */
  timeoutMs?: number;
  /** Extra HTTP headers for this request. */
  headers?: Record<string, string>;
  /** Override the client-level `maxRetries` for this request. */
  maxRetries?: number;
  /**
   * Mark a request as safe to retry. By default only `GET`/`DELETE` requests and `POST`
   * requests carrying an `idempotency_key` are retried.
   */
  idempotent?: boolean;
}

/** Query-string parameter values. `undefined` values are omitted. */
export type QueryParams = Record<string, string | number | boolean | undefined>;

/** A file to upload (CSV batches). */
export interface FileUpload {
  /** File contents. */
  content: Blob | Uint8Array | ArrayBuffer | string;
  /** File name sent in the multipart body, for example `"transactions.csv"`. */
  fileName: string;
  /** MIME type of the file. Defaults to `text/csv`. */
  contentType?: string;
}
