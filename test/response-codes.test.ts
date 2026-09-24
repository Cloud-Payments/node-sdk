import { describe, expect, it } from 'vitest';
import {
  RESPONSE_CODE_DESCRIPTIONS,
  ResponseCode,
  categorizeResponseCode,
  describeResponseCode,
  isApprovedResponseCode,
} from '../src/index.js';

describe('response codes', () => {
  it('categorises documented ranges', () => {
    expect(categorizeResponseCode(0)).toBe('unknown');
    expect(categorizeResponseCode(99)).toBe('pending');
    expect(categorizeResponseCode(100)).toBe('approved');
    expect(categorizeResponseCode(110)).toBe('approved');
    expect(categorizeResponseCode(199)).toBe('approved');
    expect(categorizeResponseCode(200)).toBe('declined');
    expect(categorizeResponseCode(262)).toBe('declined');
    expect(categorizeResponseCode(301)).toBe('gateway_declined');
    expect(categorizeResponseCode(440)).toBe('processor_error');
    expect(categorizeResponseCode(500)).toBe('unknown');
    expect(categorizeResponseCode(-1)).toBe('unknown');
  });

  it('reports approvals', () => {
    expect(isApprovedResponseCode(ResponseCode.APPROVED)).toBe(true);
    expect(isApprovedResponseCode(ResponseCode.PARTIAL_APPROVAL)).toBe(true);
    expect(isApprovedResponseCode(ResponseCode.DECLINED)).toBe(false);
  });

  it('describes known and unknown codes', () => {
    expect(describeResponseCode(202)).toBe('Insufficient funds');
    expect(describeResponseCode(301)).toBe(RESPONSE_CODE_DESCRIPTIONS[301]);
    expect(describeResponseCode(255)).toBe('declined (code 255)');
    expect(describeResponseCode(999)).toBe('unknown (code 999)');
  });

  it('documents every constant', () => {
    for (const code of Object.values(ResponseCode)) {
      expect(RESPONSE_CODE_DESCRIPTIONS[code]).toBeTypeOf('string');
    }
  });
});
