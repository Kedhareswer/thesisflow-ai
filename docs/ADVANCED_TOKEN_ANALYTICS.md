# Advanced Token Analytics & Optimization Features

**Version:** 2.0
**Date:** October 19, 2025
**Status:** Production Ready

## Overview

This document describes the advanced analytics, prediction, and optimization features added to the AI Project Planner token system. These features provide users with intelligent insights into their usage patterns, predictive analytics, anomaly detection, and cost optimization recommendations.

## Features Added

### 1. ✅ Automatic Monthly Token Rollout

**File:** `vercel.json`

Configured automatic cron job to reset monthly tokens on the 1st of each month.

```json
{
  "crons": [
    {
      "path": "/api/admin/reset-monthly-tokens",
      "schedule": "1 0 1 * *"
    }
  ]
}
```

**Schedule:** Runs at 00:01 UTC on the 1st of every month

**Endpoint:** `/api/admin/reset-monthly-tokens`
- Calls `auto_reset_monthly_tokens()` RPC function
- Resets ALL users who need monthly rollover
- Creates audit trail in `token_transactions`
- Returns count of users reset

**Security:** Requires `CRON_SECRET` environment variable

---

### 2. 📱 Mobile Device Warning

**File:** `components/mobile-warning.tsx`

Intelligent modal that warns users when accessing from mobile devices.

#### Features:
- **Device Detection:** Automatically detects mobile/tablet devices
- **Screen Size Check:** Warns on screens < 768px width
- **Persistent Banner:** Shows dismissible banner after modal closed
- **Smart Dismissal:** Remembers user choice for 7 days
- **Informative:** Explains why desktop is recommended

#### Why Desktop is Better:
- Complex analytics visualizations
- Multi-panel document editing
- Advanced search and filtering
- Keyboard shortcuts
- Better PDF viewing

#### Implementation:
```tsx
import { MobileWarning } from "@/components/mobile-warning"

// Added to app/layout.tsx
<MobileWarning />
```

#### User Experience:
1. **First Visit:** Full modal with detailed explanation
2. **After Dismissal:** Compact banner at bottom
3. **Banner Dismissal:** Can be hidden per session
4. **Re-appearance:** Modal shows again after 7 days

---

### 3. 🤖 AI-Powered Usage Predictions

**File:** `lib/services/token-analytics.service.ts`

Machine learning-based prediction system that forecasts monthly usage.

#### Algorithm:

```typescript
async predictUsage(userId: string): Promise<UsagePrediction>
```

**Inputs:**
- Last 30 days of transaction history
- User's current plan and limits
- Usage pattern analysis (trend, volatility)

**Calculations:**
1. **Base Prediction:** Average monthly usage from historical data
2. **Trend Adjustment:**
   - Increasing trend: +20% buffer
   - Decreasing trend: -10% reduction
   - Stable: No adjustment
3. **Volatility Adjustment:**
   - High volatility: +15% safety margin
   - Medium/Low: No adjustment
4. **Confidence Score:** Based on data points (0-100%)

**Output:**
```typescript
{
  userId: string;
  predictedMonthlyUsage: number;
  confidence: number; // 0-1
  willExceedLimit: boolean;
  recommendedPlan: 'free' | 'pro';
  daysUntilLimitReached: number | null;
  suggestions: string[];
}
```

**Example Suggestions:**
- "Upgrade to Pro plan (500 tokens/month) to avoid running out"
- "Consider upgrading - usage trending upward"
- "Monitor consumption regularly - high volatility detected"
- "You may downgrade to Free plan based on patterns"

---

### 4. 🚨 Anomaly Detection System

**File:** `lib/services/token-analytics.service.ts`

Real-time detection of unusual usage patterns.

#### Algorithm:

```typescript
async detectAnomalies(userId: string, lookbackHours: number = 24): Promise<UsageAnomaly[]>
```

**Detection Types:**

##### 1. **Sudden Spike**
- Trigger: Usage > 3x expected
- Severity: Critical if > 5x, High if > 3x
- Description: "Unusually high consumption in last X hours"

##### 2. **Rapid Consumption**
- Trigger: > 30 requests in 1 hour
- Severity: Critical if > 60, Medium otherwise
- Description: "X requests in last hour"

##### 3. **Unusual Pattern**
- Trigger: Single feature consuming > 80% of tokens
- Severity: Low
- Description: "Feature X consuming Y% of tokens"

##### 4. **Potential Abuse**
- Trigger: Same operation repeated > 50 times
- Severity: Critical if > 100, High otherwise
- Description: "Same operation repeated X times"

**Output:**
```typescript
{
  userId: string;
  timestamp: string;
  type: 'spike' | 'unusual_pattern' | 'rapid_consumption' | 'potential_abuse';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  currentUsage: number;
  expectedUsage: number;
  deviation: number;
}
```

---

### 5. 📊 Usage Trends Visualization

**File:** `components/analytics/usage-trends-chart.tsx`

Beautiful, interactive chart showing historical usage and predictions.

