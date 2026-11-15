#!/usr/bin/env node
// Simulate agy's headless JSON response. Never contacts external services.
const args = process.argv.slice(2);
const index = args.indexOf('-p');
const prompt = index >= 0 ? args[index + 1] : '';
if (prompt.includes('MOCK_ERROR')) {
  console.log(JSON.stringify({
    conversation_id: '', status: 'ERROR', response: '', error: 'Simulated failure'
  }));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    conversation_id: 'mock-conversation-id', status: 'SUCCESS',
    response: prompt.includes('WORKER_OK') ? 'WORKER_OK\n' : 'mock response',
    usage: { input_tokens: 5, output_tokens: 2, total_tokens: 7 }
  }));
}
