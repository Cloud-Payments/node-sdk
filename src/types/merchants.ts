import type { Address, AmountCents, DateTimeString } from './common.js';

/** Merchant permissions (partner API). Any permission not provided defaults to `false`. */
export interface MerchantPermissions {
  support_blind_credits?: boolean;
  allow_rule_engine_access?: boolean;
  allow_invoice_access?: boolean;
  allow_customer_vault_access?: boolean;
  allow_recurring_billing_access?: boolean;
  allow_cart_access?: boolean;
  allow_developer_hub_link?: boolean;
  allow_advanced_fields?: boolean;
  enable_terminal_debit_transactions?: boolean;
  allow_defaults_population?: boolean;
  allow_billing_access?: boolean;
  allow_dashboard_stats?: boolean;
  allow_file_batch?: boolean;
  allow_automatic_account_updater?: boolean;
  allow_surcharge?: boolean;
  allow_midigator?: boolean;
  allow_advanced_rule_engine_features?: boolean;
  allow_dual_pricing?: boolean;
  allow_terminal_credits?: boolean;
  enforce_2fa_requirement?: boolean;
  allow_transaction_reporting_totals?: boolean;
  allow_dual_pricing_v2?: boolean;
  allow_simple_payments_access?: boolean;
  allow_virtual_terminal_session?: boolean;
  require_2fa_for_user_access?: boolean;
  [key: string]: boolean | undefined;
}

/** Contact details for a merchant. */
export type MerchantContact = Required<
  Pick<
    Address,
    | 'first_name'
    | 'last_name'
    | 'company'
    | 'address_line_1'
    | 'city'
    | 'state'
    | 'postal_code'
    | 'country'
    | 'email'
    | 'phone'
  >
> &
  Pick<Address, 'address_line_2' | 'fax'>;

/** User to create with a merchant. */
export interface MerchantUserRequest {
  /** `[a-zA-Z][a-zA-Z_0-9.]{6,50}` */
  username: string;
  name: string;
  /** Digits only. */
  phone: string;
  email: string;
  /** For example `"America/Chicago"`. */
  timezone: string;
  status: 'active' | 'disabled';
  role: 'admin' | 'standard';
  send_welcome?: boolean;
  /** Create and return the private API key. */
  create_api_key?: boolean;
  /** Create and return the public API key. */
  create_pub_api_key?: boolean;
  permissions?: MerchantPermissions;
}

/** Transaction limits. */
export interface TransactionLimits {
  sale?: { single?: AmountCents; daily?: AmountCents; monthly?: AmountCents };
  credit?: { single?: AmountCents; daily?: AmountCents; monthly?: AmountCents };
}

/** Request body for `POST /api/merchant`. */
export interface CreateMerchantRequest {
  name: string;
  description: string;
  status: 'active' | 'disabled';
  website?: string;
  /** Digits only. */
  phone: string;
  receipt_email: string;
  fee_schedule_id: string;
  timezone: string;
  accept_tos?: boolean;
  /** Billing details; `null` to pay fees on behalf of the merchant. */
  billing?: {
    type: 'ppd' | 'ccd';
    routing_number?: string;
    account_number?: string;
    account_type: 'checking' | 'savings';
  } | null;
  billing_contact: MerchantContact;
  primary_contact: MerchantContact;
  limits?: TransactionLimits;
  user: MerchantUserRequest;
  permissions?: MerchantPermissions;
}

/** Merchant user record. */
export interface MerchantUser {
  id: string;
  username: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  role: string;
  account_type: string;
  account_type_id: string;
  permissions: Record<string, boolean>;
  notifications?: Record<string, unknown>;
  defaults?: Record<string, unknown>;
  access_restrictions?: Record<string, unknown>;
  flags?: Record<string, unknown>;
  two_factor_enabled: boolean;
  /** Present when `create_api_key` was true. */
  api_key?: string;
  /** Present when `create_pub_api_key` was true. */
  pub_api_key?: string;
  created_at: DateTimeString;
  updated_at: DateTimeString;
}

