import { createGateway } from './client.js';

const gateway = createGateway();

const csv = [
  '"transaction_type","amount","cc_number","cc_expiration"',
  '"sale","100","4111111111111111","12/30"',
  '',
].join('\n');

const upload = await gateway.fileBatches.upload({ content: csv, fileName: 'transactions.csv' });
const batchId = upload.data.id;
console.log('Uploaded batch', batchId);

let batch = await gateway.fileBatches.get(batchId);
while (batch.data.status !== 'completed' && batch.data.status !== 'failed') {
  console.log(
    'Status',
    batch.data.status,
    `${batch.data.processed_lines ?? 0}/${batch.data.num_lines}`,
  );
  await new Promise((resolve) => setTimeout(resolve, 5000));
  batch = await gateway.fileBatches.get(batchId);
}

if (batch.data.status === 'completed') {
  const { text } = await gateway.fileBatches.download(batchId);
  console.log(text);
}
