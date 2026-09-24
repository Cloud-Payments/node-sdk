# Security

## Reporting a vulnerability

Please do not open a public issue for security problems. Report them privately through
[GitHub private vulnerability reporting](https://github.com/Cloud-Payments/node-sdk/security/advisories/new)
(the **Report a vulnerability** button on the repository's Security tab). Include a description,
reproduction steps and the affected version.

## Handling secrets

- Use a **private** API key (`api_…`) server-side only. The client rejects public keys.
- The SDK never logs request bodies, API keys or webhook secrets, and error messages only
  include the gateway's `msg` text.
- Verify webhook signatures against the raw request body with `constructWebhookEvent` or
  `verifyWebhookSignature`; both use constant-time comparison.
- Prefer the hosted Tokenizer so raw card data never reaches your servers.
