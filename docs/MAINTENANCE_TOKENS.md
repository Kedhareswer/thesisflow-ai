# Token System Maintenance Guide

**Quick Reference for Developers & Admins**

## System Overview

The token system automatically resets monthly quotas via:
1. **Database triggers** (real-time, on table access)
2. **Auto-reset view** (query-time calculations)
3. **Scheduled backup** (optional cron for bulk resets)

## Quick Health Check

```bash
# Run this to verify system status
curl -X GET https://your-domain.com/api/user/tokens \
  -H "Authorization: Bearer $USER_TOKEN"

# Expected response:
# {
#   "monthlyUsed": 36,
#   "monthlyLimit": 50,
#   "monthlyRemaining": 14
# }
```

## Common Tasks

### 1. Verify Reset System is Working

```sql
-- Check if all users are up-to-date
SELECT
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE last_monthly_reset >= DATE_TRUNC('month', CURRENT_DATE)) as current,
  COUNT(*) FILTER (WHERE last_monthly_reset < DATE_TRUNC('month', CURRENT_DATE)) as stale
FROM user_tokens;

-- Expected: stale = 0
```

### 2. Manually Trigger Reset (Emergency)

```sql
-- Reset ALL users who need it
SELECT auto_reset_monthly_tokens();

-- OR reset single user
SELECT reset_user_tokens_if_needed('user-uuid-here');
```

### 3. Check Token Transaction History

```sql
-- Recent resets
SELECT user_id, created_at, operation_context
FROM token_transactions
WHERE operation_type = 'reset'
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### 4. Verify Triggers Are Active

```sql
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'user_tokens';

-- Expected: 2 triggers (INSERT + UPDATE)
```

### 5. Test Token Deduction

```bash
# Deduct 1 token for a user
curl -X POST https://your-domain.com/api/user/tokens/deduct \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "feature": "literature_search",
    "amount": 1,
    "context": {"test": true}
  }'

# Expected: {"success": true, "monthlyRemaining": X}
```

## Monthly Checklist

**Run on the 1st of each month:**

- [ ] Execute: `SELECT auto_reset_monthly_tokens();`
- [ ] Verify result: `reset_count` should match total active users
- [ ] Check health query: All users should show `current_month`
- [ ] Review logs: Check for any failed reset transactions
- [ ] Monitor support: Watch for user-reported token issues

## Troubleshooting

### Issue: "Tokens not resetting for user"

1. **Check user status:**
```sql
SELECT * FROM user_tokens WHERE user_id = 'uuid';
```

2. **Check what view returns:**
```sql
SELECT * FROM user_tokens_with_auto_reset WHERE user_id = 'uuid';
```

3. **Manually reset:**
```sql
SELECT reset_user_tokens_if_needed('uuid');
```

4. **Verify reset:**
```sql
SELECT * FROM token_transactions
WHERE user_id = 'uuid' AND operation_type = 'reset'
ORDER BY created_at DESC LIMIT 1;
```

### Issue: "Incorrect token count"

```sql
-- Compare table vs view
SELECT
  t.monthly_tokens_used as table_value,
  v.monthly_tokens_used as view_value,
  t.last_monthly_reset,
  DATE_TRUNC('month', CURRENT_DATE) as current_month
FROM user_tokens t
JOIN user_tokens_with_auto_reset v ON t.user_id = v.user_id
WHERE t.user_id = 'uuid';
```

If view shows 0 but table shows > 0, and `last_monthly_reset < current_month`, then:
- View is correct (auto-calculating reset)
- Trigger will update table on next INSERT/UPDATE
- Or run manual reset to update table immediately

### Issue: "Database triggers not firing"

```sql
-- Verify triggers exist
\dS user_tokens  -- In psql

-- OR
SELECT * FROM information_schema.triggers
WHERE event_object_table = 'user_tokens';

-- Recreate if missing (contact DBA)
```

## Monitoring Alerts

Set up alerts for:

1. **Stale resets** (users with old `last_monthly_reset`):
```sql
SELECT COUNT(*) FROM user_tokens
WHERE last_monthly_reset < DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day';
-- Alert if > 0
```

2. **Failed transactions** (recent failures):
```sql
SELECT COUNT(*) FROM token_transactions
WHERE success = false
  AND created_at >= NOW() - INTERVAL '1 hour';
-- Alert if > 10
```

3. **High usage** (users near limit):
```sql
SELECT COUNT(*) FROM user_tokens
WHERE monthly_tokens_used::float / monthly_limit > 0.9;
-- Notify product team if increasing
```

## Cron Job Setup (Optional Backup)

**Recommended:** Run monthly on 1st at 00:01 UTC

### Vercel Cron
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/admin/reset-monthly-tokens",
      "schedule": "1 0 1 * *"
    }
  ]
}
```

### Environment Variable
```env
CRON_SECRET=your-secure-random-string-here
```

### Manual Trigger
```bash
curl -X POST https://your-domain.com/api/admin/reset-monthly-tokens \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Code References

### Frontend
- **Plan Page:** `app/plan/page.tsx:315-356` (token display)
- **Analytics:** `components/analytics/token-overview-cards.tsx:20-103`
- **Hook:** `hooks/use-user-plan.ts:142-179` (fetchTokenStatus)

### Backend
- **Service:** `lib/services/token.service.ts:256-299` (getUserTokenStatus)
- **API:** `app/api/user/tokens/route.ts`
- **Deduct:** `app/api/user/tokens/deduct/route.ts`

### Database
- **View:** `user_tokens_with_auto_reset`
- **Triggers:** `auto_monthly_reset_trigger_insert`, `auto_monthly_reset_trigger_update`
- **Functions:** `auto_reset_monthly_tokens()`, `reset_user_tokens_if_needed()`, `check_and_reset_monthly_tokens()`

## Support Escalation

If issue persists after troubleshooting:

1. **Check System Status:** `docs/TOKEN_SYSTEM_STATUS_2025.md`
2. **Review Full Docs:** `docs/tokens.md`
3. **Database Schema:** `docs/database-schema.md`
4. **Contact:** DBA or senior backend engineer

## Change Log

- **2025-10-19:** Enhanced UI displays, updated documentation
- **2025-10:** Verified all systems operational
- **2025-09:** Implemented auto-reset view + triggers
- **2025-08:** Initial scheduled reset function

---

**Last Updated:** October 19, 2025
**Maintained By:** Development Team
**Next Review:** November 1, 2025
