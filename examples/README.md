# Examples

Runnable TypeScript scripts that use the SDK from source. Set the environment variables and run
with a TypeScript runner such as `npx tsx`:

```bash
export GATEWAY_API_KEY=api_...
export GATEWAY_BASE_URL=https://sandbox.your-gateway.com
npx tsx examples/basic-sale.ts
```

| Script                | What it shows                                                 |
| --------------------- | ------------------------------------------------------------- |
| `basic-sale.ts`       | A card sale, decline handling and error classes.              |
| `vault-and-charge.ts` | Store a customer from a token, then charge the stored method. |
| `subscription.ts`     | Create a plan and a subscription, then pause/reactivate it.   |
| `invoice.ts`          | Create an invoice and pay it through the API.                 |
| `file-batch.ts`       | Upload a CSV batch, poll and download the results.            |
| `webhook-server.ts`   | Verify webhook signatures with the Node `http` module.        |

The scripts use sandbox test data; see `docs/testing.md`.
