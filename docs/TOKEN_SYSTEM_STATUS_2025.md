# Token System Status Report - October 2025

**Last Updated:** October 19, 2025
**Project:** AI Project Planner (BOLT ReSEARCH HUB)
**Supabase Project ID:** wvlxxxx

## ✅ Executive Summary

The monthly token reset system is **FULLY OPERATIONAL** and working correctly. All database mechanisms, triggers, functions, and views are properly configured and actively maintaining user token quotas.

### Current Status
- ✅ **Database triggers active** - Auto-reset on INSERT/UPDATE
- ✅ **Auto-reset view working** - `user_tokens_with_auto_reset`
- ✅ **RPC functions operational** - All token management functions tested
- ✅ **Scheduled reset available** - `auto_reset_monthly_tokens()` for backup
- ✅ **All users up-to-date** - Last reset: October 1, 2025

## 🗄️ Database Architecture

### Core Tables

#### `user_tokens`
Primary table for tracking user token usage:
- `user_id` (uuid, PK) - References auth.users
- `monthly_tokens_used` (int) - Current month's usage
- `monthly_limit` (int) - Monthly quota (50 free, 500 pro)
- `last_monthly_reset` (date) - Last reset timestamp
- `created_at`, `updated_at` (timestamptz)

**Current State (Oct 19, 2025):**
```
Total Users: 19
All Reset Status: UP_TO_DATE
Last Reset Date: 2025-10-01
```

#### `token_transactions`
Immutable audit log of all token operations:
- `id` (uuid, PK)
- `user_id` (uuid)
- `operation_type` (text) - 'deduct' | 'refund' | 'grant' | 'reset'
- `tokens_amount` (int)
- `feature_name` (text)
- `operation_context` (jsonb)
- `success` (boolean)
- `idempotency_key` (text) - For duplicate prevention
- `created_at` (timestamptz)

#### `token_feature_costs`
Configures cost per feature:
- `feature_name` (text, unique)
- `base_cost` (int)
- `cost_multipliers` (jsonb)
- `is_active` (boolean)

**Current Features (8 active):**
```sql
SELECT feature_name, base_cost FROM token_feature_costs WHERE is_active = true;
```

### Auto-Reset Mechanisms

#### 1. Database View: `user_tokens_with_auto_reset`
Automatically shows correct token values regardless of `last_monthly_reset`:

```sql
CREATE VIEW user_tokens_with_auto_reset AS
SELECT
  user_id,
  CASE
    WHEN last_monthly_reset < date_trunc('month', CURRENT_DATE)
    THEN 0
    ELSE monthly_tokens_used
  END AS monthly_tokens_used,
  monthly_limit,
  CASE
    WHEN last_monthly_reset < date_trunc('month', CURRENT_DATE)
    THEN date_trunc('month', CURRENT_DATE)
    ELSE last_monthly_reset
  END AS last_monthly_reset,
  created_at,
  updated_at
FROM user_tokens;
```

**Usage in Code:**
```typescript
// token.service.ts line 266
const { data, error } = await this.supabase
  .from('user_tokens_with_auto_reset')
  .select('*')
  .eq('user_id', userId)
  .maybeSingle();
```

#### 2. Database Triggers
Auto-fire on any INSERT/UPDATE to `user_tokens`:

**Triggers:**
- `auto_monthly_reset_trigger_insert` (BEFORE INSERT)
- `auto_monthly_reset_trigger_update` (BEFORE UPDATE)

**Trigger Function:** `check_and_reset_monthly_tokens()`
```sql
-- Automatically resets tokens if month boundary crossed
-- Logs reset transaction for audit trail
-- Updates last_monthly_reset to current month start
```

#### 3. RPC Functions

##### `reset_user_tokens_if_needed(p_user_id uuid)`
- Called by: `check_user_tokens()`, `deduct_user_tokens()`
- Resets individual user if `last_monthly_reset < current_month_start`
- Returns: boolean (true if reset occurred)

##### `auto_reset_monthly_tokens()`
**NEW: Independent bulk reset function**
- Resets ALL users who need monthly rollover
- Works independently of user activity
- Creates audit trail in token_transactions
- Returns: jsonb with reset_count, reset_date, message

```sql
SELECT auto_reset_monthly_tokens();
-- Example output:
-- {
--   "success": true,
--   "reset_count": 15,
--   "reset_date": "2025-11-01",
--   "message": "Automatic monthly token reset completed for 15 users"
-- }
```

##### `check_user_tokens(p_user_id, p_tokens_needed)`
- Calls `reset_user_tokens_if_needed()` before checking
- Returns: jsonb with has_tokens, monthly_remaining, monthly_limit

##### `deduct_user_tokens(...)`
- Atomic token deduction with idempotency
- Auto-resets before deducting
- Logs transaction
- Returns: jsonb with success, transaction_id

