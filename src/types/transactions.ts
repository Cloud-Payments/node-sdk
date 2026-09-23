import type {
  Address,
  AmountCents,
  CurrencyCode,
  DateRangeSearch,
  DateTimeString,
  IntSearch,
  Pagination,
  StringSearch,
} from './common.js';

/** Transaction types accepted by `POST /api/transaction`. */
export type TransactionType = 'sale' | 'authorize' | 'verification' | 'credit';

/** All transaction types that can appear on a transaction record. */
export type TransactionRecordType = TransactionType | 'capture' | 'void' | 'refund' | (string & {});

/** Lifecycle status of a transaction. */
export type TransactionStatus =
  | 'unknown'
  | 'declined'
  | 'authorized'
  | 'pending_settlement'
  | 'pending'
  | 'settled'
  | 'voided'
  | 'reversed'
  | 'refunded'
  | 'partially_refunded'
  | 'returned'
  | 'late_return'
  | 'flagged'
  | 'flagged_partner'
  | (string & {});

/** Where a transaction originated. */
export type TransactionSource =
  'api' | 'cp' | 'cart' | 'invoice' | 'recurring' | 'batch' | (string & {});

/** 3-D Secure data collected by an external authentication provider. */
export interface CardholderAuthentication {
  /** ECI indicator, for example `"05"`. */
  eci?: string;
  cavv?: string;
  xid?: string;
  cryptogram?: string;
  /** 3DS version, `"1"` or `"2"`. */
  version?: string;
  ds_transaction_id?: string;
  acs_transaction_id?: string;
}

/** Card payment method. */
export interface CardPaymentMethod {
  /** `"keyed"` or `"swiped"`. */
  entry_type?: 'keyed' | 'swiped';
  /** Card number, digits only. */
  number: string;
  /** Expiration date in `MM/YY` format. */
  expiration_date?: string;
  /** Card verification code. Required when the gateway rule requires CVC. */
  cvc?: string;
  track_1?: string;
  track_2?: string;
  encrypted_track_1?: string;
  encrypted_track_2?: string;
  /** KSN used to encrypt the supplied encrypted tracks. */
  ksn?: string;
  /** Optional 3DS data. When passed it must contain valid values. */
  cardholder_authentication?: CardholderAuthentication;
  /** Card brand, used with decrypted wallet tokens (for example `"visa"`). */
  card_type?: string;
  /** Token requestor id, used with decrypted wallet tokens. */
  card_brand_token_requestor_id?: string;
}

/** EMV data captured from a chip reader. */
export interface EmvData {
  /** Map of EMV TLV packets as hex encoded strings. */
  tlv_data?: Record<string, string>;
  device_serial_number?: string;
}

/** Charge a payment method stored in the Customer Vault. */
export interface CustomerPaymentMethod {
  /** Customer Vault id. */
  id: string;
  /** Stored payment method id. Defaults to the customer's default payment method. */
  payment_method_id?: string;
  /** Type of the payment method referenced by `payment_method_id`. */
  payment_method_type?: 'card' | 'ach';
  billing_address_id?: string;
  shipping_address_id?: string;
}

/** Account holder authentication for ACH. */
export interface AccountholderAuthentication {
  /** Driver's license state. */
  dl_state: string;
  /** Driver's license number. */
  dl_number: string;
}

/** ACH SEC codes. */
export type AchSecCode = 'web' | 'ccd' | 'ppd' | 'tel';

/** ACH payment method. */
export interface AchPaymentMethod {
  routing_number: string;
  account_number: string;
  sec_code: AchSecCode;
  account_type: 'checking' | 'savings';
  /** Required when `sec_code` is `"tel"`. */
  check_number?: string;
  /** Available on select ACH providers. */
  funding_speed?: 'standard' | 'sameday';
  accountholder_authentication?: AccountholderAuthentication;
}

/** Physical terminal payment method. */
export interface TerminalPaymentMethod {
  /** Terminal id. */
  id: string;
  expiration_date?: string;
  cvc?: string;
  /** Receipt copies to print. */
  print_receipt: 'no' | 'customer' | 'merchant' | 'both';
  /** Request the terminal capture a signature (if supported). */
  signature_required: boolean;
}

