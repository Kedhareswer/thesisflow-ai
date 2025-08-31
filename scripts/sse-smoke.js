#!/usr/bin/env node
/*
  SSE Smoke Test for Literature Search Streaming API
  - Opens N concurrent SSE connections to /api/literature-search/stream
  - Parses events (init, paper, error, done)
  - Summarizes throughput, latency, and errors

  Usage:
    node scripts/sse-smoke.js --base http://localhost:3000 \
      --query "large language models" --limit 20 --concurrency 6 --sessions 12

  Options:
    --base         Base URL of your Next.js app (default: http://localhost:3000)
    --query        Search query (default: "llm")
    --limit        Results limit per session (default: 20)
    --concurrency  Max concurrent sessions (default: 5)
    --sessions     Total sessions to run (default: same as concurrency)
    --mode         "", "forward", or "backward" for citation modes (default: "")
    --timeoutMs    Per-session timeout before giving up (default: 30000)
*/

const td = new TextDecoder();

function parseArgs() {
  const args = process.argv.slice(2);
  const out = Object.create(null);
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (!next || next.startsWith('--')) out[key] = true; else { out[key] = next; i++; }
    }
  }
  return {
    base: out.base || 'http://localhost:3000',
    query: out.query || 'llm',
    limit: Number(out.limit || 20),
    concurrency: Number(out.concurrency || 5),
    sessions: Number(out.sessions || out.concurrency || 5),
    mode: (out.mode || '').toLowerCase(),
    timeoutMs: Number(out.timeoutMs || 30000),
  };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runSession({ base, query, limit, mode, timeoutMs }, idx) {
  const qs = new URLSearchParams({ query, limit: String(limit) });
  if (mode === 'forward' || mode === 'backward') qs.set('mode', mode);
  const url = `${base.replace(/\/$/, '')}/api/literature-search/stream?${qs.toString()}`;

  const start = Date.now();
  const metrics = {
    idx,
    status: 0,
    startedAt: start,
    endedAt: 0,
    durationMs: 0,
    init: null,
    done: null,
    paperCount: 0,
    errors: [],
    http429: false,
    retryAfter: 0,
  };

  let timer;
  try {
    const controller = new AbortController();
    timer = setTimeout(() => controller.abort(), Math.max(1000, timeoutMs));

    const resp = await fetch(url, {
      headers: { 'Accept': 'text/event-stream' },
      signal: controller.signal,
    });
    metrics.status = resp.status;

    if (resp.status !== 200) {
      if (resp.status === 429) {
        metrics.http429 = true;
        const ra = resp.headers.get('Retry-After');
        metrics.retryAfter = ra ? Number(ra) || 0 : 0;
      }
      return metrics;
    }

    const reader = resp.body.getReader();
    let buffer = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += td.decode(value, { stream: true });
      let sep;
      while ((sep = buffer.indexOf('\n\n')) >= 0) {
        const chunk = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        handleEvent(chunk, metrics);
      }
    }

  } catch (err) {
    metrics.errors.push({ source: 'client', error: String(err) });
  } finally {
    clearTimeout(timer);
    metrics.endedAt = Date.now();
    metrics.durationMs = metrics.endedAt - metrics.startedAt;
  }
  return metrics;
}

function handleEvent(block, metrics) {
  // block is lines like: "event: paper" + "data: {...}" + maybe other lines
  let ev = 'message';
  let data = '';
  const lines = block.split(/\n/);
  for (const line of lines) {
    if (line.startsWith('event:')) ev = line.slice(6).trim();
    else if (line.startsWith('data:')) data += (data ? '\n' : '') + line.slice(5).trim();
  }
  if (!ev) ev = 'message';
  if (data) {
    try { data = JSON.parse(data); } catch { /* keep raw */ }
  }

  switch (ev) {
    case 'init':
      metrics.init = data;
      break;
    case 'paper':
      metrics.paperCount += 1;
      break;
    case 'error':
      metrics.errors.push(data);
      break;
    case 'done':
      metrics.done = data;
      break;
    default:
      // ignore ping or others
      break;
  }
}

async function pLimit(concurrency, tasks) {
  const res = [];
  let i = 0;
  const running = new Set();

  async function runNext() {
    if (i >= tasks.length) return;
    const current = i++;
    const p = tasks[current]().then(r => { running.delete(p); return r; });
    running.add(p);
    res[current] = p;
    if (running.size >= concurrency) await Promise.race(running);
    return runNext();
  }

  const starters = Array(Math.min(concurrency, tasks.length)).fill(0).map(runNext);
  await Promise.all(starters);
  return Promise.all(res);
}

function summarize(all) {
  const ok = all.filter(m => m.status === 200);
  const failed = all.filter(m => m.status !== 200);
  const totalPapers = ok.reduce((sum, m) => sum + m.paperCount, 0);
  const avgPapers = ok.length ? (totalPapers / ok.length) : 0;
  const avgDur = ok.length ? (ok.reduce((s, m) => s + m.durationMs, 0) / ok.length) : 0;
  const p50 = percentile(ok.map(m => m.durationMs), 50);
  const p90 = percentile(ok.map(m => m.durationMs), 90);
  const p99 = percentile(ok.map(m => m.durationMs), 99);

  const errorBySource = {};
  for (const m of ok) {
    for (const e of m.errors) {
      const src = (e && e.source) ? e.source : 'unknown';
      errorBySource[src] = (errorBySource[src] || 0) + 1;
    }
  }

  console.log('--- SSE Smoke Test Summary ---');
  console.log('sessions_total:', all.length);
  console.log('sessions_ok:', ok.length);
  console.log('sessions_failed:', failed.length);
  console.log('http_429_count:', failed.filter(f => f.http429).length);
  console.log('avg_papers_per_ok_session:', avgPapers.toFixed(2));
  console.log('avg_duration_ms:', Math.round(avgDur));
  console.log('p50_ms:', Math.round(p50), 'p90_ms:', Math.round(p90), 'p99_ms:', Math.round(p99));
  console.log('errors_by_source:', errorBySource);
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const s = arr.slice().sort((a,b)=>a-b);
  const idx = Math.max(0, Math.min(s.length - 1, Math.floor((p/100) * s.length)));
  return s[idx];
}

(async function main() {
  const opts = parseArgs();
  console.log('Starting SSE smoke test with options:', opts);

  const tasks = Array.from({ length: opts.sessions }, (_, i) => () => runSession(opts, i));
  const results = await pLimit(opts.concurrency, tasks);
  summarize(results);
})();
