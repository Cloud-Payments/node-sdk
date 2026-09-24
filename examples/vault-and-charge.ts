import { createGateway } from './client.js';

const gateway = createGateway();

// 1. Store the customer. In production the payment details normally arrive as a Tokenizer token
//    (default_payment: { token }); the sandbox test card is used here for a self-contained example.
const created = await gateway.vault.create(
  {
    description: 'Jane Doe',
    default_payment: { card: { number: '4111111111111111', expiration_date: '12/30' } },
    default_billing_address: {
      first_name: 'Jane',
      last_name: 'Doe',
      postal_code: '60601',
      country: 'US',
    },
  },
  { validate: true },
);

const customerId = created.data.id;
const paymentMethodId = created.data.data.customer.defaults.payment_method_id;
console.log('Stored customer', customerId, 'payment method', paymentMethodId);

// 2. Charge the stored payment method later.
const { data: txn } = await gateway.transactions.sale({
  amount: 2500,
  payment_method: { customer: { id: customerId, payment_method_id: paymentMethodId } },
  billing_method: 'straight',
  initiated_by: 'customer',
});
console.log('Charged', txn.id, txn.response);

// 3. Clean up (optional).
await gateway.vault.delete(customerId);
