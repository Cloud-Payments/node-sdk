import type {
  AmountCents,
  CurrencyCode,
  DateRangeSearch,
  DateTimeString,
  IntSearch,
  Pagination,
  StringSearch,
} from './common.js';
import type { AchPaymentMethod, CardPaymentMethod } from './transactions.js';

/** Address on an invoice (`payable_to` / `bill_to`). */
export interface InvoiceAddress {
  /** Id of a stored address to use. */
  id?: string | null;
  first_name?: string;
  last_name?: string;
  company?: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  /** Two-character state code. */
  state: string;
  postal_code: string;
  /** Two-character country code. */
  country: string;
  phone?: string;
  fax?: string;
  email?: string;
}

/** Invoice line item. */
export interface InvoiceItemInput {
  status: 'pending' | 'paid';
  type?: string;
  name?: string;
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
  local_tax?: AmountCents;
  national_tax_rate?: string;
  national_tax?: AmountCents;
  tax_rate?: string;
  tax_amount?: AmountCents;
  discount_amount?: AmountCents;
  freight_amount?: AmountCents;
}

/** Invoice settings. */
export interface InvoiceSettings {
  /** How partial payments are accepted. Defaults to `"line_items"`. */
  partial_payment_type?: 'amount' | 'line_items';
  allow_tipping?: boolean;
}

/** Request body for creating an invoice. */
export interface CreateInvoiceRequest {
  currency: CurrencyCode;
  company_name?: string;
  company_logo_url?: string;
  customer_number?: string;
  customer_id?: string;
  invoice_number?: string;
  payable_to: InvoiceAddress;
  bill_to: InvoiceAddress;
  /** ISO 8601 date the invoice is due. */
  date_due: DateTimeString;
  settings?: InvoiceSettings;
  items: InvoiceItemInput[];
  advanced_fields?: boolean;
  enable_tax?: boolean;
  enable_shipping?: boolean;
  require_shipping_details?: boolean;
  require_billing_details_on_payment_only?: boolean;
  /** Tax rate as a string, for example `"7.000"`. `"0.000"` reads `tax` as a flat amount. */
  tax_percent?: string | number;
  tax?: AmountCents;
  shipping?: AmountCents;
  amount_paid?: AmountCents;
  service_fees_paid?: AmountCents;
  surcharge_paid?: AmountCents;
  discount_credited?: AmountCents;
  adjustment?: AmountCents;
  allow_partial_payment?: boolean;
  transaction_type?: 'sale' | 'authorize';
  payment_methods: Array<'card' | 'ach' | 'mail'>;
  /** May be `""`. */
  card_processor_id: string;
  /** May be `""`. */
  ach_processor_id: string;
  message?: string;
  save_customer_vault?: 'none' | 'optional' | 'required';
  send_via: 'email' | 'text' | 'both' | 'none';
  email_to?: string;
}

/** Request body for updating an invoice. */
export type UpdateInvoiceRequest = Partial<CreateInvoiceRequest>;

/** Invoice status. */
export type InvoiceStatus =
  'pending' | 'paid' | 'partially_paid' | 'declined' | 'past_due' | (string & {});

/** Invoice line item as returned by the gateway. */
export interface InvoiceItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  quantity_shipped: number;
  unit_of_measure: string;
  unit_price: AmountCents;
  discount: number;
  discount_type: string;
  taxable: boolean;
  local_tax: string;
  national_tax: string;
  tax_rate: string;
  tax_amount: AmountCents;
  amount: AmountCents;
  status: string;
}

/** Invoice record. */
export interface Invoice {
  id: string;
  currency: string;
  company_name: string;
  company_logo_url: string;
  customer_number: string;
  customer_id?: string;
  invoice_number?: string;
  payable_to: Required<Omit<InvoiceAddress, 'id'>> & { id: string };
  bill_to: Required<Omit<InvoiceAddress, 'id'>> & { id: string };
  created_at: DateTimeString;
  date_due: DateTimeString;
  items: InvoiceItem[];
  advanced_fields: boolean;
  subtotal: AmountCents;
  tax_percent: string;
  tax: AmountCents;
  total: AmountCents;
  amount_paid: AmountCents;
  adjustment: AmountCents;
  amount_due: AmountCents;
  payment_methods: string[];
  card_processor_id: string;
  ach_processor_id: string;
  status: InvoiceStatus;
  message: string;
  reject_message: string;
  send_via: string;
  last_sent_at: DateTimeString;
  updated_at: DateTimeString;
  /** Public hash used in the hosted payment URL and accepted by the pay endpoint. */
  public_url: string;
  public_hash?: string;
  /** Hosted payment page URL. */
  hosted_url: string;
  settings?: InvoiceSettings;
}

/** Request body for `POST /api/invoices/search`. */
export interface InvoiceSearchRequest extends Pagination {
  id?: StringSearch;
  amount_due?: IntSearch;
  date_due?: DateRangeSearch;
}

/** Payment method accepted by the invoice pay endpoint. */
export interface InvoicePaymentMethod {
  card?: Pick<CardPaymentMethod, 'number' | 'expiration_date' | 'cvc'>;
  ach?: Pick<AchPaymentMethod, 'routing_number' | 'account_number' | 'sec_code' | 'account_type'>;
  customer?: { id: string; payment_method_id?: string };
  token?: string;
}

/** Request body for `POST /api/invoice/{id}/pay`. */
export interface PayInvoiceRequest {
  /** Required unless `paying_via_mail` is true. */
  payment_method?: InvoicePaymentMethod;
  paying_via_mail?: boolean;
  /** Partial amount in cents (only when `settings.partial_payment_type` is `"amount"`). */
  partial_payment_amount?: AmountCents;
  /** Line items to reject (only when `settings.partial_payment_type` is `"line_items"`). */
  rejected_items?: Array<{ id: string }>;
  /** Required when `rejected_items` is present (max 1,024 characters). */
  reject_message?: string;
}
