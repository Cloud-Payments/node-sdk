import { pathParam } from '../http.js';
import type { ApiResponse, RequestOptions } from '../types/common.js';
import type {
  CreateMerchantRequest,
  CreateProcessorRequest,
  Merchant,
  MerchantUser,
  MerchantUserRequest,
  Processor,
  RotateWebhookSecretRequest,
  WebhookTestRequest,
} from '../types/merchants.js';
import type {
  CreateSimplePaymentPageRequest,
  SimplePaymentPage,
} from '../types/simple-payments.js';
import { Resource } from './base.js';

/**
 * Merchant webhook management.
 *
 * Only the test, rotate-secret and expire-previous-secret operations are documented by the
 * gateway; the rotate/expire paths follow the documented `.../webhook/{webhookId}/...` pattern
 * under `/api/merchant/{merchantId}`.
 */
export class MerchantWebhooksResource extends Resource {
  /**
   * Send a synchronous test probe to a webhook (`POST /api/merchant/{merchantId}/webhook/test`).
   * The endpoint must respond with exactly HTTP 200. Rate limited (burst of 10).
   */
  async test(
    merchantId: string,
    request: WebhookTestRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<unknown>> {
    return this.http.post<unknown>(
      `/api/merchant/${pathParam(merchantId, 'merchantId')}/webhook/test`,
      request,
      undefined,
      options,
    );
  }

  /**
   * Rotate the signing secret (`POST /api/merchant/{merchantId}/webhook/{webhookId}/rotate-secret`).
   * The previous secret stays valid for `overlap_hours` (default 24) and deliveries carry `Signature-Previous`.
   */
  async rotateSecret(
    merchantId: string,
    webhookId: string,
    request: RotateWebhookSecretRequest = {},
    options?: RequestOptions,
  ): Promise<ApiResponse<unknown>> {
    return this.http.post<unknown>(
      `/api/merchant/${pathParam(merchantId, 'merchantId')}/webhook/${pathParam(webhookId, 'webhookId')}/rotate-secret`,
      request,
      undefined,
      options,
    );
  }

  /** End the rotation overlap early (`POST /api/merchant/{merchantId}/webhook/{webhookId}/expire-previous-secret`). */
  async expirePreviousSecret(
    merchantId: string,
    webhookId: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<unknown>> {
    return this.http.post<unknown>(
      `/api/merchant/${pathParam(merchantId, 'merchantId')}/webhook/${pathParam(webhookId, 'webhookId')}/expire-previous-secret`,
      undefined,
      undefined,
      options,
    );
  }
}

/** Partner API: board merchants, create processors and users. Requires a partner API key. */
export class MerchantsResource extends Resource {
  readonly webhooks: MerchantWebhooksResource;

  constructor(http: ConstructorParameters<typeof Resource>[0]) {
    super(http);
    this.webhooks = new MerchantWebhooksResource(http);
  }

  /**
   * Board a new merchant (`POST /api/merchant`). Set `user.create_api_key` /
   * `user.create_pub_api_key` to receive the admin user's keys in the response.
   */
  async create(
    request: CreateMerchantRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<Merchant>> {
    return this.http.post<Merchant>('/api/merchant', request, undefined, options);
  }

  /** Change a merchant's status (`GET /api/merchant/{merchantId}/status/{status}`). */
  async setStatus(
    merchantId: string,
    status: 'active' | 'disable',
    options?: RequestOptions,
  ): Promise<ApiResponse<Merchant>> {
    return this.http.get<Merchant>(
      `/api/merchant/${pathParam(merchantId, 'merchantId')}/status/${pathParam(status, 'status')}`,
      undefined,
      options,
    );
  }

  /** Create a processor for a merchant (`POST /api/merchant/{merchantId}/processor`). */
  async createProcessor(
    merchantId: string,
    request: CreateProcessorRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<Processor>> {
    return this.http.post<Processor>(
      `/api/merchant/${pathParam(merchantId, 'merchantId')}/processor`,
      request,
      undefined,
      options,
    );
  }

  /** Create a user for a merchant (`POST /api/merchant/{merchantId}/user`). */
  async createUser(
    merchantId: string,
    request: MerchantUserRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<MerchantUser>> {
    return this.http.post<MerchantUser>(
      `/api/merchant/${pathParam(merchantId, 'merchantId')}/user`,
      request,
      undefined,
      options,
    );
  }

  /** Create a Simple Payments page (`POST /api/merchant/{merchantId}/simple-payment`). */
  async createSimplePaymentPage(
    merchantId: string,
    request: CreateSimplePaymentPageRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<SimplePaymentPage>> {
    return this.http.post<SimplePaymentPage>(
      `/api/merchant/${pathParam(merchantId, 'merchantId')}/simple-payment`,
      request,
      undefined,
      options,
    );
  }
}
