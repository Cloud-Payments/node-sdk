/** Request body for `POST /api/lookup/bin/protected`. Provide one of `bin`, `temp_token` or `customer_id`. */
export interface BinLookupRequest {
  /** Card BIN, 6 or more digits. */
  bin?: string;
  /** Temporary token from the Tokenizer. */
  temp_token?: string;
  /** Customer vault id. */
  customer_id?: string;
  /** Specific stored card when `customer_id` is set. */
  payment_method_id?: string;
  /** Two-letter country code (used with `state` for surchargeability). */
  country?: string;
  /** State / region code. */
  state?: string;
}

/** BIN metadata. */
export interface BinLookup {
  bin: string;
  card_brand: string;
  issuing_bank: string;
  card_type: string;
  card_level_generic: string;
  country: string;
  is_surchargeable: boolean;
  payment_method_type: string;
}
