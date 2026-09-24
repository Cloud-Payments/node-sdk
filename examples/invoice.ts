import { createGateway } from './client.js';

const gateway = createGateway();

const invoice = await gateway.invoices.create({
  currency: 'USD',
  company_name: 'ACME Inc.',
  payable_to: {
    company: 'ACME Inc.',
    address_line_1: '1 Main St',
    city: 'Chicago',
    state: 'IL',
    postal_code: '60601',
    country: 'US',
  },
  bill_to: {
    first_name: 'Jane',
    last_name: 'Doe',
    address_line_1: '2 Oak Ave',
    city: 'Chicago',
    state: 'IL',
    postal_code: '60602',
    country: 'US',
    email: 'jane@example.com',
  },
  date_due: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  items: [
    { name: 'Widget', description: 'A widget', quantity: 1, unit_price: 10000, status: 'pending' },
  ],
  payment_methods: ['card'],
  card_processor_id: '',
  ach_processor_id: '',
  send_via: 'none',
});
console.log('Invoice', invoice.data.id, 'hosted at', invoice.data.hosted_url);

const payment = await gateway.invoices.pay(invoice.data.id, {
  payment_method: { card: { number: '4111111111111111', expiration_date: '12/30', cvc: '123' } },
});
console.log('Paid with transaction', payment.data.id, payment.data.response);
