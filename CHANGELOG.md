# Changelog

All notable changes to this project are documented in this file. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project follows
[Semantic Versioning](https://semver.org/).

## [0.1.0] – 2026-09-23

### Added

- `GatewayClient` with API key authentication, configurable base URL for white-labelled hosts,
  timeouts, opt-in retries with exponential backoff and injectable `fetch`.
- Resources: transactions (sale, authorize, verify, credit, capture, void, refund, get, search,
  amount calculation, fee lookup), customer vault (customers, addresses, payment methods),
  recurring billing (add-ons, discounts, plans, subscriptions), invoices, products, carts,
  custom fields, file batches, BIN lookup, settlement batches, terminals, partner merchant
  boarding (merchants, processors, users, Simple Payments pages, webhook secrets) and fraud rules.
- Typed error hierarchy (`ApiError` subclasses, `NetworkError`, `TimeoutError`, …) with
  correlation ids.
- Response code constants and helpers.
- Webhook signature verification (`constructWebhookEvent`, `verifyWebhookSignature`,
  `computeWebhookSignature`) including secret rotation and test deliveries.
- Full TypeScript types for every request and response.
- ESM and CommonJS builds, 100% unit test coverage, documentation and examples.
- Sandbox integration suite (`npm run test:integration`) that exercises every resource against a
  real gateway when `GATEWAY_API_KEY` and `GATEWAY_BASE_URL` are configured, and is skipped
  otherwise.