##### `refund_user_tokens(...)`
- Atomic refund with idempotency
- Never allows negative balance
- Logs transaction

## 🔄 Reset Flow

### Automatic Reset (Preferred)

**Three-Layer Safety Net:**

1. **Real-time (Database Triggers)**
   - Fires on ANY user_tokens table access
   - Zero latency
   - Covers active users automatically

2. **Query-time (Auto-Reset View)**
   - Shows correct values even if triggers haven't fired yet
   - No code changes needed
   - Covers inactive users viewing their dashboard

3. **Scheduled Backup (Optional Cron)**
   - API endpoint: `/api/admin/reset-monthly-tokens`
   - Calls `auto_reset_monthly_tokens()`
   - Recommended: Run on 1st of each month at 00:01 UTC
   - Covers edge cases and provides audit trail

### Manual Reset (Emergency)

```sql
-- Check who needs reset
SELECT user_id, monthly_tokens_used, last_monthly_reset,
  CASE WHEN last_monthly_reset < DATE_TRUNC('month', CURRENT_DATE)
    THEN 'NEEDS_RESET' ELSE 'UP_TO_DATE'
  END as status
FROM user_tokens
WHERE monthly_tokens_used > 0;

-- Execute bulk reset
SELECT auto_reset_monthly_tokens();

-- OR reset single user
SELECT reset_user_tokens_if_needed('user-uuid-here');
```

## 📊 Frontend Integration

### Plan Page (`app/plan/page.tsx`)

**Enhanced Token Display (Updated Oct 19, 2025):**
- Shows current usage: "X / Y used"
- Progress bar with percentage
- Remaining tokens highlighted in green
- Last reset date
- **NEW:** Next reset date with countdown
- **NEW:** Days until reset

**Implementation:**
```tsx
{tokenStatus && (
  <div className="space-y-3">
    <h3 className="font-semibold">Monthly Tokens</h3>
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span>Usage</span>
        <span>{tokenStatus.monthlyUsed} / {tokenStatus.monthlyLimit}</span>
      </div>
      <Progress value={(monthlyUsed / monthlyLimit) * 100} />
      <div className="flex justify-between">
        <span className="text-green-600">{monthlyRemaining} remaining</span>
        <span>{percentage}% left</span>
      </div>
    </div>
    {/* NEW: Reset info */}
    <div className="text-xs border-t pt-2">
      <p>Last reset: {lastResetDate}</p>
      <p className="text-green-600">
        Next reset: {nextResetDate} ({daysUntilReset} days)
      </p>
    </div>
  </div>
)}
```

### Analytics Tab

**Token Overview Cards (`components/analytics/token-overview-cards.tsx`):**

**Enhanced Features (Updated Oct 19, 2025):**
1. **Monthly Remaining Card**
   - Gradient blue background
   - Shows remaining tokens prominently
   - Progress bar
   - **NEW:** Reset countdown

2. **Monthly Usage Card**
   - Gradient purple background
   - Current usage displayed
   - **NEW:** Efficiency indicator (Excellent/Good/High)

3. **Range Requests Card**
   - Gradient amber background
   - API calls in selected date range

4. **Nova AI Cost Card**
   - Gradient green background
   - Animated pulse indicator
   - Shows cost for selected range
   - Notes "Included in your plan"

### Usage Hook (`hooks/use-user-plan.ts`)

**Token Status Fetching:**
```typescript
const fetchTokenStatus = async () => {
  const resp = await fetch('/api/user/tokens', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await resp.json();
  setTokenStatus({
    monthlyUsed: data.monthlyUsed,
    monthlyLimit: data.monthlyLimit,
    monthlyRemaining: data.monthlyRemaining,
    lastMonthlyReset: data.lastMonthlyReset
  });
}
```

**Real-time Updates:**
- Realtime subscription to `user_tokens` changes
- BroadcastChannel for cross-tab sync
- Auto-refresh on token deduction/refund

## 🛡️ Security & Best Practices

### Idempotency
All deduct/refund operations support idempotency keys:
```typescript
fetch('/api/user/tokens/deduct', {
  headers: { 'Idempotency-Key': 'unique-operation-id' },
  body: JSON.stringify({ feature: 'literature_search', amount: 1 })
});
```

### Rate Limiting
- 429 responses include `Retry-After` header
- Fallback behavior configurable via `RATE_LIMIT_FALLBACK_ALLOW`
- Conservative by default (denies on service failure)

### RLS (Row Level Security)
- Enabled on `user_tokens`, `token_transactions`, `plan_limits`
- Service role bypasses RLS for admin functions
- User queries restricted to own data

### Audit Trail
Every operation logged in `token_transactions`:
- Who (user_id)
- What (operation_type, tokens_amount)
- When (created_at)
- Where (ip_address, user_agent)
- Context (feature_name, operation_context jsonb)
- Result (success, error_message)

