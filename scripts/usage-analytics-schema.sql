-- Usage Analytics Schema and Aggregation
-- This script adds columns, indexes, RPC helpers, and a materialized view
-- to power detailed analytics (tokens, requests, costs, latency) by day and
-- by multiple dimensions (service, provider, model, origin, feature, quality, per_result_bucket).

-- 1) Columns for fast metrics on token_transactions
ALTER TABLE IF EXISTS public.token_transactions
  ADD COLUMN IF NOT EXISTS input_tokens integer,
  ADD COLUMN IF NOT EXISTS output_tokens integer,
  ADD COLUMN IF NOT EXISTS provider_cost_usd numeric(12,6),
  ADD COLUMN IF NOT EXISTS latency_ms integer,
  ADD COLUMN IF NOT EXISTS error_category text;

-- 2) Helpful indexes
-- JSONB GIN on operation_context for dimension filters
CREATE INDEX IF NOT EXISTS token_transactions_operation_context_gin
  ON public.token_transactions USING gin (operation_context);

-- Composite indexes to speed user-scoped, time-ordered queries
CREATE INDEX IF NOT EXISTS token_transactions_user_success_created_at
  ON public.token_transactions (user_id, success, created_at);

CREATE INDEX IF NOT EXISTS token_transactions_user_op_created_at
  ON public.token_transactions (user_id, operation_type, created_at);

-- 3) Materialized View for daily aggregates
DROP MATERIALIZED VIEW IF EXISTS public.usage_daily_mv;
CREATE MATERIALIZED VIEW public.usage_daily_mv AS
WITH base AS (
  SELECT
    user_id,
    date_trunc('day', created_at) AS day,
    feature_name,
    CASE
      WHEN feature_name ILIKE '%literature%' THEN 'explorer'
      WHEN feature_name ILIKE '%summary%' OR feature_name ILIKE '%summar%' THEN 'summarizer'
      WHEN feature_name ILIKE '%assistant%' OR feature_name ILIKE '%chat%' THEN 'ai_assistant'
      WHEN feature_name ILIKE '%generation%' OR feature_name ILIKE '%write%' THEN 'ai_writing'
      ELSE 'other'
    END AS service,
    lower(coalesce(operation_context->>'provider', 'other')) AS provider,
    lower(coalesce(operation_context->>'model', 'other')) AS model,
    lower(coalesce(operation_context->>'origin', '')) AS origin,
    lower(coalesce(operation_context->>'quality', '')) AS quality,
    CASE
      WHEN (operation_context->>'per_result') ~ '^[0-9]+$' THEN
        CASE
          WHEN ((operation_context->>'per_result')::int) BETWEEN 1 AND 5 THEN '1-5'
          WHEN ((operation_context->>'per_result')::int) BETWEEN 6 AND 10 THEN '6-10'
          WHEN ((operation_context->>'per_result')::int) BETWEEN 11 AND 20 THEN '11-20'
          WHEN ((operation_context->>'per_result')::int) BETWEEN 21 AND 50 THEN '21-50'
          WHEN ((operation_context->>'per_result')::int) > 50 THEN '51+'
          ELSE 'unknown'
        END
      ELSE 'unknown'
    END AS per_result_bucket,
    tokens_amount,
    provider_cost_usd,
    latency_ms,
    success,
    operation_type
  FROM public.token_transactions
)
SELECT
  user_id,
  day::date AS day,
  service,
  provider,
  model,
  feature_name,
  origin,
  quality,
  per_result_bucket,
  -- metrics
  sum(tokens_amount) FILTER (WHERE operation_type = 'deduct') AS tokens,
  count(*) FILTER (WHERE operation_type = 'deduct') AS requests,
  coalesce(sum(provider_cost_usd), 0)::numeric(12,6) AS cost_usd,
  avg(tokens_amount) FILTER (WHERE operation_type = 'deduct') AS avg_tokens,
  percentile_disc(0.95) WITHIN GROUP (ORDER BY tokens_amount)
    FILTER (WHERE operation_type = 'deduct') AS p95_tokens,
  avg(latency_ms) FILTER (WHERE latency_ms IS NOT NULL AND operation_type = 'deduct') AS avg_latency,
  percentile_disc(0.95) WITHIN GROUP (ORDER BY latency_ms)
    FILTER (WHERE latency_ms IS NOT NULL AND operation_type = 'deduct') AS p95_latency,
  CASE WHEN count(*) = 0 THEN 0
       ELSE (count(*) FILTER (WHERE success = false))::decimal / count(*)
  END AS error_rate
FROM base
GROUP BY 1,2,3,4,5,6,7,8,9
WITH NO DATA;

-- Unique index to enable CONCURRENTLY refresh
CREATE UNIQUE INDEX IF NOT EXISTS usage_daily_mv_pk
  ON public.usage_daily_mv (user_id, day, service, provider, model, feature_name, origin, quality, per_result_bucket);

-- 4) RPC helpers
-- Merge additional context into a transaction row
CREATE OR REPLACE FUNCTION public.update_token_transaction_context(
  p_transaction_id uuid,
  p_merge_context jsonb
) RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.token_transactions
     SET operation_context = coalesce(operation_context, '{}'::jsonb) || coalesce(p_merge_context, '{}'::jsonb)
   WHERE id = p_transaction_id;
  RETURN FOUND;
END;
$$;

-- Append metrics to a transaction row
CREATE OR REPLACE FUNCTION public.append_usage_metrics(
  p_transaction_id uuid,
  p_metrics jsonb
) RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.token_transactions SET
    input_tokens = COALESCE(input_tokens, NULLIF((p_metrics->>'input_tokens')::int, NULL)),
    output_tokens = COALESCE(output_tokens, NULLIF((p_metrics->>'output_tokens')::int, NULL)),
    provider_cost_usd = COALESCE(provider_cost_usd, (p_metrics->>'cost_usd')::numeric),
    latency_ms = COALESCE(latency_ms, NULLIF((p_metrics->>'latency_ms')::int, NULL)),
    success = COALESCE((p_metrics->>'success')::boolean, success),
    error_category = COALESCE((p_metrics->>'error_category')::text, error_category)
  WHERE id = p_transaction_id;
  RETURN FOUND;
END;
$$;

-- Refresh materialized view concurrently (requires unique index)
CREATE OR REPLACE FUNCTION public.refresh_usage_daily_mv()
RETURNS void
LANGUAGE sql
AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.usage_daily_mv;
$$;