/** Supported alternative payment method types. */
export type ApmType =
  'alipay' | 'dragonpay' | 'wechatpay' | 'oxxo' | 'klarna' | 'sepa' | (string & {});

/** Alternative payment method (Klarna, OXXO, Alipay, SEPA…). */
export interface ApmPaymentMethod {
  type: ApmType;
  /** URL the customer is redirected to after payment. */
  merchant_redirect_url: string;
  /** Locale for the payment page, for example `"en-US"`. */
  locale: string;
  /** Render the mobile version of the landing page (if supported). */
  mobile_view: boolean;
  /** Consumer's national id (max 30 characters). */
  national_id?: string;
  /** Unique customer reference (`[a-z0-9-]`, max 20 characters). */
  consumer_ref?: string;
  /** SEPA */
  consumer_id?: string;
  /** SEPA */
  iban?: string;
  /** SEPA: merchant assigned mandate reference. */
  mandate_reference?: string;
  /** SEPA */
  mandate_url?: string;
  /** SEPA: `YYYY-MM-DD`. */
  mandate_signature_date?: string;
  /** OXXO: `YYYY-MM-DD` voucher expiry date. */
  due_date?: string;
  /** Klarna */
  payment_method_category?:
    'direct_debit' | 'direct_bank_transfer' | 'pay_now' | 'pay_later' | 'pay_over_time';
  /** Klarna */
  purchase_type?: 'buy' | 'rent' | 'book' | 'subscribe' | 'download' | 'order' | 'continue';
  /** Klarna: hosted payment page title. */
  hpp_title?: string;
  /** Klarna: hosted payment page logo. */
  logo_url?: string;
}

/** Apple Pay `PKPaymentToken` as produced by Apple Pay JS / Payment Request API. */
export interface ApplePayPaymentToken {
  paymentData: {
    data: string;
    signature: string;
    header: {
      publicKeyHash: string;
      ephemeralPublicKey: string;
      transactionId: string;
    };
    version: string;
  };
  paymentMethod?: {
    displayName?: string;
    network?: string;
    type?: string;
  };
  transactionIdentifier?: string;
}

/** Apple Pay payment method. Production only. */
export interface ApplePayPaymentMethod {
  /** One-time token from Wallet.js (25 letters and digits, 5 minute lifetime). */
  temporary_token?: string;
  /** Registered Apple Pay credential id (20 characters). Required with `pkpaymenttoken`. */
  key_id?: string;
  /** Encrypted token from the Apple Pay client. */
  pkpaymenttoken?: ApplePayPaymentToken;
}

/**
 * Google Pay token from `paymentData.paymentMethodData.tokenizationData.token`, either the raw
 * JSON string or the parsed object. Production only.
 */
export type GooglePayToken = string | Record<string, unknown>;

/**
 * Payment method container. Exactly one of the payment method properties must be set
 * (`emv` accompanies `card` for chip transactions).
 */
export interface PaymentMethod {
  card?: CardPaymentMethod;
  emv?: EmvData;
  ach?: AchPaymentMethod;
  customer?: CustomerPaymentMethod;
  terminal?: TerminalPaymentMethod;
  /** Token from the Tokenizer. */
  token?: string;
  apm?: ApmPaymentMethod;
  apple_pay_token?: ApplePayPaymentMethod;
  google_pay_token?: GooglePayToken;
}

/** Payment adjustment (convenience fee, service fee, surcharge). */
export interface PaymentAdjustment {
  type: 'flat' | 'percentage';
  /** Cents for `"flat"` (`199` = $1.99) or thousandths of a percent for `"percentage"` (`1000` = 1.000%). */
  value: number;
}

