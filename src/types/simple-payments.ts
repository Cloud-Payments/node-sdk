import type { DateTimeString } from './common.js';

/** Request body for `POST /api/merchant/{merchantId}/simple-payment`. */
export interface CreateSimplePaymentPageRequest {
  form_type?: 'donation' | (string & {});
  /** URL slug appended to `/spp/`, up to 20 alphanumeric characters. */
  slug: string;
  name: string;
  title: string;
  description: string;
  payment_settings?: Array<{ payment_method: 'card' | 'ach'; processor_id?: string }>;
  layout: 'full' | 'horizontal' | 'vertical' | (string & {});
  /** Page image, base64 encoded. */
  image_url?: string;
  /** Required unless `layout` is `"full"`. */
  background_color?: string;
  amounts_header?: string;
  amount_options?: number[];
  manual_amount?: boolean;
  plans_header?: string;
  plan_ids?: string[];
  products_header?: string;
  product_ids?: string[];
  custom_fields_header?: string;
  custom_field_ids?: string[];
  success_url?: string;
}

/** Simple Payments page record. */
export interface SimplePaymentPage {
  id: string;
  merchant_id: string;
  form_type: string;
  slug: string;
  name: string;
  title: string;
  description: string;
  payment_settings: Array<{ payment_method: string; processor_id: string }>;
  layout: string;
  image_url: string;
  background_color: string;
  amounts_header: string;
  amount_options: number[];
  manual_amount: boolean;
  plans_header: string;
  plan_ids: string[];
  manual_plan_amount?: boolean;
  custom_fields_header: string;
  custom_field_ids: string[];
  products_header: string;
  product_ids: string[];
  success_url: string;
  created_at: DateTimeString;
  updated_at: DateTimeString;
}
