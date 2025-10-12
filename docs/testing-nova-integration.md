# Testing Nova Integration

This guide covers how to test the Nova (Groq) integration across all ThesisFlow-AI features.

## Quick Test Commands

```bash
# Test against local development server
npm run test:nova:dev

# Test against production/staging
TEST_BASE_URL=https://your-domain.com npm run test:nova

# Manual test with custom timeout
TEST_TIMEOUT=180000 npm run test:nova:dev
```

## What Gets Tested

### 1. Find Topics
- **Topics Extract**: Extracts research topics from paper abstracts
- **Topics Report**: Generates comprehensive research reports with streaming
- **Expected**: 15-30s total, no "Curation timed out" errors

### 2. Planner  
- **Plan Generation**: Creates structured research plans with JSON validation
- **Expected**: 8-15s, valid JSON with tasks and metadata

### 3. Extract Data
- **Document Q&A**: Answers questions based on document context
- **Expected**: 1-3s response time, relevant answers

### 4. Paraphraser
- **Text Rewriting**: Streams rewritten text in real-time
- **Expected**: 2-8s, smooth token streaming

## Test Results

The test suite measures:
- **Latency**: Response time for each feature
- **Success Rate**: Percentage of successful requests
- **Error Handling**: Proper 429 backoff and retries
- **Streaming**: SSE event handling and token delivery

### Expected Performance (Nova vs OpenRouter)

| Feature | OpenRouter Free | Nova (Groq) | Improvement |
|---------|----------------|-------------|-------------|
| Topics Extract | 10-20s | 3-8s | 3x faster |
| Topics Report | 60-120s + timeouts | 15-30s | 4x faster |
| Planner | 30-60s | 8-15s | 3x faster |
| Extract Chat | 5-15s | 1-3s | 5x faster |
| Paraphraser | 10-30s | 2-8s | 4x faster |

## Manual Testing

### Prerequisites
1. Ensure Nova API key is configured:
   ```bash
   # In .env.local
   NOVA_API_KEY=gsk_your_key_here
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

### Test Each Feature

#### Find Topics
1. Navigate to `/topics`
2. Upload sample papers or use the demo data
3. Click "Find Topics" - should complete in 3-8s
4. Generate a report - should complete in 15-30s without timeouts

#### Planner
1. Navigate to `/planner`
2. Enter: "Research AI applications in climate science"
3. Select tools and click "Generate Plan"
4. Should receive structured plan in 8-15s

#### Extract Data
1. Navigate to `/extract`
2. Upload a document or paste text
3. Ask questions about the content
4. Should get responses in 1-3s

#### Paraphraser
1. Navigate to `/paraphraser`
2. Enter text to rewrite
3. Select mode (academic, creative, etc.)
4. Should see streaming output in 2-8s

## Troubleshooting Test Failures

### Common Issues

**"Connection refused"**
- Ensure server is running on correct port
- Check BASE_URL configuration

**"Rate limit exceeded"**
- Tests include automatic 429 handling
- Check Nova API quota and limits

**"Test timeout"**
- Increase TEST_TIMEOUT environment variable
- Check network connectivity and server performance

**"Invalid response format"**
- Verify API routes are correctly updated
- Check for syntax errors in route handlers

### Debug Mode

Run tests with debug logging:
```bash
DEBUG=1 npm run test:nova:dev
```

### Individual Feature Testing

Test specific features by modifying the test script:
```javascript
// Comment out tests you don't want to run
// results.topicsExtract = await measureLatency('Topics Extract', testTopicsExtract);
// results.topicsReport = await measureLatency('Topics Report Generation', testTopicsReport);
results.planner = await measureLatency('Plan Generation', testPlanner);
// results.extractChat = await measureLatency('Extract Data Chat', testExtractChat);
// results.paraphraser = await measureLatency('Paraphraser Streaming', testParaphraser);
```

## Continuous Integration

### GitHub Actions Example
```yaml
name: Nova Integration Tests
on: [push, pull_request]

jobs:
  test-nova:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm start &
      - run: sleep 30  # Wait for server to start
      - run: npm run test:nova
        env:
          NOVA_API_KEY: ${{ secrets.NOVA_API_KEY }}
```

### Load Testing

For production readiness, run load tests:
```bash
# Test with multiple concurrent requests
CONCURRENCY=5 npm run test:nova

# Extended duration test
TEST_DURATION=300000 npm run test:nova  # 5 minutes
```

## Performance Monitoring

The test suite generates `test-results.json` with:
- Detailed timing data
- Success/failure rates  
- Error messages and stack traces
- Performance trends over time

Use this data to:
- Monitor performance regressions
- Optimize model selection
- Adjust timeout values
- Plan capacity scaling
