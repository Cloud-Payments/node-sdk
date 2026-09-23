import { pathParam } from '../http.js';
import type { ApiListResponse, ApiResponse, FileUpload, RequestOptions } from '../types/common.js';
import type {
  CreateProductRequest,
  Product,
  ProductBatchUploadResult,
  ProductSearchRequest,
  UpdateProductRequest,
} from '../types/products.js';
import { Resource } from './base.js';

/** Merchant products (`/api/merchant/{merchantId}/product`). */
export class ProductsResource extends Resource {
  /** Retrieve a product. */
  get(
    merchantId: string,
    productId: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<Product>> {
    return this.http.get<Product>(
      `/api/merchant/${pathParam(merchantId, 'merchantId')}/product/${pathParam(productId, 'productId')}`,
      undefined,
      options,
    );
  }

  /** Search products. */
  async search(
    merchantId: string,
    request: ProductSearchRequest = {},
    options?: RequestOptions,
  ): Promise<ApiListResponse<Product>> {
    return this.http.post<Product[]>(
      `/api/merchant/${pathParam(merchantId, 'merchantId')}/product/search`,
      request,
      undefined,
      options,
    ) as Promise<ApiListResponse<Product>>;
  }

  /** List all products. */
  async list(merchantId: string, options?: RequestOptions): Promise<ApiListResponse<Product>> {
    return this.http.get<Product[]>(
      `/api/merchant/${pathParam(merchantId, 'merchantId')}/product`,
      undefined,
      options,
    ) as Promise<ApiListResponse<Product>>;
  }

  /** Create a product. */
  async create(
    merchantId: string,
    request: CreateProductRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<Product>> {
    return this.http.post<Product>(
      `/api/merchant/${pathParam(merchantId, 'merchantId')}/product`,
      request,
      undefined,
      options,
    );
  }

  /** Update a product. */
  async update(
    merchantId: string,
    productId: string,
    request: UpdateProductRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<Product>> {
    return this.http.post<Product>(
      `/api/merchant/${pathParam(merchantId, 'merchantId')}/product/${pathParam(productId, 'productId')}`,
      request,
      undefined,
      options,
    );
  }

  /** Delete a product. The gateway returns a confirmation string in `data`. */
  async delete(
    merchantId: string,
    productId: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<string | null>> {
    return this.http.delete<string | null>(
      `/api/merchant/${pathParam(merchantId, 'merchantId')}/product/${pathParam(productId, 'productId')}`,
      options,
    );
  }

  /**
   * Upload a CSV of products (`POST /api/merchant/{merchantId}/product/batch`).
   * Valid rows are imported immediately; invalid rows are reported in `data.errors`.
   * Maximum 5000 product rows per file.
   */
  async batchUpload(
    merchantId: string,
    file: FileUpload,
    options?: RequestOptions,
  ): Promise<ApiResponse<ProductBatchUploadResult>> {
    return this.http.postFile<ProductBatchUploadResult>(
      `/api/merchant/${pathParam(merchantId, 'merchantId')}/product/batch`,
      file,
      options,
    );
  }
}
