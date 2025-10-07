#!/usr/bin/env node

/**
 * End-to-End Nova (Groq) Integration Test Suite
 * 
 * Tests all four main features with Nova provider:
 * - Find Topics (extract + report generation)
 * - Planner (plan generation)
 * - Extract Data (document Q&A)
 * - Paraphraser (text rewriting)
 * 
 * Measures latency, handles 429 backoff, and validates responses.
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 120000; // 2 minutes per test
const RETRY_DELAY = 2000; // 2 seconds between retries
const MAX_RETRIES = 3;

// Test data
const TEST_DATA = {
  topics: {
    papers: [
      {
        title: "Machine Learning Applications in Climate Science",
        abstract: "This study explores the use of deep learning models for predicting climate patterns and extreme weather events. We demonstrate significant improvements in accuracy over traditional meteorological models."
      },
      {
        title: "Neural Networks for Environmental Monitoring", 
        abstract: "We present a comprehensive framework for using convolutional neural networks to analyze satellite imagery for deforestation detection and environmental impact assessment."
      },
      {
        title: "AI-Driven Climate Change Mitigation Strategies",
        abstract: "This research investigates how artificial intelligence can optimize renewable energy systems and carbon capture technologies to address climate change challenges."
      }
    ],
    query: "AI applications in climate science"
  },
  planner: {
    userQuery: "Research the impact of artificial intelligence on climate change mitigation",
    description: "Comprehensive analysis of AI technologies in environmental applications",
    selectedTools: ["literature-search", "data-analysis", "synthesis"],
    maxTasks: 8
  },
  extract: {
    context: "Climate change is one of the most pressing challenges of our time. Artificial intelligence offers promising solutions through improved prediction models, optimization of renewable energy systems, and enhanced monitoring capabilities. Machine learning algorithms can analyze vast amounts of environmental data to identify patterns and predict future climate scenarios.",
    message: "What are the main AI applications mentioned for addressing climate change?"
  },
  paraphraser: {
    text: "Artificial intelligence represents a transformative technology for addressing climate change challenges through advanced predictive modeling and optimization techniques.",
    mode: "academic",
    variationLevel: "medium"
  }
};

// Utility functions
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const makeRequest = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  
  if (response.status === 429) {
    const retryAfter = response.headers.get('retry-after');
    const delay = retryAfter ? parseInt(retryAfter) * 1000 : RETRY_DELAY;
    console.log(`Rate limited. Waiting ${delay}ms before retry...`);
    await sleep(delay);
    throw new Error('RATE_LIMITED');
  }
  
  return response;
};

const withRetry = async (fn, maxRetries = MAX_RETRIES) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.message === 'RATE_LIMITED' && i < maxRetries - 1) {
        continue;
      }
      throw error;
    }
  }
};

const measureLatency = async (testName, testFn) => {
  console.log(`\n🧪 Testing ${testName}...`);
  const startTime = Date.now();
  
  try {
    const result = await Promise.race([
      testFn(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Test timeout')), TEST_TIMEOUT)
      )
    ]);
    
    const latency = Date.now() - startTime;
    console.log(`✅ ${testName} completed in ${latency}ms`);
    return { success: true, latency, result };
  } catch (error) {
    const latency = Date.now() - startTime;
    console.log(`❌ ${testName} failed after ${latency}ms: ${error.message}`);
    return { success: false, latency, error: error.message };
  }
};

// Test implementations
const testTopicsExtract = async () => {
  return withRetry(async () => {
    const response = await makeRequest(`${BASE_URL}/api/topics/extract`, {
      method: 'POST',
      body: JSON.stringify({ papers: TEST_DATA.topics.papers })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    const data = await response.json();
    if (!data.success || !Array.isArray(data.topics)) {
      throw new Error('Invalid response format');
    }
    
    console.log(`   📊 Extracted ${data.topics.length} topics`);
    return data;
  });
};

const testTopicsReport = async () => {
  return withRetry(async () => {
    const response = await makeRequest(`${BASE_URL}/api/topics/report/stream`, {
      method: 'POST',
      body: JSON.stringify({ 
        query: TEST_DATA.topics.query,
        quality: 'Standard'
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    return new Promise((resolve, reject) => {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let hasContent = false;
      
      const timeout = setTimeout(() => {
        reject(new Error('Stream timeout'));
      }, TEST_TIMEOUT);
      
      const readStream = async () => {
        try {
          const { done, value } = await reader.read();
          
          if (done) {
            clearTimeout(timeout);
            if (hasContent) {
              resolve({ success: true, message: 'Report generated successfully' });
            } else {
              reject(new Error('No content received'));
            }
            return;
          }
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.message) {
                  console.log(`   📝 ${data.message}`);
                }
              } catch (e) {
                // Ignore JSON parse errors for non-JSON data
              }
            } else if (line.startsWith('event: token')) {
              hasContent = true;
            }
          }
          
          readStream();
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      };
      
      readStream();
    });
  });
};

const testPlanner = async () => {
  return withRetry(async () => {
    const response = await makeRequest(`${BASE_URL}/api/plan-and-execute`, {
      method: 'POST',
      body: JSON.stringify(TEST_DATA.planner)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    return new Promise((resolve, reject) => {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let planReceived = false;
      
      const timeout = setTimeout(() => {
        reject(new Error('Planning timeout'));
      }, TEST_TIMEOUT);
      
      const readStream = async () => {
        try {
          const { done, value } = await reader.read();
          
          if (done) {
            clearTimeout(timeout);
            if (planReceived) {
              resolve({ success: true, message: 'Plan generated successfully' });
            } else {
              reject(new Error('No plan received'));
            }
            return;
          }
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'progress') {
                  console.log(`   📋 ${data.message}`);
                } else if (data.type === 'done') {
                  console.log(`   📊 Plan with ${data.totalTasks} tasks generated`);
                  planReceived = true;
                }
              } catch (e) {
                // Ignore JSON parse errors
              }
            } else if (line.startsWith('event: plan')) {
              planReceived = true;
            }
          }
          
          readStream();
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      };
      
      readStream();
    });
  });
};

const testExtractChat = async () => {
  return withRetry(async () => {
    const response = await makeRequest(`${BASE_URL}/api/extract/chat`, {
      method: 'POST',
      body: JSON.stringify(TEST_DATA.extract)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    const data = await response.json();
    if (!data.success || !data.response) {
      throw new Error('Invalid response format');
    }
    
    console.log(`   💬 Response length: ${data.response.length} characters`);
    return data;
  });
};

const testParaphraser = async () => {
  return withRetry(async () => {
    const params = new URLSearchParams(TEST_DATA.paraphraser);
    const response = await makeRequest(`${BASE_URL}/api/paraphraser/stream?${params}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }
    
    return new Promise((resolve, reject) => {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let tokenCount = 0;
      
      const timeout = setTimeout(() => {
        reject(new Error('Paraphrasing timeout'));
      }, TEST_TIMEOUT);
      
      const readStream = async () => {
        try {
          const { done, value } = await reader.read();
          
          if (done) {
            clearTimeout(timeout);
            if (tokenCount > 0) {
              resolve({ success: true, tokenCount });
            } else {
              reject(new Error('No tokens received'));
            }
            return;
          }
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'token') {
                  tokenCount++;
                } else if (data.type === 'done') {
                  console.log(`   ✍️  Generated ${tokenCount} tokens`);
                }
              } catch (e) {
                // Ignore JSON parse errors
              }
            }
          }
          
          readStream();
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      };
      
      readStream();
    });
  });
};

// Main test runner
const runTests = async () => {
  console.log('🚀 Starting Nova (Groq) Integration Tests');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`⏱️  Timeout: ${TEST_TIMEOUT}ms per test`);
  
  const results = {};
  
  // Test 1: Topics Extract
  results.topicsExtract = await measureLatency('Topics Extract', testTopicsExtract);
  
  // Test 2: Topics Report
  results.topicsReport = await measureLatency('Topics Report Generation', testTopicsReport);
  
  // Test 3: Planner
  results.planner = await measureLatency('Plan Generation', testPlanner);
  
  // Test 4: Extract Chat
  results.extractChat = await measureLatency('Extract Data Chat', testExtractChat);
  
  // Test 5: Paraphraser
  results.paraphraser = await measureLatency('Paraphraser Streaming', testParaphraser);
  
  // Generate report
  console.log('\n📊 Test Results Summary:');
  console.log('=' .repeat(50));
  
  const successful = Object.values(results).filter(r => r.success).length;
  const total = Object.keys(results).length;
  
  console.log(`✅ Successful: ${successful}/${total}`);
  console.log(`❌ Failed: ${total - successful}/${total}`);
  
  console.log('\n📈 Latency Report:');
  Object.entries(results).forEach(([test, result]) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${test}: ${result.latency}ms`);
  });
  
  // Calculate average latency for successful tests
  const successfulTests = Object.values(results).filter(r => r.success);
  if (successfulTests.length > 0) {
    const avgLatency = successfulTests.reduce((sum, r) => sum + r.latency, 0) / successfulTests.length;
    console.log(`📊 Average latency: ${Math.round(avgLatency)}ms`);
  }
  
  // Save detailed results
  const reportPath = path.join(__dirname, '../test-results.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    results,
    summary: {
      total,
      successful,
      failed: total - successful,
      averageLatency: successfulTests.length > 0 ? 
        Math.round(successfulTests.reduce((sum, r) => sum + r.latency, 0) / successfulTests.length) : 0
    }
  }, null, 2));
  
  console.log(`\n💾 Detailed results saved to: ${reportPath}`);
  
  // Exit with appropriate code
  process.exit(successful === total ? 0 : 1);
};

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

// Run tests
runTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
