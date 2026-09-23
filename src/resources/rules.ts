import { pathParam } from '../http.js';
import type { ApiListResponse, ApiResponse, RequestOptions } from '../types/common.js';
import type { Rule, RuleRequest, RuleSearchRequest } from '../types/rules.js';
import { Resource } from './base.js';

/**
 * Fraud rules (`/api/rules-engine/rules`). Requires a user with the `manage_rule_engine`
 * permission. A rule only runs once attached to a processor.
 */
export class RulesResource extends Resource {
  /** List all rules. */
  async list(options?: RequestOptions): Promise<ApiListResponse<Rule>> {
    return this.http.get<Rule[]>('/api/rules-engine/rules', undefined, options) as Promise<
      ApiListResponse<Rule>
    >;
  }

  /** Retrieve a rule. */
  get(ruleId: string, options?: RequestOptions): Promise<ApiResponse<Rule>> {
    return this.http.get<Rule>(
      `/api/rules-engine/rules/${pathParam(ruleId, 'ruleId')}`,
      undefined,
      options,
    );
  }

  /** Search rules. */
  async search(
    request: RuleSearchRequest = {},
    options?: RequestOptions,
  ): Promise<ApiListResponse<Rule>> {
    return this.http.post<Rule[]>(
      '/api/rules-engine/rules/search',
      request,
      undefined,
      options,
    ) as Promise<ApiListResponse<Rule>>;
  }

  /** Create a rule. */
  async create(request: RuleRequest, options?: RequestOptions): Promise<ApiResponse<Rule>> {
    return this.http.post<Rule>('/api/rules-engine/rules', request, undefined, options);
  }

  /** Update a rule (same body shape as {@link create}). */
  async update(
    ruleId: string,
    request: RuleRequest,
    options?: RequestOptions,
  ): Promise<ApiResponse<Rule>> {
    return this.http.post<Rule>(
      `/api/rules-engine/rules/${pathParam(ruleId, 'ruleId')}`,
      request,
      undefined,
      options,
    );
  }

  /** Delete a rule. */
  async delete(ruleId: string, options?: RequestOptions): Promise<ApiResponse<null>> {
    return this.http.delete<null>(
      `/api/rules-engine/rules/${pathParam(ruleId, 'ruleId')}`,
      options,
    );
  }
}
