import { createGateway } from './client.js';

const gateway = createGateway();

const customer = await gateway.vault.create({
  description: 'Subscriber',
  default_payment: { card: { number: '4111111111111111', expiration_date: '12/30' } },
});

const plan = await gateway.recurring.plans.create({
  name: 'Pro monthly',
  amount: 4900,
  billing_cycle_interval: 1,
  billing_frequency: 'monthly',
  billing_days: '1',
});

const subscription = await gateway.recurring.subscriptions.create({
  plan_id: plan.data.id,
  customer: { id: customer.data.id },
  amount: plan.data.amount,
  billing_cycle_interval: 1,
  billing_frequency: 'monthly',
  billing_days: '1',
});
console.log('Subscription', subscription.data.id, 'next bill', subscription.data.next_bill_date);

await gateway.recurring.subscriptions.pause(subscription.data.id);
await gateway.recurring.subscriptions.activate(subscription.data.id);

const failing = await gateway.recurring.subscriptions.search({
  status: { operator: '=', value: 'failing' },
  limit: 10,
});
console.log(`${failing.total_count} failing subscription(s)`);