/** Line item on a transaction (also used for Level 3 data). */
export interface LineItem {
  /** Up to 50 characters. */
  name?: string;
  /** Up to 50 characters. */
  description?: string;
  /** Product code / SKU, up to 50 characters. */
  product_code?: string;
  /** Commodity code, up to 12 characters (Level 3). */
  commodity_code?: string;
  /** Quantity `##.##`. */
  quantity?: number;
  /** Unit price in cents. */
  unit_price?: AmountCents;
  /** Total amount for the line in cents. */
  amount?: AmountCents;
  tax_amount?: AmountCents;
  national_tax_amount?: AmountCents;
  discount_amount?: AmountCents;
  freight_amount?: AmountCents;
  /** 3 decimal rate, `10% = "10.000"`. */
  national_tax_rate?: string;
  /** 3 decimal rate, `10% = "10.000"`. */
  tax_rate?: string;
  unit_of_measure?: string;
  /** Klarna: tax amount per item. */
  local_tax?: AmountCents;
}

/** Custom descriptor shown on the cardholder's statement (processor dependent). */
export interface Descriptor {
  /** Max 38 characters. */
  name?: string;
  /** Max 38 characters. */
  address?: string;
  /** Max 21 characters. */
  city?: string;
  /** Max 2 characters. */
  state?: string;
  /** Max 5 characters. */
  postal_code?: string;
}

/** Processor-specific options. */
export interface ProcessorSpecific {
  paysafe_direct?: {
    subscription_trial_solution?: boolean;
    /** `YYYY-MM-DD` */
    subscription_start_date?: string;
    subscription_trial_start_date?: string;
    subscription_trial_end_date?: string;
    subscription_secondary_billing_date?: string;
    subscription_cancel_url?: string;
    subscription_amount?: AmountCents;
    subscription_unit_cost?: AmountCents;
    subscription_item_quantity?: number;
    subscription_product_desc?: string;
  };
}

/** HSA / FSA amounts. */
export interface HsaAmounts {
  total: AmountCents;
  rx_amount?: AmountCents;
  vision_amount?: AmountCents;
  clinic_amount?: AmountCents;
  dental_amount?: AmountCents;
}

/**
 * Custom field values keyed by custom field id. Values are always arrays of strings, even for a
 * single value.
 */
export type CustomFieldValues = Record<string, string[]>;

/** Request body for `POST /api/transaction`. */
export interface TransactionRequest {
  type: TransactionType;
  /** Final amount to charge in cents, including all fees and taxes. */
  amount?: AmountCents;
  /** Base amount in cents; surcharge and related fees are calculated and added by the gateway. */
  base_amount?: AmountCents;
  /** ISO 4217 currency. Defaults to `"USD"`. */
  currency?: CurrencyCode;
  /** Processor to use. Required if no default processor is configured. */
  processor_id?: string;
  payment_method: PaymentMethod;
  /** Up to 17 alphanumeric characters. Required for Level 3. */
  order_id?: string;
  /** Up to 17 alphanumeric characters. */
  po_number?: string;
  /** Max 255 characters. */
  description?: string;
  /** IPv4 or IPv6 address of the end user (no port). */
  ip_address?: string;
  /** Special field, only use if instructed by support. */
  vendor_id?: string;
  /** UUID used to detect duplicate requests. */
  idempotency_key?: string;
  /** Idempotency TTL in seconds (default 300). */
  idempotency_time?: number;
  tax_amount?: AmountCents;
  tax_exempt?: boolean;
  shipping_amount?: AmountCents;
  discount_amount?: AmountCents;
  tip_amount?: AmountCents;
  payment_adjustment?: PaymentAdjustment;
  billing_address?: Address;
  shipping_address?: Address;
  line_items?: LineItem[];
  /** Custom field group name. Required when the custom fields belong to a non-default group. */
  group_name?: string;
  custom_fields?: CustomFieldValues;
  processor_specific?: ProcessorSpecific;
  /** Create a customer vault record after a successful transaction. */
  create_vault_record?: boolean;
  /** Add the payment method to this existing customer id after a successful transaction. */
  create_vault_record_for?: string;
  /** Send an email receipt (`email_address` required). */
  email_receipt?: boolean;
  email_address?: string;
  descriptor?: Descriptor;
  /** Allow partial approvals (processor dependent). */
  allow_partial_payment?: boolean;
  /** Amount in cents to process as a secondary transaction on the split processor. */
  split_transaction_amount?: AmountCents;
  /** Level 3: 4 alphanumeric characters. */
  summary_commodity_code?: string;
  /** Level 3. */
  ship_from_postal_code?: string;
  national_tax_amount?: AmountCents;
  duty_amount?: AmountCents;
  merchant_vat_registration_number?: string;
  customer_vat_registration_number?: string;
  /** Card-on-file indicator: `"C"` general storage, `"R"` recurring. */
  card_on_file_indicator?: 'C' | 'R';
  /** Who initiated the transaction. */
  initiated_by?: 'customer' | 'merchant';
  /** Transaction id used when the credential was stored (not needed with gateway tokenization). */
  initial_transaction_id?: string;
  stored_credential_indicator?: 'used' | 'stored';
  /** Defaults to `"straight"`. */
  billing_method?: 'straight' | 'initial_recurring' | 'recurring';
  /** Required for HSA/FSA: `"verified"` or `"exempt"`. */
  iias_status?: 'verified' | 'exempt';
  additional_amounts?: { hsa?: HsaAmounts };
  /** Pre-calculated amounts from the amount calculation endpoint. */
  amounts?: AmountsCalculation;
}

