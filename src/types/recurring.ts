import type {
  AmountCents,
  CurrencyCode,
  DateTimeString,
  Pagination,
  StringSearch,
} from './common.js';
import type { LineItem } from './transactions.js';

/** Request body for creating or updating an add-on / discount. Provide `amount` or `percentage`, not both. */
export interface AddOnRequest {
  name?: string;
  description?: string;
  /** Amount in cents. */
  amount?: AmountCents | null;
  /** Thousandths of a percent (`43440` = 43.440%). */
  percentage?: number | null;
  /** Number of times to bill; `0` persists until cancelled. */
  duration?: number;
}

/** Alias for {@link AddOnRequest}. */
export type DiscountRequest = AddOnRequest;

/** An add-on or discount record. */
export interface AddOn {
  id: string;
  name: string;
  description: string;
  amount: AmountCents | null;
  percentage: number | null;
  duration: number;
  created_at: DateTimeString | null;
  updated_at: DateTimeString | null;
}

/** Alias for {@link AddOn}. */
export type Discount = AddOn;

/** Summary entry returned by "get all add-ons". */
export interface AddOnSummary {
  id: string;
  updated_at: DateTimeString;
  [key: string]: unknown;
}

/** Billing frequency within a billing cycle. */
export type BillingFrequency = 'monthly' | 'twice_monthly' | 'daily';

/** Add-on / discount reference on a plan or subscription. Fields other than `id` override the referenced record. */
export interface PlanAdjustmentRef {
  id: string;
  name?: string;
  description?: string;
  amount?: AmountCents;
  duration?: number;
}

/** Request body for creating a plan. */
export interface CreatePlanRequest {
  name: string;
  description?: string;
  amount: AmountCents;
  /** Currency for Simple Payments plans. */
  currency?: CurrencyCode;
  /** Run the billing cycle every X months. */
  billing_cycle_interval: number;
  billing_frequency: BillingFrequency;
  /** Day(s) of the month to bill (`"1,15"` for twice monthly, `"0"` for the last day). */
  billing_days: string;
  /** Set the billing day to the current day. */
  charge_on_day?: boolean;
  /** Number of times to bill; `0` persists until cancelled. */
  duration?: number;
  add_ons?: PlanAdjustmentRef[];
  discounts?: PlanAdjustmentRef[];
  /** Simple Payments plan features. */
  features?: { allow_custom_amount?: boolean };
}

/** Request body for updating a plan. */
export interface UpdatePlanRequest extends Partial<CreatePlanRequest> {
  /** Update the amount for all subscriptions on this plan. */
  update_subscriptions?: boolean;
}

/** A recurring plan. */
export interface Plan {
  id: string;
  name: string;
  description: string;
  amount: AmountCents;
  currency?: string;
  billing_cycle_interval: number;
  billing_frequency: BillingFrequency | (string & {});
  billing_days: string;
  charge_on_day?: boolean;
  total_add_ons: number;
  total_discounts: number;
  duration: number;
  add_ons: AddOn[] | null;
  discounts: AddOn[] | null;
  features?: { allow_custom_amount?: boolean };
  created_at: DateTimeString;
  updated_at: DateTimeString;
}

/** Subscription lifecycle status. */
export type SubscriptionStatus =
  | 'active'
  | 'failing'
  | 'failed'
  | 'error'
  | 'completed'
  | 'paused'
  | 'past_due'
  | 'cancelled'
  | 'stopped'
  | (string & {});

/** Customer reference on a subscription. */
export interface SubscriptionCustomer {
  id: string;
  payment_method_type?: 'card' | 'ach';
  /** Required if `payment_method_type` is present. */
  payment_method_id?: string;
  billing_address_id?: string;
  shipping_address_id?: string;
}

/** Request body for creating a subscription. */
export interface CreateSubscriptionRequest {
  plan_id?: string;
  description?: string;
  customer: SubscriptionCustomer;
  /** Amount in cents. Optional when `derive_amount_from_line_items` is true. */
  amount?: AmountCents;
  billing_cycle_interval: number;
  billing_frequency: BillingFrequency;
  billing_days: string;
  charge_on_day?: boolean;
  duration?: number;
  /** `YYYY-MM-DD` */
  next_bill_date?: string;
  add_ons?: PlanAdjustmentRef[];
  discounts?: PlanAdjustmentRef[];
  line_items?: LineItem[];
  derive_amount_from_line_items?: boolean;
  summary_commodity_code?: string;
  ship_from_postal_code?: string;
  national_tax_amount?: AmountCents;
  duty_amount?: AmountCents;
  merchant_vat_registration_number?: string;
  customer_vat_registration_number?: string;
  po_number?: string;
  tax_amount?: AmountCents;
  tax_exempt?: boolean;
}

/** Request body for updating a subscription. */
export type UpdateSubscriptionRequest = Partial<CreateSubscriptionRequest>;

/** A subscription record. */
export interface Subscription {
  id: string;
  plan_id: string;
  description: string;
  status?: SubscriptionStatus;
  customer: Required<Pick<SubscriptionCustomer, 'id'>> & SubscriptionCustomer;
  amount: AmountCents;
  total_adds: number;
  total_discounts: number;
  billing_cycle_interval: number;
  billing_frequency: BillingFrequency | (string & {});
  billing_days: string;
  charge_on_day?: boolean;
  duration: number;
  next_bill_date: string;
  add_ons: AddOn[] | null;
  discounts: AddOn[] | null;
  line_items?: LineItem[] | null;
  events?: SubscriptionEvent[];
  created_at: DateTimeString;
  updated_at: DateTimeString;
  [key: string]: unknown;
}

/** Outcome of an individual billing attempt. */
export interface SubscriptionEvent {
  status: 'success' | 'declined' | 'error' | 'info' | (string & {});
  [key: string]: unknown;
}

/** Date range search using RFC 3339 timestamps. */
export interface SubscriptionDateSearch {
  operator: '=' | '!=' | '<' | '>';
  value: string;
}

/** Request body for `POST /api/recurring/subscription/search`. */
export interface SubscriptionSearchRequest extends Pagination {
  plan_id?: StringSearch;
  customer?: { id?: StringSearch };
  next_bill_date?: SubscriptionDateSearch;
  expiration_date?: SubscriptionDateSearch;
  status?: StringSearch;
}
