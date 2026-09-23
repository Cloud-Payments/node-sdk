import { createServer } from 'node:http';
import { InvalidArgumentError, constructWebhookEvent } from '../src/index.js';

const secret = process.env.WEBHOOK_SECRET ?? '';
const previousSecret = process.env.WEBHOOK_PREVIOUS_SECRET;
const seen = new Set<string>();

createServer((req, res) => {
  const chunks: Buffer[] = [];
  req.on('data', (chunk: Buffer) => chunks.push(chunk));
  req.on('end', () => {
    try {
      const { event, eventId, verifiedWith } = constructWebhookEvent(
        Buffer.concat(chunks),
        req.headers,
        secret,
        {
          previousSecret,
        },
      );

      if (eventId && seen.has(eventId)) {
        res.writeHead(200).end();
        return;
      }
      if (eventId) seen.add(eventId);

      console.log(`Received ${event.type} (verified with ${verifiedWith})`);
      if (event.type === 'transaction_create' && 'transaction_id' in event) {
        console.log('New transaction', event.transaction_id);
      }
      res.writeHead(200).end();
    } catch (error) {
      console.error('Rejected webhook:', error instanceof Error ? error.message : error);
      res.writeHead(error instanceof InvalidArgumentError ? 400 : 500).end();
    }
  });
}).listen(3000, () => console.log('Listening on http://localhost:3000'));