/** Request body for `POST /api/transaction/{id}/capture`. */
export interface CaptureRequest {
  /** Total amount to capture in cents. Defaults to the authorized amount. */
  amount?: AmountCents;
  tax_amount?: AmountCents;
  shipping_amount?: AmountCents;
  tax_exempt?: boolean;
  /** Max 17 characters. */
  order_id?: string;
  /** Max 17 characters. */
  po_number?: string;
  ip_address?: string;
}

/** Request body for `POST /api/transaction/{id}/refund`. */
export interface RefundRequest {
  /** Amount to refund in cents. Omit for a full refund. */
  amount?: AmountCents;
  /** Surcharge amount in cents. */
  surcharge?: AmountCents;
}

/** Card details on a transaction response. */
export interface CardResponseBody {
  id: string;
  card_type: string;
  first_six: string;
  last_four: string;
  masked_card: string;
  expiration_date: string;
  response: string;
  response_code: number;
  auth_code: string;
  processor_response_code: string;
  processor_response_text: string;
  processor_transaction_id?: string;
  processor_type: string;
  processor_id: string;
  bin_type: string;
  /** `"debit"` / `"credit"`. */
  type: string;
  avs_response_code: string;
  cvv_response_code: string;
  processor_specific: unknown;
  created_at: DateTimeString;
  updated_at: DateTimeString;
}

/** ACH details on a transaction response. */
export interface AchResponseBody {
  id: string;
  account_type: string;
  masked_account_number: string;
  routing_number: string;
  sec_code: string;
  response: string;
  response_code: number;
  auth_code: string;
  processor_response_code: string;
  processor_response_text: string;
  processor_type: string;
  processor_id: string;
  processor_specific: unknown;
  created_at: DateTimeString;
  updated_at: DateTimeString;
}

/** Terminal details on a transaction response. */
export interface TerminalResponseBody {
  id: string;
  card_type: string;
  payment_type: string;
  entry_type: string;
  first_four: string;
  last_four: string;
  masked_card: string;
  cardholder_name: string;
  auth_code: string;
  response_code: number;
  processor_response_text: string;
  /** Processor specific values, for example `BatchNum`. */
  processor_specific: Record<string, string>;
  emv_aid: string;
  emv_app_name: string;
  emv_tvr: string;
  emv_tsi: string;
  signature_data: string;
  created_at: DateTimeString;
  updated_at: DateTimeString;
}

/** Payment-method specific response body. Only the relevant member is present. */
export interface TransactionResponseBody {
  card?: CardResponseBody;
  ach?: AchResponseBody;
  terminal?: TerminalResponseBody;
  apm?: Record<string, unknown>;
  cash?: Record<string, unknown>;
}

