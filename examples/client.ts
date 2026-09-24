import { GatewayClient } from '../src/index.js';

/** Shared client factory for the examples. */
export function createGateway(): GatewayClient {
  const apiKey = process.env.GATEWAY_API_KEY;
  const baseUrl = process.env.GATEWAY_BASE_URL;
  if (!apiKey || !baseUrl) {
    throw new Error('Set GATEWAY_API_KEY and GATEWAY_BASE_URL before running the examples');
  }
  return new GatewayClient({ apiKey, baseUrl, maxRetries: 2 });
}
