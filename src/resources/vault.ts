import { pathParam } from '../http.js';
import type { ApiListResponse, ApiResponse, RequestOptions } from '../types/common.js';
import type {
  CreateCustomerRequest,
  Customer,
  CustomerSearchRequest,
  UpdateCustomerRequest,
  UpdateVaultAchRequest,
  UpdateVaultCardRequest,
  VaultAchInput,
  VaultAddress,
  VaultApplePayInput,
  VaultCardInput,
  VaultGooglePayRequest,
  VaultTokenRequest,
  VaultVerificationParams,
} from '../types/vault.js';
import { Resource } from './base.js';

/** Addresses stored on a customer record. */
export class VaultAddressesResource extends Resource {
  /**
   * Create an address (`POST /api/vault/customer/{customerId}/address`).
   * Fails with `invalid: would create a duplicate address` when an identical address exists;
   * reuse the existing address id from {@link CustomerVaultResource.get} instead.
   */
  async create(
    customerId: string,
    address: VaultAddress,
    options?: RequestOptions,
  ): Promise<ApiResponse<Customer>> {
    return this.http.post<Customer>(
      `/api/vault/customer/${pathParam(customerId, 'customerId')}/address`,
      address,
      undefined,
      options,
    );
  }

  /** Update an address (`POST /api/vault/customer/{customerId}/address/{addressId}`). */
  async update(
    customerId: string,
    addressId: string,
    address: VaultAddress,
    options?: RequestOptions,
  ): Promise<ApiResponse<Customer>> {
    return this.http.post<Customer>(
      `/api/vault/customer/${pathParam(customerId, 'customerId')}/address/${pathParam(addressId, 'addressId')}`,
      address,
      undefined,
      options,
    );
  }

  /** Delete an address (`DELETE /api/vault/customer/{customerId}/address/{addressId}`). */
  async delete(
    customerId: string,
    addressId: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<null>> {
    return this.http.delete<null>(
      `/api/vault/customer/${pathParam(customerId, 'customerId')}/address/${pathParam(addressId, 'addressId')}`,
      options,
    );
  }
}

/**
 * Payment methods stored on a customer record.
 *
 * Storing a card with `validate` runs a $0.00 verification, `authorize` a $1.00 authorization
 * that is never captured. Apple Pay always runs a $1.00 authorization.
 */
export class VaultPaymentMethodsResource extends Resource {
  /** Store a card (`POST /api/vault/customer/{customerId}/card`). */
  async createCard(
    customerId: string,
    card: VaultCardInput,
    params?: VaultVerificationParams,
    options?: RequestOptions,
  ): Promise<ApiResponse<Customer>> {
    return this.http.post<Customer>(
      `/api/vault/customer/${pathParam(customerId, 'customerId')}/card`,
      card,
      params,
      options,
    );
  }

  /** Store an ACH account (`POST /api/vault/customer/{customerId}/ach`). */
  async createAch(
    customerId: string,
    ach: VaultAchInput,
    params?: VaultVerificationParams,
    options?: RequestOptions,
  ): Promise<ApiResponse<Customer>> {
    return this.http.post<Customer>(
      `/api/vault/customer/${pathParam(customerId, 'customerId')}/ach`,
      ach,
      params,
      options,
    );
  }

  /** Store a card or ACH account from a Tokenizer token (`POST /api/vault/customer/{customerId}/token`). */
  async createFromToken(
    customerId: string,
    request: VaultTokenRequest,
    params?: VaultVerificationParams,
    options?: RequestOptions,
  ): Promise<ApiResponse<Customer>> {
    return this.http.post<Customer>(
      `/api/vault/customer/${pathParam(customerId, 'customerId')}/token`,
      request,
      params,
      options,
    );
  }

  /** Store an Apple Pay token (`POST /api/vault/customer/{customerId}/applepay`). Always runs a $1.00 authorization. */
  async createApplePay(
    customerId: string,
    request: VaultApplePayInput,
    options?: RequestOptions,
  ): Promise<ApiResponse<Customer>> {
    return this.http.post<Customer>(
      `/api/vault/customer/${pathParam(customerId, 'customerId')}/applepay`,
      request,
      undefined,
      options,
    );
  }

