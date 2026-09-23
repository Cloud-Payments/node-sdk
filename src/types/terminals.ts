import type { DateTimeString } from './common.js';

/** Terminal record. */
export interface Terminal {
  id: string;
  merchant_id: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  tpn: string;
  description: string;
  status: string;
  auth_key?: string;
  register_id?: string;
  auto_settle: boolean;
  settle_at: string;
  created_at: DateTimeString;
  updated_at: DateTimeString;
}
