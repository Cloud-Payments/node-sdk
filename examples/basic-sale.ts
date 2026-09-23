import { randomUUID } from 'node:crypto';
import { ApiError, categorizeResponseCode, describeResponseCode } from '../src/index.js';
import { createGateway } from './client.js';

const gateway = createGateway();

try {
  const { data: txn, correlation_id } = await gateway.transactions.sale({
    amount: 1299,
    currency: 'USD',
    order_id: `ORDER-${Date.now()}`,
    idempotency_key: randomUUID(),
    payment_method: {
      card: { number: '4111111111111111', expiration_date: '12/30', cvc: '123' },
    },
    billing_address: { first_name: 'Jane', last_name: 'Doe', postal_code: '60601', country: 'US' },
  });

  console.log(
    `Transaction ${txn.id}: ${txn.response} (${txn.response_code} – ${describeResponseCode(txn.response_code)})`,
  );
  console.log('Correlation id:', correlation_id);

  if (categorizeResponseCode(txn.response_code) !== 'approved') {
    console.log('Processor said:', txn.response_body.card?.processor_response_text);
  }
} catch (error) {
  if (error instanceof ApiError) {
    console.error(
      `Gateway error ${error.httpStatus}: ${error.msg ?? error.message} (correlation ${error.correlationId})`,
    );
  } else {
    throw error;
  }
}
