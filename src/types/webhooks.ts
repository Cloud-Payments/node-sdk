import type { Transaction } from './transactions.js';

/** Webhook event families. */
export type WebhookEventFamily = 'transaction' | 'settlement' | 'cardsync';

/** Transaction webhook subtypes. */
export type TransactionWebhookType =
  | 'transaction_create'
  | 'transaction_update'
  | 'transaction_void'
  | 'transaction_capture'
  | 'transaction_settlement';

/** Every documented webhook event type. */
export type WebhookEventType =
  | TransactionWebhookType
  | 'settlement_batch'
  | 'transaction_automatic_account_updater_vault_update'
  | 'test'
  | (string & {});

/** Envelope common to every webhook delivery. */
export interface WebhookEventBase<
  TType extends WebhookEventType = WebhookEventType,
  TData = unknown,
> {
  status: string;
  msg: string;
  type: TType;
  account_type: 'merchant' | 'partner' | (string & {});
  account_type_id: string;
  /** Present for transaction-related events when applicable. */
  transaction_id?: string;
  /** UTC timestamp of the action. */
  action_at: string;
  data: TData;
}

/** Test delivery sent on webhook create/update or from the test endpoint. */
export type WebhookTestEvent = Omit<WebhookEventBase<'test', undefined>, 'data'> & {
  data?: undefined;
};

/** Transaction event. */
export type TransactionWebhookEvent = WebhookEventBase<TransactionWebhookType, Transaction>;

/** Settlement batch event payload. */
export interface SettlementBatchWebhookData {
  id: string;
  batch_number: number;
  batch_date: string;
  num_transactions: number;
  amount_captured: number;
  base_amount?: number;
  net_amount?: number;
  net_deposit: number;
  amount_credit: number;
  surcharge_amount?: number;
  payment_adj_amount?: number;
  processor_id: string;
  processor_name: string;
  processor_type: string;
  merchant_id: string;
  response_code: number;
  response_message: string;
  [key: string]: unknown;
}

/** Settlement batch event. */
export type SettlementBatchWebhookEvent = WebhookEventBase<
  'settlement_batch',
  SettlementBatchWebhookData
>;

/** Account updater (cardsync) event. */
export type AccountUpdaterWebhookEvent = WebhookEventBase<
  'transaction_automatic_account_updater_vault_update',
  Record<string, unknown>
>;

/** Union of all webhook events. */
export type WebhookEvent =
  | WebhookTestEvent
  | TransactionWebhookEvent
  | SettlementBatchWebhookEvent
  | AccountUpdaterWebhookEvent
  | WebhookEventBase;

/** Request body for creating a webhook configuration. */
export interface WebhookConfig {
  type: WebhookEventFamily;
  /** HTTPS endpoint that receives POSTs. */
  url: string;
  /** Outbound pacing (max 1000; `0` = no delay). */
  limit_per_second?: number;
  status?: 'active' | 'disabled' | 'auto_disabled';
  /** Subtypes to deliver. Empty / all-false delivers nothing. */
  available_subtypes: Partial<Record<Exclude<WebhookEventType, 'test'>, boolean>>;
}