#### Features:

**Chart Types:**
- **Area Chart:** Historical usage (last 30 days)
- **Predicted Line:** Next 7 days forecast (dashed)
- **Limit Line:** Monthly limit reference

**Visual Elements:**
- Gradient fills for better readability
- Responsive design
- Tooltip with detailed data
- Legend for all data series

**Pattern Summary Cards:**
- Average Daily usage
- Average Monthly usage
- Trend indicator (increasing/decreasing/stable)
- Volatility level (high/medium/low)

**Data Integration:**
Fetches from multiple endpoints:
- `/api/usage/analytics/trends` - Historical + predictions
- `/api/usage/analytics/predictions` - AI predictions
- `/api/usage/analytics/anomalies` - Detected anomalies
- `/api/usage/analytics/optimizations` - Cost suggestions

---

### 6. 💡 Cost Optimization Engine

**File:** `lib/services/token-analytics.service.ts`

Intelligent recommendations for reducing costs and improving efficiency.

#### Analysis Categories:

##### 1. **Plan Optimization**
```typescript
"💡 Consider downgrading to Free - usage (X) within free tier"
"⚡ Upgrade to Pro recommended - predicted usage (X) exceeds free tier"
```

##### 2. **Feature Usage**
```typescript
"📊 Feature X consumes Y% of tokens - optimize this workflow"
```

##### 3. **Usage Patterns**
```typescript
"📈 Highly variable usage - set up alerts"
"⏰ Peak usage during business hours - batch off-peak operations"
```

##### 4. **Trend Alerts**
```typescript
"⚠️ Usage trending upward - projected to hit limit in X days"
```

---

## API Endpoints

### `/api/usage/analytics/trends`
**Method:** GET
**Auth:** Bearer token required
**Response:**
```json
{
  "trendData": [
    {
      "date": "2025-10-01",
      "tokens": 15,
      "limit": 50,
      "predicted": null
    },
    // ... more days
  ],
  "pattern": {
    "trend": "increasing",
    "volatility": "medium",
    "averageDaily": 12.5,
    "averageMonthly": 375
  }
}
```

### `/api/usage/analytics/predictions`
**Method:** GET
**Auth:** Bearer token required
**Response:**
```json
{
  "userId": "uuid",
  "predictedMonthlyUsage": 420,
  "confidence": 0.85,
  "willExceedLimit": false,
  "recommendedPlan": "free",
  "daysUntilLimitReached": null,
  "suggestions": [
    "You have plenty of tokens remaining"
  ]
}
```

### `/api/usage/analytics/anomalies`
**Method:** GET
**Auth:** Bearer token required
**Query Params:** `?hours=24` (default)
**Response:**
```json
{
  "anomalies": [
    {
      "userId": "uuid",
      "timestamp": "2025-10-19T12:00:00Z",
      "type": "spike",
      "severity": "high",
      "description": "Unusually high consumption",
      "currentUsage": 150,
      "expectedUsage": 40,
      "deviation": 275
    }
  ]
}
```

### `/api/usage/analytics/optimizations`
**Method:** GET
**Auth:** Bearer token required
**Response:**
```json
{
  "suggestions": [
    "💡 Consider downgrading to Free plan...",
    "📊 literature_search consumes 75% of tokens..."
  ]
}
```

---

## Database Schema Impact

### No Schema Changes Required ✅

All analytics work with existing tables:
- `user_tokens`
- `token_transactions`
- `user_plans`
- `token_feature_costs`

The analytics service queries these tables and performs calculations in-memory.

---

## UI Components

### Usage Trends Chart
**Location:** `components/analytics/usage-trends-chart.tsx`
**Placement:** Plan page > Analytics tab
**Dependencies:** Recharts for visualization

**Sections:**
1. **Main Chart:** Historical + predicted usage
2. **Pattern Summary:** 4 metric cards
3. **Predictions Card:** AI forecast with suggestions
4. **Anomalies Card:** Detected issues (if any)
5. **Optimizations Card:** Cost-saving tips

**Color Coding:**
- 🔵 Blue: Historical data
- 🟣 Purple: Predictions
- 🔴 Red: Limits and warnings
- 🟢 Green: Optimizations
- 🟡 Yellow: Cautions

---

## Mobile Warning Modal

**Location:** `components/mobile-warning.tsx`
**Trigger:** Automatic on mobile/tablet devices
**Dismissal:** 7-day cookie

**Layout:**
- **Modal:** Full explanation with feature list
- **Banner:** Compact persistent reminder

**Design:**
- Amber color scheme for warnings
- Icons for visual appeal
- Clear CTA: "I Understand, Continue Anyway"
- Info about recommended screen size (1024px+)

---

## Environment Variables

