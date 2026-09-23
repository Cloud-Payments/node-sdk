import { pathParam } from '../http.js';
import type { ApiListResponse, ApiResponse, RequestOptions } from '../types/common.js';
import type { CustomField, CustomFieldRequest } from '../types/custom-fields.js';
import { Resource } from './base.js';

/**
 * Custom fields (`/api/customfield`).
 *
 * Create fields here, then pass their ids in `custom_fields` on a transaction (values are
 * always arrays of strings). Fields in a non-default group also require `group_name`.
 */
export class CustomFieldsResource extends Resource {
  /** Create a custom field. */
  async create(
    request: CustomFieldRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<CustomField>> {
    return this.http.post<CustomField>('/api/customfield', request, undefined, options);
  }

  /** List all custom fields (`GET /api/customfields`). */
  async list(options?: RequestOptions): Promise<ApiListResponse<CustomField>> {
    return this.http.get<CustomField[]>('/api/customfields', undefined, options) as Promise<
      ApiListResponse<CustomField>
    >;
  }

  /** List custom fields for a merchant (`GET /api/customfields/{merchantId}`). */
  async listForMerchant(
    merchantId: string,
    options?: RequestOptions,
  ): Promise<ApiListResponse<CustomField>> {
    return this.http.get<CustomField[]>(
      `/api/customfields/${pathParam(merchantId, 'merchantId')}`,
      undefined,
      options,
    ) as Promise<ApiListResponse<CustomField>>;
  }

  /** Retrieve a custom field. */
  get(customFieldId: string, options?: RequestOptions): Promise<ApiResponse<CustomField>> {
    return this.http.get<CustomField>(
      `/api/customfield/${pathParam(customFieldId, 'customFieldId')}`,
      undefined,
      options,
    );
  }

  /** Update a custom field. */
  async update(
    customFieldId: string,
    request: CustomFieldRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<CustomField | null>> {
    return this.http.post<CustomField | null>(
      `/api/customfield/${pathParam(customFieldId, 'customFieldId')}`,
      request,
      undefined,
      options,
    );
  }

  /** Delete a custom field. */
  async delete(customFieldId: string, options?: RequestOptions): Promise<ApiResponse<null>> {
    return this.http.delete<null>(
      `/api/customfield/${pathParam(customFieldId, 'customFieldId')}`,
      options,
    );
  }
}
