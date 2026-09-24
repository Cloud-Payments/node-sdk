import type { DateRangeSearch, DateTimeString, Pagination, StringSearch } from './common.js';
import type { Product } from './products.js';

/** Request body for creating a cart. */
export interface CreateCartRequest {
  type: 'normal' | 'donation';
  /** 1–100 characters. */
  name: string;
  description?: string;
  /** Less than 255 characters. */
  custom_fields_group?: string;
  card_processor_id?: string;
  ach_processor_id?: string;
  /** Must be a valid URL. */
  success_url?: string;
  /** Must be a valid URL. */
  cancel_url?: string;
  show_available_products?: boolean;
  require_shipping_details?: boolean;
  email_receipt?: boolean;
  payments?: Array<'card' | 'ach'>;
  /** Product ids. */
  products?: string[];
  settings?: CartSettings;
}

/** Request body for updating a cart. */
export type UpdateCartRequest = Partial<CreateCartRequest>;

/** Cart settings. */
export interface CartSettings {
  product_subtitle_verbiage?: string;
  save_customer_vault?: 'none' | 'optional' | 'required' | (string & {});
}

/** Cart record. `products` contains full product objects on "get single" and ids elsewhere. */
export interface Cart {
  id: string;
  public_hash?: string;
  merchant_id: string;
  card_processor_id: string | null;
  ach_processor_id: string | null;
  name: string;
  description: string;
  type: string;
  custom_fields_group: string;
  payments: string[] | null;
  products: Product[] | string[] | null;
  show_available_products: boolean;
  require_shipping_details: boolean;
  email_receipt: boolean;
  success_url: string;
  cancel_url: string;
  settings: CartSettings | null;
  created_at: DateTimeString | null;
  updated_at: DateTimeString | null;
  deleted_at: DateTimeString | null;
}

/** Request body for `POST /api/merchant/{merchantId}/cart/search`. */
export interface CartSearchRequest extends Pagination {
  id?: StringSearch;
  name?: StringSearch;
  /** Product name. */
  product?: StringSearch;
  created_at?: DateRangeSearch;
  updated_at?: DateRangeSearch;
  deleted_at?: DateRangeSearch;
}
