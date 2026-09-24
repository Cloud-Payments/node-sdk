import { pathParam } from '../http.js';
import type { ApiListResponse, ApiResponse, RequestOptions } from '../types/common.js';
import type {
  AddOn,
  AddOnRequest,
  AddOnSummary,
  CreatePlanRequest,
  CreateSubscriptionRequest,
  Discount,
  DiscountRequest,
  Plan,
  Subscription,
  SubscriptionSearchRequest,
  UpdatePlanRequest,
  UpdateSubscriptionRequest,
} from '../types/recurring.js';
import { Resource } from './base.js';

/** Recurring plan add-ons (`/api/recurring/addon`). */
export class AddOnsResource extends Resource {
  /** Create an add-on. Provide `amount` or `percentage`, not both. */
  async create(request: AddOnRequest, options?: RequestOptions): Promise<ApiResponse<AddOn>> {
    return this.http.post<AddOn>('/api/recurring/addon', request, undefined, options);
  }

  /** Retrieve an add-on. */
  get(addOnId: string, options?: RequestOptions): Promise<ApiResponse<AddOn>> {
    return this.http.get<AddOn>(
      `/api/recurring/addon/${pathParam(addOnId, 'addOnId')}`,
      undefined,
      options,
    );
  }

  /** List all add-ons. */
  async list(options?: RequestOptions): Promise<ApiListResponse<AddOnSummary>> {
    return this.http.get<AddOnSummary[]>('/api/recurring/addons', undefined, options) as Promise<
      ApiListResponse<AddOnSummary>
    >;
  }

  /** Update an add-on. */
  async update(
    addOnId: string,
    request: AddOnRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<AddOn>> {
    return this.http.post<AddOn>(
      `/api/recurring/addon/${pathParam(addOnId, 'addOnId')}`,
      request,
      undefined,
      options,
    );
  }

  /** Delete an add-on. */
  async delete(addOnId: string, options?: RequestOptions): Promise<ApiResponse<null>> {
    return this.http.delete<null>(`/api/recurring/addon/${pathParam(addOnId, 'addOnId')}`, options);
  }
}

/** Recurring plan discounts (`/api/recurring/discount`). */
export class DiscountsResource extends Resource {
  /** Create a discount. Provide `amount` or `percentage`, not both. */
  async create(request: DiscountRequest, options?: RequestOptions): Promise<ApiResponse<Discount>> {
    return this.http.post<Discount>('/api/recurring/discount', request, undefined, options);
  }

  /** Retrieve a discount. */
  get(discountId: string, options?: RequestOptions): Promise<ApiResponse<Discount>> {
    return this.http.get<Discount>(
      `/api/recurring/discount/${pathParam(discountId, 'discountId')}`,
      undefined,
      options,
    );
  }

  /** List all discounts. */
  async list(options?: RequestOptions): Promise<ApiListResponse<Discount>> {
    return this.http.get<Discount[]>('/api/recurring/discounts', undefined, options) as Promise<
      ApiListResponse<Discount>
    >;
  }

  /** Update a discount. */
  async update(
    discountId: string,
    request: DiscountRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<Discount>> {
    return this.http.post<Discount>(
      `/api/recurring/discount/${pathParam(discountId, 'discountId')}`,
      request,
      undefined,
      options,
    );
  }

  /** Delete a discount. */
  async delete(discountId: string, options?: RequestOptions): Promise<ApiResponse<null>> {
    return this.http.delete<null>(
      `/api/recurring/discount/${pathParam(discountId, 'discountId')}`,
      options,
    );
  }
}

/** Recurring plans (`/api/recurring/plan`). */
export class PlansResource extends Resource {
  /** Create a plan. */
  async create(request: CreatePlanRequest, options?: RequestOptions): Promise<ApiResponse<Plan>> {
    return this.http.post<Plan>('/api/recurring/plan', request, undefined, options);
  }

  /** Retrieve a plan. */
  get(planId: string, options?: RequestOptions): Promise<ApiResponse<Plan>> {
    return this.http.get<Plan>(
      `/api/recurring/plan/${pathParam(planId, 'planId')}`,
      undefined,
      options,
    );
  }

  /** List all plans. */
  async list(options?: RequestOptions): Promise<ApiListResponse<Plan>> {
    return this.http.get<Plan[]>('/api/recurring/plans', undefined, options) as Promise<
      ApiListResponse<Plan>
    >;
  }

