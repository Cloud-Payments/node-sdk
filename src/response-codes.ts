/**
 * Gateway transaction response codes and helpers.
 *
 * Codes are grouped by range:
 * - `100`–`199` approvals (including partial approvals)
 * - `200`–`299` issuer / processor declines
 * - `300`–`399` gateway declines (configuration, fraud rules, duplicates)
 * - `400`–`499` processor errors
 */

/** Well-known response codes returned in `response_code`. */
export const ResponseCode = {
  UNKNOWN: 0,
  PENDING_PAYMENT: 99,
  APPROVED: 100,
  APPROVED_PENDING_CUSTOMER_APPROVAL: 101,
  PARTIAL_APPROVAL: 110,
  DECLINED: 200,
  DO_NOT_HONOR: 201,
  INSUFFICIENT_FUNDS: 202,
  EXCEEDS_WITHDRAWAL_LIMIT: 203,
  INVALID_TRANSACTION: 204,
  SCA_DECLINE: 205,
  INVALID_AMOUNT: 220,
  NO_SUCH_ISSUER: 221,
  NO_CREDIT_ACCOUNT: 222,
  EXPIRED_CARD: 223,
  INVALID_CVC: 225,
  CANNOT_VERIFY_PIN: 226,
  REFER_TO_ISSUER: 240,
  PICK_UP_CARD: 250,
  LOST_CARD: 251,
  STOLEN_CARD: 252,
  PICK_UP_CARD_SPECIAL_CONDITION: 253,
  STOP_RECURRING: 261,
  STOP_RECURRING_ALT: 262,
  GATEWAY_DECLINE: 300,
  GATEWAY_DECLINE_DUPLICATE: 301,
  GATEWAY_DECLINE_RULE_ENGINE: 310,
  GATEWAY_DECLINE_CHARGEBACK: 320,
  GATEWAY_DECLINE_STOP_FRAUD: 321,
  GATEWAY_DECLINE_CLOSED_CONTACT: 322,
  GATEWAY_DECLINE_STOP_RECURRING: 323,
  PROCESSOR_ERROR: 400,
  INVALID_MERCHANT_CONFIGURATION: 410,
  PROCESSOR_COMMUNICATION_ERROR: 421,
  DUPLICATE_AT_PROCESSOR: 430,
  PROCESSOR_FORMAT_ERROR: 440,
} as const;

export type ResponseCodeValue = (typeof ResponseCode)[keyof typeof ResponseCode];

/** Human-readable descriptions for the documented response codes. */
export const RESPONSE_CODE_DESCRIPTIONS: Readonly<Record<number, string>> = {
  0: 'Unknown, please contact support for more information',
  99: 'Pending payment (redirect processors prior to payment being received)',
  100: 'Approved',
  101: 'Approved, pending customer approval',
  110: 'Partial approval',
  200: 'Declined',
  201: 'Do not honor',
  202: 'Insufficient funds',
  203: 'Exceeds withdrawal limit',
  204: 'Invalid transaction',
  205: 'SCA decline (soft decline, strong customer authentication required)',
  220: 'Invalid amount',
  221: 'No such issuer',
  222: 'No credit account (invalid card number)',
  223: 'Expired card',
  225: 'Invalid CVC',
  226: 'Cannot verify PIN',
  240: 'Refer to issuer',
  250: 'Pick up card (no fraud)',
  251: 'Lost card, pick up (fraud account)',
  252: 'Stolen card, pick up (fraud account)',
  253: 'Pick up card, special condition',
  261: 'Stop recurring',
  262: 'Stop recurring',
  300: 'Gateway decline',
  301: 'Gateway decline - duplicate transaction',
  310: 'Gateway decline - rule engine',
  320: 'Gateway decline - chargeback',
  321: 'Gateway decline - stop fraud',
  322: 'Gateway decline - closed contact',
  323: 'Gateway decline - stop recurring',
  400: 'Transaction error returned by processor',
  410: 'Invalid merchant configuration',
  421: 'Communication error with processor',
  430: 'Duplicate transaction at processor',
  440: 'Processor format error',
};

/** Category of a response code. */
export type ResponseCodeCategory =
  'unknown' | 'pending' | 'approved' | 'declined' | 'gateway_declined' | 'processor_error';

/**
 * Classify a `response_code` into its documented range.
 *
 * @example
 * ```ts
 * categorizeResponseCode(100); // 'approved'
 * categorizeResponseCode(202); // 'declined'
 * categorizeResponseCode(301); // 'gateway_declined'
 * ```
 */
export function categorizeResponseCode(code: number): ResponseCodeCategory {
  if (code === 99) return 'pending';
  if (code >= 100 && code <= 199) return 'approved';
  if (code >= 200 && code <= 299) return 'declined';
  if (code >= 300 && code <= 399) return 'gateway_declined';
  if (code >= 400 && code <= 499) return 'processor_error';
  return 'unknown';
}

/** `true` when the code is in the approval range (`100`–`199`), including partial approvals. */
export function isApprovedResponseCode(code: number): boolean {
  return categorizeResponseCode(code) === 'approved';
}

/** Describe a response code, falling back to its category when the exact code is not documented. */
export function describeResponseCode(code: number): string {
  return RESPONSE_CODE_DESCRIPTIONS[code] ?? `${categorizeResponseCode(code)} (code ${code})`;
}