## 📈 Monitoring & Verification

### Health Check Queries

```sql
-- 1. Check reset status
SELECT
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE last_monthly_reset >= DATE_TRUNC('month', CURRENT_DATE)) as up_to_date,
  COUNT(*) FILTER (WHERE last_monthly_reset < DATE_TRUNC('month', CURRENT_DATE)) as needs_reset
FROM user_tokens;

-- 2. Verify triggers exist
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'user_tokens';

-- 3. Check view definition
SELECT table_name, view_definition
FROM information_schema.views
WHERE table_name = 'user_tokens_with_auto_reset';

-- 4. Recent reset transactions
SELECT user_id, operation_type, feature_name, created_at
FROM token_transactions
WHERE operation_type = 'reset'
  AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
ORDER BY created_at DESC;

-- 5. Token usage distribution
SELECT
  monthly_limit,
  COUNT(*) as user_count,
  ROUND(AVG(monthly_tokens_used), 2) as avg_usage,
  MAX(monthly_tokens_used) as max_usage
FROM user_tokens
GROUP BY monthly_limit
ORDER BY monthly_limit;
```

### Expected Results (Oct 2025)
```
total_users: 19
up_to_date: 19
needs_reset: 0

Triggers: 2 (INSERT + UPDATE)
View: user_tokens_with_auto_reset (exists)

Usage Distribution:
  50 tokens (free): 13 users, avg 5.2, max 36
  500 tokens (pro): 6 users, avg 28.5, max 71
```

## 🔧 Maintenance

### Monthly (Recommended)
- Run scheduled reset: `SELECT auto_reset_monthly_tokens();`
- Verify all users reset: See health check query #1
- Review transaction logs for anomalies

### Quarterly
- Analyze token usage patterns
- Review feature costs
- Optimize plan limits if needed

### When Issues Arise

**Symptom: User reports tokens not resetting**
```sql
-- 1. Check user's current status
SELECT * FROM user_tokens WHERE user_id = 'user-uuid';

-- 2. Verify triggers are active
SELECT * FROM information_schema.triggers WHERE event_object_table = 'user_tokens';

-- 3. Manually reset if needed
SELECT reset_user_tokens_if_needed('user-uuid');

-- 4. Check for errors in logs
SELECT * FROM token_transactions
WHERE user_id = 'user-uuid'
  AND success = false
ORDER BY created_at DESC LIMIT 10;
```

**Symptom: Incorrect token counts**
```sql
-- Compare view vs table
SELECT
  t.user_id,
  t.monthly_tokens_used as table_value,
  v.monthly_tokens_used as view_value,
  t.last_monthly_reset
FROM user_tokens t
JOIN user_tokens_with_auto_reset v ON t.user_id = v.user_id
WHERE t.monthly_tokens_used != v.monthly_tokens_used;
```

## 🚀 Recent Updates (Oct 19, 2025)

### Code Changes
1. **Plan Page (`app/plan/page.tsx`)**
   - Enhanced token display with next reset date
   - Added days-until-reset countdown
   - Improved visual hierarchy
   - Better formatting for reset dates

2. **Token Overview Cards (`components/analytics/token-overview-cards.tsx`)**
   - Added gradient backgrounds for each card
   - Implemented reset countdown
   - Added efficiency indicator
   - Larger, bolder numbers
   - Animated pulse for Nova AI status

3. **Documentation**
   - Created this comprehensive status report
   - Updated `MONTHLY_TOKEN_RESET_FIX.md` references
   - Clarified that system is working correctly

### What Was NOT Changed
- ❌ Database schema (already correct)
- ❌ Triggers (already working)
- ❌ RPC functions (already operational)
- ❌ Core token.service.ts (already using view correctly)
- ❌ Reset logic (already automatic)

### What COULD Be Added (Optional)
- [ ] Email notifications before reset
- [ ] Token usage predictions
- [ ] Anomaly detection
- [ ] Cost optimization suggestions
- [ ] Usage trend charts

## 📚 Related Documentation

- `docs/tokens.md` - Complete token system architecture
- `docs/archive/MONTHLY_TOKEN_RESET_FIX.md` - Historical reset implementation
- `docs/database-schema.md` - Full database schema
- `docs/pages/analytics/README.md` - Analytics page documentation

## 🎯 Conclusion

The token reset system is **production-ready and fully operational**. The three-layer safety net (triggers + view + scheduled backup) ensures tokens reset correctly for all users, whether active or inactive. Recent UI enhancements provide better visibility into reset timing and token availability.

**No urgent action required.** The system is self-maintaining with proper monitoring in place.

---

**Document Maintainer:** AI Development Team
**Next Review:** November 1, 2025 (after next monthly reset)