  /** Update a plan. Set `update_subscriptions` to propagate the amount to existing subscriptions. */
  async update(
    planId: string,
    request: UpdatePlanRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<Plan>> {
    return this.http.post<Plan>(
      `/api/recurring/plan/${pathParam(planId, 'planId')}`,
      request,
      undefined,
      options,
    );
  }

  /** Delete a plan. */
  async delete(planId: string, options?: RequestOptions): Promise<ApiResponse<null>> {
    return this.http.delete<null>(`/api/recurring/plan/${pathParam(planId, 'planId')}`, options);
  }
}

/**
 * Subscriptions (`/api/recurring/subscription`).
 *
 * Renewals are ordinary transactions with `transaction_source: "recurring"` and a populated
 * `subscription_id`. Monitor the `failing`, `failed` and `error` statuses for billing problems.
 */
export class SubscriptionsResource extends Resource {
  /** Create a subscription. */
  async create(
    request: CreateSubscriptionRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<Subscription>> {
    return this.http.post<Subscription>('/api/recurring/subscription', request, undefined, options);
  }

  /** Retrieve a subscription. */
  get(subscriptionId: string, options?: RequestOptions): Promise<ApiResponse<Subscription>> {
    return this.http.get<Subscription>(
      `/api/recurring/subscription/${pathParam(subscriptionId, 'subscriptionId')}`,
      undefined,
      options,
    );
  }

  /** Search subscriptions. */
  async search(
    request: SubscriptionSearchRequest = {},
    options?: RequestOptions,
  ): Promise<ApiListResponse<Subscription>> {
    return this.http.post<Subscription[]>(
      '/api/recurring/subscription/search',
      request,
      undefined,
      options,
    ) as Promise<ApiListResponse<Subscription>>;
  }

  /** Update a subscription. Send `line_items: []` to clear stored line items. */
  async update(
    subscriptionId: string,
    request: UpdateSubscriptionRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<Subscription>> {
    return this.http.post<Subscription>(
      `/api/recurring/subscription/${pathParam(subscriptionId, 'subscriptionId')}`,
      request,
      undefined,
      options,
    );
  }

  /** Delete a subscription. */
  async delete(subscriptionId: string, options?: RequestOptions): Promise<ApiResponse<null>> {
    return this.http.delete<null>(
      `/api/recurring/subscription/${pathParam(subscriptionId, 'subscriptionId')}`,
      options,
    );
  }

  /** Pause a subscription; it is skipped during billing runs until reactivated. */
  async pause(
    subscriptionId: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<Subscription>> {
    return this.setStatus(subscriptionId, 'paused', undefined, options);
  }

  /** Mark a subscription past due (never set automatically by the gateway). */
  async markPastDue(
    subscriptionId: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<Subscription>> {
    return this.setStatus(subscriptionId, 'past_due', undefined, options);
  }

  /** Cancel a subscription permanently. */
  async cancel(
    subscriptionId: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<Subscription>> {
    return this.setStatus(subscriptionId, 'cancelled', undefined, options);
  }

  /**
   * Activate a subscription (also used to reactivate `failed` / `paused` subscriptions).
   * @param nextBillDate Optional next bill date in `YYYY-MM-DD` format.
   */
  async activate(
    subscriptionId: string,
    nextBillDate?: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<Subscription>> {
    return this.setStatus(
      subscriptionId,
      'active',
      nextBillDate ? { next_bill_date: nextBillDate } : undefined,
      options,
    );
  }

  /** Mark a subscription completed. */
  async complete(
    subscriptionId: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<Subscription>> {
    return this.setStatus(subscriptionId, 'completed', undefined, options);
  }

  private async setStatus(
    subscriptionId: string,
    status: 'paused' | 'past_due' | 'cancelled' | 'active' | 'completed',
    query: { next_bill_date?: string } | undefined,
    options?: RequestOptions,
  ): Promise<ApiResponse<Subscription>> {
    return this.http.get<Subscription>(
      `/api/recurring/subscription/${pathParam(subscriptionId, 'subscriptionId')}/status/${status}`,
      query,
      options,
    );
  }
}

/** Recurring billing: add-ons, discounts, plans and subscriptions. */
export class RecurringResource extends Resource {
  readonly addOns: AddOnsResource;
  readonly discounts: DiscountsResource;
  readonly plans: PlansResource;
  readonly subscriptions: SubscriptionsResource;

  constructor(http: ConstructorParameters<typeof Resource>[0]) {
    super(http);
    this.addOns = new AddOnsResource(http);
    this.discounts = new DiscountsResource(http);
    this.plans = new PlansResource(http);
    this.subscriptions = new SubscriptionsResource(http);
  }
}