/** Address as returned on a transaction. */
export interface TransactionAddress {
  first_name: string;
  last_name: string;
  company: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
  fax: string;
  email: string;
}

/** A transaction record as returned by the gateway. */
export interface Transaction {
  id: string;
  user_id: string;
  user_name?: string;
  merchant_id?: string;
  merchant_name?: string;
  idempotency_key: string;
  idempotency_time: number;
  type: TransactionRecordType;
  status: TransactionStatus;
  /** `"approved"`, `"declined"`, … */
  response: string;
  response_code: number;
  transaction_source: TransactionSource;
  amount: AmountCents;
  base_amount?: AmountCents;
  amount_authorized: AmountCents;
  amount_captured: AmountCents;
  amount_settled: AmountCents;
  amount_refunded?: AmountCents;
  payment_adjustment?: AmountCents;
  tip_amount?: AmountCents;
  surcharge?: AmountCents;
  service_fee?: AmountCents;
  tax_amount: AmountCents;
  tax_exempt: boolean;
  shipping_amount: AmountCents;
  discount_amount?: AmountCents;
  national_tax_amount?: AmountCents;
  duty_amount?: AmountCents;
  ship_from_postal_code?: string;
  summary_commodity_code?: string;
  merchant_vat_registration_number?: string;
  customer_vat_registration_number?: string;
  processor_id: string;
  processor_type: string;
  processor_name?: string;
  payment_method: string;
  payment_type: string;
  features?: string[];
  currency: string;
  description: string;
  settlement_batch_id: string;
  order_id: string;
  po_number: string;
  ip_address: string;
  email_receipt: boolean;
  email_address?: string;
  customer_id: string;
  customer_payment_type?: string;
  customer_payment_id?: string;
  subscription_id: string;
  referenced_transaction_id: string;
  response_body: TransactionResponseBody;
  custom_fields?: Record<string, string[]> | null;
  line_items?: LineItem[] | null;
  billing_address: TransactionAddress;
  shipping_address: TransactionAddress;
  /** Present when a split transaction was processed. */
  split_transaction_response?: Record<string, unknown>;
  receipt_data?: string;
  created_at: DateTimeString;
  updated_at: DateTimeString;
  captured_at: DateTimeString | null;
  settled_at: DateTimeString | null;
}

/** Address search fields for transaction search. */
export interface TransactionAddressSearch {
  address_id?: StringSearch;
  first_name?: StringSearch;
  last_name?: StringSearch;
  company?: StringSearch;
  address_line_1?: StringSearch;
  address_line_2?: StringSearch;
  city?: StringSearch;
  state?: StringSearch;
  postal_code?: StringSearch;
  country?: StringSearch;
  email?: StringSearch;
  phone?: StringSearch;
  fax?: StringSearch;
}

/** Request body for `POST /api/transaction/search`. */
export interface TransactionSearchRequest extends Pagination {
  transaction_id?: StringSearch;
  user_id?: StringSearch;
  type?: StringSearch;
  ip_address?: StringSearch;
  amount?: IntSearch;
  amount_authorized?: IntSearch;
  amount_captured?: IntSearch;
  amount_settled?: IntSearch;
  tax_amount?: IntSearch;
  po_number?: StringSearch;
  order_id?: StringSearch;
  payment_method?: StringSearch;
  payment_type?: StringSearch;
  status?: StringSearch;
  processor_id?: StringSearch;
  customer_id?: StringSearch;
  settlement_batch_id?: StringSearch;
  /** Defaults to the prior four months when omitted. */
  created_at?: DateRangeSearch;
  captured_at?: DateRangeSearch;
  settled_at?: DateRangeSearch;
  billing_address?: TransactionAddressSearch;
  shipping_address?: TransactionAddressSearch;
}

/** Amount component accepted by the amount calculation endpoint. */
export interface AmountComponent {
  type: 'flat' | 'percentage';
  /** Cents for `"flat"`, thousandths of a percent for `"percentage"` (`10000` = 10.000%). */
  value: number;
  /** Add the calculated amount to the total. */
  include?: boolean;
}

