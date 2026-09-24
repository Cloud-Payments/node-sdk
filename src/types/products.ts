import type {
  AmountCents,
  DateRangeSearch,
  DateTimeString,
  IntSearch,
  Pagination,
  StringSearch,
} from './common.js';

/** Request body for creating a product. */
export interface CreateProductRequest {
  /** Up to 20 alphanumeric characters. */
  sku: string;
  /** Up to 100 characters. */
  name: string;
  /** Product image, base64 encoded. */
  img?: string;
  /** Unit price in cents. */
  price: AmountCents;
  /** Lock the amount (`true`) or let the end user customise it. */
  fixed_amount: boolean;
  /** Lock the quantity (`true`) or let the end user customise it. */
  fixed_qty: boolean;
  /** Up to 254 characters. */
  description: string;
  local_tax?: AmountCents;
  national_tax?: AmountCents;
  max_quantity?: number;
  unit_of_measure?: string | null;
}

/** Request body for updating a product. */
export type UpdateProductRequest = Partial<CreateProductRequest>;

/** Product record. */
export interface Product {
  id: string;
  public_hash: string;
  merchant_id?: string;
  sku: string;
  name: string;
  img?: string;
  price: AmountCents;
  local_tax: AmountCents;
  national_tax: AmountCents;
  fixed_amount: boolean;
  fixed_qty: boolean;
  max_quantity?: number;
  unit_of_measure: string | null;
  description: string;
  created_at: DateTimeString;
  updated_at: DateTimeString | null;
  deleted_at: DateTimeString | null;
}

/** Request body for `POST /api/merchant/{merchantId}/product/search`. */
export interface ProductSearchRequest extends Pagination {
  id?: StringSearch;
  name?: StringSearch;
  price?: IntSearch;
  created_at?: DateRangeSearch;
  updated_at?: DateRangeSearch;
  deleted_at?: DateRangeSearch;
}

/** Result of a product CSV batch upload. */
export interface ProductBatchUploadResult {
  total: number;
  imported: number;
  failed: number;
  /** `row` is the 1-based CSV line number (row 1 is the header). */
  errors: Array<{ row: number; message: string }>;
  products: Product[];
}
