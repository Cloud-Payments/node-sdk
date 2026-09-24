# Security

## Reporting a vulnerability

Please report suspected vulnerabilities privately to the maintainers rather than opening a
public issue. Include a description, reproduction steps and the affected version.

## Handling secrets

- Use a **private** API key (`api_…`) server-side only. The client rejects public keys.
- The SDK never logs request bodies, API keys or webhook secrets, and error messages only
  include the gateway's `msg` text.
- Verify webhook signatures against the raw request body with `constructWebhookEvent` or
  `verifyWebhookSignature`; both use constant-time comparison.
- Prefer the hosted Tokenizer so raw card data never reaches your servers.