  /** Store a Google Pay token (`POST /api/vault/customer/{customerId}/googlepay`). */
  async createGooglePay(
    customerId: string,
    request: VaultGooglePayRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<Customer>> {
    return this.http.post<Customer>(
      `/api/vault/customer/${pathParam(customerId, 'customerId')}/googlepay`,
      request,
      undefined,
      options,
    );
  }

  /** Update a stored card (`POST /api/vault/customer/{customerId}/card/{paymentMethodId}`). */
  async updateCard(
    customerId: string,
    paymentMethodId: string,
    card: UpdateVaultCardRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<Customer>> {
    return this.http.post<Customer>(
      `/api/vault/customer/${pathParam(customerId, 'customerId')}/card/${pathParam(paymentMethodId, 'paymentMethodId')}`,
      card,
      undefined,
      options,
    );
  }

  /** Update a stored ACH account (`POST /api/vault/customer/{customerId}/ach/{paymentMethodId}`). */
  async updateAch(
    customerId: string,
    paymentMethodId: string,
    ach: UpdateVaultAchRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<Customer>> {
    return this.http.post<Customer>(
      `/api/vault/customer/${pathParam(customerId, 'customerId')}/ach/${pathParam(paymentMethodId, 'paymentMethodId')}`,
      ach,
      undefined,
      options,
    );
  }

  /** Replace a stored payment method with a Tokenizer token (`POST /api/vault/customer/{customerId}/token/{paymentMethodId}`). */
  async updateFromToken(
    customerId: string,
    paymentMethodId: string,
    request: VaultTokenRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<Customer>> {
    return this.http.post<Customer>(
      `/api/vault/customer/${pathParam(customerId, 'customerId')}/token/${pathParam(paymentMethodId, 'paymentMethodId')}`,
      request,
      undefined,
      options,
    );
  }

  /** Delete a stored card (`DELETE /api/vault/customer/{customerId}/card/{cardId}`). */
  async deleteCard(
    customerId: string,
    cardId: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<null>> {
    return this.http.delete<null>(
      `/api/vault/customer/${pathParam(customerId, 'customerId')}/card/${pathParam(cardId, 'cardId')}`,
      options,
    );
  }

  /** Delete a stored ACH account (`DELETE /api/vault/customer/{customerId}/ach/{achId}`). */
  async deleteAch(
    customerId: string,
    achId: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<null>> {
    return this.http.delete<null>(
      `/api/vault/customer/${pathParam(customerId, 'customerId')}/ach/${pathParam(achId, 'achId')}`,
      options,
    );
  }
}

/**
 * Customer Vault: store customers, addresses and payment methods for repeat charges.
 *
 * Charge a stored customer with `transactions.sale({ payment_method: { customer: { id } } })`.
 */
export class CustomerVaultResource extends Resource {
  readonly addresses: VaultAddressesResource;
  readonly paymentMethods: VaultPaymentMethodsResource;

  constructor(http: ConstructorParameters<typeof Resource>[0]) {
    super(http);
    this.addresses = new VaultAddressesResource(http);
    this.paymentMethods = new VaultPaymentMethodsResource(http);
  }

  /** Create a customer (`POST /api/vault/customer`). */
  async create(
    request: CreateCustomerRequest = {},
    params?: VaultVerificationParams,
    options?: RequestOptions,
  ): Promise<ApiResponse<Customer>> {
    return this.http.post<Customer>('/api/vault/customer', request, params, options);
  }

  /** Retrieve a customer with its addresses and payment methods (`GET /api/vault/{customerId}`). */
  get(customerId: string, options?: RequestOptions): Promise<ApiResponse<Customer>> {
    return this.http.get<Customer>(
      `/api/vault/${pathParam(customerId, 'customerId')}`,
      undefined,
      options,
    );
  }

  /** Search customers (`POST /api/vault/customer/search`). */
  async search(
    request: CustomerSearchRequest = {},
    options?: RequestOptions,
  ): Promise<ApiListResponse<Customer>> {
    return this.http.post<Customer[]>(
      '/api/vault/customer/search',
      request,
      undefined,
      options,
    ) as Promise<ApiListResponse<Customer>>;
  }

  /** Update a customer (`POST /api/vault/customer/{customerId}`). */
  async update(
    customerId: string,
    request: UpdateCustomerRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<Customer>> {
    return this.http.post<Customer>(
      `/api/vault/customer/${pathParam(customerId, 'customerId')}`,
      request,
      undefined,
      options,
    );
  }

  /** Delete a customer (`DELETE /api/vault/{customerId}`). */
  async delete(customerId: string, options?: RequestOptions): Promise<ApiResponse<null>> {
    return this.http.delete<null>(`/api/vault/${pathParam(customerId, 'customerId')}`, options);
  }
}