/** Merchant record. */
export interface Merchant {
  id: string;
  partner_id: string;
  name: string;
  description: string;
  website: string;
  phone: string;
  phone_ext?: string;
  receipt_email: string;
  timezone: string;
  status: string;
  fee_schedule_id: string;
  logo_url?: string;
  primary_contact: Record<string, string>;
  billing_contact: Record<string, string>;
  limits?: TransactionLimits;
  billing: unknown;
  api_key?: string;
  pub_api_key?: string;
  user?: MerchantUser;
  tos_accepted_by?: string;
  tos_accepted_by_username?: string;
  tos_last_accepted_at?: DateTimeString;
  created_at: DateTimeString;
}

/** Processor tags that enable fallback / split behaviour. */
export type ProcessorTag =
  | 'surchargefallback'
  | 'itfallback'
  | 'debitfallback'
  | 'splittransaction'
  | 'splitpaymentadjustment'
  | ''
  | (string & {});

/** TSYS Sierra processor settings. */
export interface TsysSierraSettings {
  bin: string;
  mid: string;
  mvv?: string;
  mcc: string;
  agent_bank_number: string;
  agent_chain_number: string;
  store_number: string;
  terminal_number: string;
  terminal_identification_number: string;
  industry_code: string;
  currency_code: string;
  country_code: string;
  city_code: string;
  language_indicator: string;
  timezone: string;
  merchant_name: string;
  merchant_location: string;
  merchant_state: string;
  merchant_location_number: string;
  classification: 'ecomm' | 'moto' | 'retail' | 'ivr' | 'healthcare' | (string & {});
  acceptor_dba_name?: string;
  acceptor_street_address?: string;
  acceptor_city?: string;
  acceptor_postal_code?: string;
  acceptor_phone_number?: string;
  acceptor_customer_service_phone_number?: string;
  application_id?: string;
  developer_id?: string;
}

/** Request body for `POST /api/merchant/{merchantId}/processor`. */
export interface CreateProcessorRequest {
  name: string;
  description: string;
  status: 'active' | 'disabled';
  default_card?: boolean;
  timezone: string;
  tag?: ProcessorTag;
  /** Nightly auto settle time in 30 minute intervals, `HH:MM:00`. */
  settle_at: string;
  payment_adj_type?: 'flat' | 'percentage' | '';
  /** Thousandths of a percent (`3000` = 3.000%). */
  payment_adj_val?: number;
  features?: { disable_auto_settle?: boolean; hide_in_vt?: boolean };
  supported_payment_methods?: string[];
  supported_currencies?: string[];
  /** Fraud rule ids to attach. */
  ruleset?: string[];
  settings?: { tsys_sierra?: TsysSierraSettings; [processor: string]: unknown };
  limits?: TransactionLimits;
}

/** Processor record. */
export interface Processor {
  id: string;
  name: string;
  description: string;
  default_card: boolean;
  default_ach: boolean;
  default_apm: boolean;
  default_cash: boolean;
  timezone: string;
  tag: string;
  status: string;
  settle_at: string;
  max_daily?: number;
  max_monthly?: number;
  payment_adj_type: string;
  payment_adj_val: number;
  settings: Record<string, unknown>;
  features: { hide_in_vt: boolean; disable_auto_settle: boolean };
  supported_payment_methods: string[];
  supported_currencies: string[];
}

/** Request body for `POST /api/merchant/{merchantId}/webhook/test`. Provide `webhook_id` or `url` + `signature_key`. */
export interface WebhookTestRequest {
  webhook_id?: string;
  url?: string;
  signature_key?: string;
}

/** Request body for rotating a webhook signing secret. */
export interface RotateWebhookSecretRequest {
  /** Hours the previous secret remains valid (1–168, default 24). */
  overlap_hours?: number;
}
