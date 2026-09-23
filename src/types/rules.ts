import type { DateTimeString } from './common.js';

/** Action applied when a rule condition matches. */
export type RuleAction = 'accept' | 'deny' | 'flag' | 'accept_flag_batch' | 'deny_flag_batch';

/** A single rule condition. */
export interface RuleCondition {
  /** Rule type, for example `"ip_proxy"`, `"amount"`, `"velocity_check_1hour"`. */
  type: string;
  operator?: '>' | '<' | '=' | '!=' | (string & {});
  action: RuleAction;
  /** Comparison value (format depends on `type`; `|` separates multiple values). */
  value?: string;
  /** `"true"` to send a webhook when the rule triggers. */
  notification?: string;
  /** `true` for advanced rule types. */
  advanced?: boolean;
  [key: string]: unknown;
}

/** Rule settings. */
export interface RuleSettings {
  enabled?: boolean;
  enabled_advanced?: boolean;
  enabled_community_rules?: boolean;
  default_community_rule?: 'accept' | 'deny' | 'flag';
  default_action_for_flagged_transactions?: 'accept' | 'deny' | 'flag' | (string & {});
  whitelisted_ips?: string[];
}

/** Request body for creating / updating a fraud rule. */
export interface RuleRequest {
  name: string;
  description?: string;
  settings: RuleSettings;
  /** Conditions evaluated before the charge is sent to the processor. */
  pre: RuleCondition[];
  /** Conditions evaluated after the processor responds. */
  post: RuleCondition[];
  /** Processor ids to attach the rule to. */
  processor_ids?: string[];
}

/** Fraud rule record. */
export interface Rule extends RuleRequest {
  id: string;
  created_at?: DateTimeString;
  updated_at?: DateTimeString;
  [key: string]: unknown;
}

/** Request body for `POST /api/rules-engine/rules/search`. */
export interface RuleSearchRequest {
  name?: string;
  [key: string]: unknown;
}