### Required
```env
# Cron job authentication
CRON_SECRET=your-secure-random-string-here

# Supabase (already required)
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

---

## Testing

### Manual Testing Checklist

#### Predictions
- [ ] View analytics tab with sufficient data
- [ ] Verify predictions show for active users
- [ ] Check confidence score calculation
- [ ] Confirm suggestions are relevant

#### Anomalies
- [ ] Generate spike by rapid usage
- [ ] Verify anomaly detection within 24h
- [ ] Check severity levels correct
- [ ] Confirm descriptions are accurate

#### Trends
- [ ] Chart shows last 30 days
- [ ] Predicted line appears for next 7 days
- [ ] Limit line at correct level
- [ ] Pattern cards show accurate metrics

#### Mobile Warning
- [ ] Test on mobile device
- [ ] Verify modal appears once
- [ ] Check banner persists after dismissal
- [ ] Confirm 7-day re-appearance

#### Cron Job
```bash
# Test endpoint manually
curl -X POST http://localhost:3000/api/admin/reset-monthly-tokens \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## Performance Considerations

### Caching Strategy
- Analytics queries not cached (real-time data)
- Consider Redis for high-traffic scenarios
- Predictions recalculated on each view

### Query Optimization
- Indexed on `user_id`, `created_at`
- Limited to 30-day lookback
- Aggregations done in-memory

### Rate Limiting
- Analytics endpoints: No special limits
- Uses standard auth rate limiting

---

## Monitoring & Alerts

### Metrics to Track

1. **Prediction Accuracy**
   - Compare predicted vs actual monthly usage
   - Track confidence score distribution

2. **Anomaly Detection Rate**
   - False positive percentage
   - Severity distribution

3. **Optimization Adoption**
   - Track suggestion click-through
   - Measure plan changes after recommendations

4. **Mobile Warning Effectiveness**
   - Dismissal rate
   - Desktop switch rate

### Recommended Alerts

```sql
-- High anomaly rate (> 10% of users)
SELECT COUNT(DISTINCT user_id) FROM (
  SELECT DISTINCT user_id
  FROM token_transactions
  WHERE created_at >= NOW() - INTERVAL '1 hour'
  AND operation_type = 'deduct'
) WHERE /* anomaly detection logic */;

-- Prediction accuracy drift
-- Compare predicted vs actual after month end
```

---

## Future Enhancements

### Planned Features
- [ ] Email notifications for anomalies
- [ ] Webhook integration for critical alerts
- [ ] Historical prediction accuracy tracking
- [ ] Custom optimization rules per user
- [ ] A/B testing different prediction algorithms
- [ ] Export analytics data to CSV
- [ ] Integration with Slack/Discord
- [ ] Mobile app with push notifications

### Research Ideas
- Machine learning model improvements
- Seasonal pattern detection
- User cohort analysis
- Predictive maintenance alerts

---

## Troubleshooting

### Issue: Predictions Not Showing
**Cause:** Insufficient data (< 7 days)
**Solution:** Wait for more usage data or reduce minimum threshold

### Issue: Anomalies Always Triggering
**Cause:** Thresholds too sensitive
**Solution:** Adjust multipliers in `detectAnomalies()`

### Issue: Cron Job Not Running
**Cause:** Vercel cron not configured
**Solution:** Ensure `vercel.json` deployed and `CRON_SECRET` set

### Issue: Mobile Warning Not Appearing
**Cause:** LocalStorage dismissed
**Solution:** Clear browser storage or wait 7 days

---

## Code Examples

### Using Analytics Service

```typescript
import { tokenAnalytics } from '@/lib/services/token-analytics.service';

// Get user pattern
const pattern = await tokenAnalytics.analyzeUsagePattern(userId);

// Generate predictions
const prediction = await tokenAnalytics.predictUsage(userId);

// Detect anomalies
const anomalies = await tokenAnalytics.detectAnomalies(userId, 24);

// Get optimization tips
const tips = await tokenAnalytics.getCostOptimizations(userId);
```

### Rendering Trends Chart

```tsx
import { UsageTrendsChart } from '@/components/analytics/usage-trends-chart';

export function AnalyticsPage() {
  return (
    <div>
      <UsageTrendsChart />
    </div>
  );
}
```

---

## Migration Notes

### Upgrading from v1.0

1. **Add Environment Variable:**
   ```bash
   CRON_SECRET=$(openssl rand -hex 32)
   ```

2. **Deploy vercel.json:**
   ```bash
   git add vercel.json
   git commit -m "Add automatic token reset cron"
   git push
   ```

3. **No Database Changes Required** ✅

4. **Optional: Backfill Analytics**
   - Analytics work with existing data
   - No backfill needed

---

## Support & Maintenance

### Regular Tasks
- **Monthly:** Verify cron job executed successfully
- **Quarterly:** Review prediction accuracy
- **Annually:** Audit anomaly detection thresholds

### Getting Help
- **Documentation:** This file + `TOKEN_SYSTEM_STATUS_2025.md`
- **Code Reference:** `lib/services/token-analytics.service.ts`
- **API Docs:** See API Endpoints section above

---

**Last Updated:** October 19, 2025
**Maintained By:** Development Team
**Next Review:** November 19, 2025
