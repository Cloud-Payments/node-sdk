import type { DateTimeString } from './common.js';

/** Custom field validation types. */
export type CustomFieldValidationType = 'open' | 'alpha' | 'numeric' | 'alphanumeric' | 'sentence';

/** Selectable value for select-style custom fields. */
export interface CustomFieldOption {
  name: string;
  value: string;
}

/** Request body for creating / updating a custom field. */
export interface CustomFieldRequest {
  /** Up to 100 characters. */
  name: string;
  /** Field type, for example `"text"`, `"multiselect"`, `"radio"`. */
  type?: string;
  /** Group name, up to 50 characters. Defaults to `"default"`. */
  group_name?: string;
  required?: boolean;
  validation_type?: CustomFieldValidationType;
  values?: CustomFieldOption[] | null;
  merchant_id?: string;
}

/** Custom field record. */
export interface CustomField {
  id: string;
  name: string;
  group_name: string;
  type: string;
  required: boolean;
  validation_type: string;
  values: CustomFieldOption[] | null;
  default?: string;
  created_at: DateTimeString;
  updated_at: DateTimeString;
  deleted_at: DateTimeString;
}
