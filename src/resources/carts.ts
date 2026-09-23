import { pathParam } from '../http.js';
import type { ApiListResponse, ApiResponse, RequestOptions } from '../types/common.js';
import type {
  Cart,
  CartSearchRequest,
  CreateCartRequest,
  UpdateCartRequest,
} from '../types/carts.js';
import { Resource } from './base.js';

/** Hosted shopping carts (`/api/merchant/{merchantId}/cart`). */
export class CartsResource extends Resource {
  /** Retrieve a cart with its full product objects. */
  get(merchantId: string, cartId: string, options?: RequestOptions): Promise<ApiResponse<Cart>> {
    return this.http.get<Cart>(
      `/api/merchant/${pathParam(merchantId, 'merchantId')}/cart/${pathParam(cartId, 'cartId')}`,
      undefined,
      options,
    );
  }

  /** Search carts. */
  async search(
    merchantId: string,
    request: CartSearchRequest = {},
    options?: RequestOptions,
  ): Promise<ApiListResponse<Cart>> {
    return this.http.post<Cart[]>(
      `/api/merchant/${pathParam(merchantId, 'merchantId')}/cart/search`,
      request,
      undefined,
      options,
    ) as Promise<ApiListResponse<Cart>>;
  }

  /** List all carts. */
  async list(merchantId: string, options?: RequestOptions): Promise<ApiListResponse<Cart>> {
    return this.http.get<Cart[]>(
      `/api/merchant/${pathParam(merchantId, 'merchantId')}/cart`,
      undefined,
      options,
    ) as Promise<ApiListResponse<Cart>>;
  }

  /** Create a cart. */
  async create(
    merchantId: string,
    request: CreateCartRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<Cart>> {
    return this.http.post<Cart>(
      `/api/merchant/${pathParam(merchantId, 'merchantId')}/cart`,
      request,
      undefined,
      options,
    );
  }

  /** Update a cart. */
  async update(
    merchantId: string,
    cartId: string,
    request: UpdateCartRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<Cart>> {
    return this.http.post<Cart>(
      `/api/merchant/${pathParam(merchantId, 'merchantId')}/cart/${pathParam(cartId, 'cartId')}`,
      request,
      undefined,
      options,
    );
  }

  /** Delete a cart. The gateway returns a confirmation string in `data`. */
  async delete(
    merchantId: string,
    cartId: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<string | null>> {
    return this.http.delete<string | null>(
      `/api/merchant/${pathParam(merchantId, 'merchantId')}/cart/${pathParam(cartId, 'cartId')}`,
      options,
    );
  }
}
