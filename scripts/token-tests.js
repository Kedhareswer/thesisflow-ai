/*
Usage:
  ACCESS_TOKEN="<jwt>" BASE_URL="http://localhost:3000" node scripts/token-tests.js

Tests:
  1) Concurrency: fires two deducts in parallel with different idempotency keys
  2) Idempotency: fires two deducts with the same idempotency key; expects only one consumption
  3) Rate limit: requests an absurd amount to provoke 429 + Retry-After
*/

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const FEATURE = process.env.TEST_FEATURE || 'ai_chat';

if (!ACCESS_TOKEN) {
  console.error('Missing ACCESS_TOKEN env var');
  process.exit(1);
}

async function getStatus() {
  const res = await fetch(`${BASE_URL}/api/user/tokens`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Status error ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

async function deduct(amount = 1, idemKey) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${ACCESS_TOKEN}`,
  };
  if (idemKey) headers['Idempotency-Key'] = idemKey;

  const body = JSON.stringify({ feature: FEATURE, amount });
  const res = await fetch(`${BASE_URL}/api/user/tokens/deduct`, {
    method: 'POST',
    headers,
    body,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, headers: Object.fromEntries(res.headers.entries()), json };
}

async function main() {
  console.log('Base URL:', BASE_URL);
  console.log('Feature:', FEATURE);

  // Baseline
  const before = await getStatus();
  console.log('Status (before):', before);

  // 1) Concurrency test
  console.log('\n[Concurrency] Deducting 1 token in parallel x2 (different keys)');
  const c1 = deduct(1, `concurrency-${Date.now()}-a`);
  const c2 = deduct(1, `concurrency-${Date.now()}-b`);
  const [r1, r2] = await Promise.all([c1, c2]);
  console.log('Concurrency results:', r1.status, r2.status);

  const afterConcurrency = await getStatus();
  console.log('Status (after concurrency):', afterConcurrency);

  // 2) Idempotency test
  console.log('\n[Idempotency] Deducting 1 token twice with the same Idempotency-Key');
  const idemKey = `idem-${Date.now()}`;
  const iBefore = await getStatus();
  const i1 = await deduct(1, idemKey);
  const i2 = await deduct(1, idemKey);
  const iAfter = await getStatus();
  console.log('First response:', i1.status);
  console.log('Second response (should not double-charge):', i2.status);
  console.log('Status delta (idempotency): dailyUsed', iAfter.dailyUsed - iBefore.dailyUsed,
              'monthlyUsed', iAfter.monthlyUsed - iBefore.monthlyUsed);

  // 3) Rate limit test
  console.log('\n[RateLimit] Requesting huge amount to provoke 429');
  const rl = await deduct(999999999, `ratelimit-${Date.now()}`);
  console.log('RateLimit status:', rl.status, 'Retry-After:', rl.headers['retry-after']);
  if (rl.status !== 429) {
    console.warn('Warning: did not receive 429 as expected; check limits and feature configuration.');
  }

  console.log('\nDone.');
}

main().catch((e) => {
  console.error('Test run failed:', e);
  process.exit(1);
});