/** Product reference for amount calculation. */
export interface AmountsProduct {
  id: string;
  name: string;
  price: string;
  description?: string;
  local_tax?: string;
  national_tax?: string;
  fixed_amount?: boolean;
  fixed_qty?: boolean;
  unit_of_measure?: string | null;
}

/** Line item for amount calculation. */
export interface AmountsLineItem {
  id: string;
  status: 'paid' | 'pending' | 'rejected';
  type: 'flat' | 'percentage';
  name: string;
  description?: string;
  unit_price: AmountCents;
  quantity: number;
  quantity_shipped?: number;
  product_code?: string;
  commodity_code?: string;
  unit_of_measure?: string;
  alternate_tax_identifier?: string;
  taxable?: boolean;
  local_tax_rate?: string;
  national_tax_rate?: string;
  tax_rate?: string;
  discount_amount?: number;
  freight_amount?: number;
  discount_rate?: string;
}

/** Flags controlling amount calculation. */
export interface AmountsFlags {
  skip_cash_discount?: boolean;
  skip_surcharge?: boolean;
  skip_service_fee?: boolean;
  skip_consumer_choice?: boolean;
  include_default_tax_to_total?: boolean;
  tax_exempt?: boolean;
  processor_surcharge_fallback?: boolean;
  add_tax_to_total?: boolean;
}

/** Request body for `POST /api/calculate/amounts`. */
export interface AmountsCalculationRequest {
  /** Base amount in cents. Required unless `line_items` or `products` are provided. */
  amount?: AmountCents;
  /** Required when `line_items` and `products` are both empty. */
  subtotal?: AmountCents;
  processor_id?: string;
  currency?: CurrencyCode;
  payment_method?: 'card' | 'ach' | 'token' | 'terminal' | 'cash' | 'apple_pay_token';
  transaction_type?: 'verification' | 'auth' | 'sale' | 'void' | 'refund' | 'credit';
  customer_id?: string;
  /** Required if `customer_id` and `payment_method` are both set. */
  payment_method_id?: string;
  token?: string;
  /** Card number digits (minimum 6). Pass the full number for the most accurate results. */
  cc_bin?: string;
  cc_type?: string;
  country?: string;
  state?: string;
  source?: string;
  products?: AmountsProduct[];
  line_items?: AmountsLineItem[];
  tax_amount?: AmountComponent;
  national_tax_amount?: AmountComponent;
  local_tax_amount?: AmountComponent;
  service_fee?: AmountComponent;
  surcharge?: AmountComponent;
  processor_payment_adjustment?: AmountComponent;
  shipping_amount?: AmountComponent;
  discount_amount?: AmountComponent[];
  addon_amount?: AmountComponent[];
  duty_amount?: AmountComponent;
  tip_amount?: AmountComponent;
  additional_amounts?: AmountComponent[];
  flags?: AmountsFlags;
}

/**
 * Calculated amounts returned by `POST /api/calculate/amounts`. Pass the object back as the
 * `amounts` field of a transaction request. The gateway documents this object as opaque, so only
 * the base amount is typed; every other calculated component is exposed through the index signature.
 */
export interface AmountsCalculation {
  amount?: AmountCents;
  [key: string]: unknown;
}

/** Request body for the deprecated `POST /api/lookup/fees` endpoint. */
export interface FeeLookupRequest {
  /** Always `"integrations"`. */
  type: 'integrations';
  type_id?: string;
  state?: string;
  /** 6–19 digits of the card number. */
  bin?: string;
  customer_id?: string;
  payment_id?: string;
  payment_method: 'card' | 'ach';
  base_amount: AmountCents;
}

/** Response of the deprecated fee lookup endpoint. */
export interface FeeLookup {
  service_fee: AmountCents;
  payment_adjustment: { value: number; type: string };
  requested_amount: AmountCents;
  discount_amount: AmountCents | null;
  surcharge: AmountCents;
}
