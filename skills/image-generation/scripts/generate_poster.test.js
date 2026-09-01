import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AtlasHttpError,
  getAtlasPrediction,
  parseArgs,
  submitAtlasGeneration,
} from './dist/generate_poster.js';

test('keeps Gemini as the default provider', () => {
  const args = parseArgs(['-d', '/tmp/output.jpg', 'test prompt']);
  assert.equal(args.cheap, false);
  assert.equal(args.atlas, false);
  assert.equal(args.prompt, 'test prompt');
});

test('submits the Atlas generation POST exactly once', async () => {
  let calls = 0;
  const fetchStub = async () => {
    calls += 1;
    return new Response(JSON.stringify({ code: 500, message: 'submit failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  await assert.rejects(
    submitAtlasGeneration({ model: 'test', prompt: 'test' }, 'test-key', fetchStub),
    AtlasHttpError
  );
  assert.equal(calls, 1);
});

test('retries transient prediction GET failures within the bound', async () => {
  let calls = 0;
  const fetchStub = async () => {
    calls += 1;
    if (calls === 1) {
      return new Response(JSON.stringify({ message: 'unavailable' }), { status: 503 });
    }
    return new Response(JSON.stringify({ code: 200, data: { status: 'processing' } }));
  };

  const result = await getAtlasPrediction('prediction-1', 'test-key', 3, fetchStub, async () => {});
  assert.equal(result.status, 'processing');
  assert.equal(calls, 2);
});

test('does not retry non-transient prediction failures', async () => {
  let calls = 0;
  const fetchStub = async () => {
    calls += 1;
    return new Response(JSON.stringify({ message: 'bad request' }), { status: 400 });
  };

  await assert.rejects(
    getAtlasPrediction('prediction-1', 'test-key', 3, fetchStub, async () => {}),
    AtlasHttpError
  );
  assert.equal(calls, 1);
});
