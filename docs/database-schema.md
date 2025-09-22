# Database Schema (Supabase)

Project URL: xxxxx

This document summarizes the public schema used by ThesisFlow-AI. It focuses on tables that power tokens, usage, planning, collaboration, chat, documents/extractions, citations, profiles/settings, and rate limiting. Column types, defaults, and nullability come from `information_schema` via MCP.

Notes
- RLS is enabled on most public tables; see migrations for exact policies.
- Many FKs refer to `auth.users(id)`.
- Use RPCs for token accounting and rate limits; do not mutate token tables directly from the app.

---

## Tokens and Plans

### public.user_tokens
- PK: `id uuid`
- Columns
  - `user_id uuid` (NOT NULL)
  - `monthly_tokens_used int` DEFAULT `0`
  - `monthly_limit int` DEFAULT `50`
  - `last_monthly_reset date` DEFAULT `date_trunc('month', CURRENT_DATE)`
  - `created_at timestamptz` DEFAULT `now()`
  - `updated_at timestamptz` DEFAULT `now()`
- Purpose: monthly-only token counters per user.

### public.user_plans
- PK: `id uuid` DEFAULT `gen_random_uuid()`
- Columns
  - `user_id uuid` (unique)
  - `plan_type text` DEFAULT `'free'`
  - `status text` DEFAULT `'active'`
  - `monthly_token_limit int` DEFAULT `50`
  - `features_included jsonb` DEFAULT `'[]'`
  - Timestamps: `created_at`, `updated_at`
- Purpose: plan metadata and Stripe linkage.

### public.plan_limits
- PK: composite (`plan_type`, `feature_name`)
- Columns
  - `plan_type text`
  - `feature_name text`
  - `limit_value int` DEFAULT `0` (use `-1` for unlimited)
  - `updated_at timestamptz` DEFAULT `now()`
- Purpose: per-plan feature limits (e.g., explorer unlimited entries).

### public.token_feature_costs
- PK: `id uuid`
- Columns
  - `feature_name text` (unique)
  - `base_cost int` DEFAULT `1`
  - `cost_multipliers jsonb` DEFAULT `'{}'`
  - `is_active boolean` DEFAULT `true`
  - `description text`
  - Timestamps
- Purpose: base costs for features and context multipliers.

### public.token_transactions
- PK: `id uuid`
- Columns
  - `user_id uuid`
  - `operation_type text` IN (`deduct`, `refund`, `grant`, `reset`)
  - `tokens_amount int` > 0
  - `feature_name text`
  - `operation_context jsonb` DEFAULT `'{}'`
  - `success boolean` DEFAULT `true`
  - `error_message text`
  - `ip_address inet`, `user_agent text`
  - `idempotency_key text`
  - `input_tokens int`, `output_tokens int`, `provider_cost_usd numeric`, `latency_ms int`, `error_category text`
  - `created_at timestamptz` DEFAULT `now()`
- Purpose: audit trail and analytics for token operations.

### public.user_usage
- PK: composite (`user_id`, `feature_name`)
- Columns
  - `user_id uuid`
  - `feature_name text`
  - `usage_count int` DEFAULT `0`
  - `last_reset_at timestamptz` DEFAULT `now()`
- Purpose: feature usage counters.

---

## Literature Search Rate Limits

### public.literature_search_rate_limits
- PK: composite (`user_id`, `ip_address`)
- Columns
  - `user_id uuid`
  - `ip_address inet`
  - `requests_count int` DEFAULT `1`
  - `window_start timestamptz` DEFAULT `now()`
  - Timestamps: `created_at`, `updated_at`
- Purpose: per-user and IP sliding window for search rate limiting.

---

## Planner

### public.planner_drafts
- PK: `id uuid`
- Columns
  - `user_id uuid`
  - `title text` DEFAULT `'Untitled Plan'`
  - `description text`
  - `user_query text`
  - `plan_data jsonb` DEFAULT `'{}'`
  - `wizard_step text` DEFAULT `'inputs'` (enum-like)
  - `selected_model text`, `provider_used text` DEFAULT `'openrouter'`
  - `guardrails_passed boolean`, `guardrail_issues text[]`
  - Timestamps: `created_at`, `updated_at`, `last_synced_at`
  - `is_applied boolean` DEFAULT `false`, `applied_at timestamptz`
  - `metadata jsonb` DEFAULT `'{}'`
- Purpose: persistent wizard state and generated plan content.

---

## Collaboration and Chat

### public.teams
- PK: `id uuid`
- Columns
  - `name text`, `description text` DEFAULT `''`
  - `category text` DEFAULT `'Research'`
  - `is_public boolean` DEFAULT `false`
  - Optional: `created_by uuid`, `owner_id uuid`
  - Timestamps: `created_at`, `updated_at`
- Purpose: team spaces.

### public.team_members
- PK: `id uuid`
- Columns
  - `team_id uuid`, `user_id uuid`
  - `role text` DEFAULT `'member'`
  - `joined_at timestamptz` DEFAULT `now()`
- Purpose: team membership and roles.

### public.team_invitations
- PK: `id uuid`
- Columns
  - `team_id uuid`, `invited_email text`
  - `invited_by uuid`, `inviter_id uuid`, `invitee_id uuid`, `invitee_email text`
  - `status text` DEFAULT `'pending'`
  - `expires_at timestamptz`
  - `role text` DEFAULT `'viewer'`
  - `personal_message text`
  - Timestamps: `created_at`, `updated_at`
- Purpose: controlled onboarding.

### public.conversations
- PK: `id uuid`
- Columns
  - `type text` (e.g., team, dm)
  - `name text`, `description text`, `avatar_url text`
  - `created_by uuid`
  - Timestamps: `created_at`, `updated_at`, `last_activity timestamptz`
  - `last_message_id uuid`

### public.conversation_participants
- PK: `id uuid`
- Columns
  - `conversation_id uuid`, `user_id uuid`
  - `role text` DEFAULT `'member'`
  - `joined_at timestamptz` DEFAULT `now()`
  - `last_read_message_id uuid`
  - `is_muted boolean` DEFAULT `false`

### public.chat_messages
- PK: `id uuid`
- Columns
  - `team_id uuid`, `sender_id uuid`
  - `content text`
  - `message_type text` DEFAULT `'text'`
  - `mentions text[]` DEFAULT `{}`
  - `metadata jsonb` DEFAULT `{}`
  - `reactions jsonb` DEFAULT `{}`
  - `reply_to uuid`
  - `message_status text` DEFAULT `'sent'`
  - `is_edited boolean` DEFAULT `false`, `edited_at timestamptz`
  - `created_at timestamptz` DEFAULT `now()`

### public.team_shared_links
- PK: `id uuid`
- Columns
  - `team_id uuid`, `shared_by_id uuid`
  - `platform text` DEFAULT `'custom'`
  - `url text`, `title text`, `description text`
  - `access_level text` DEFAULT `'view'`
  - `is_active boolean` DEFAULT `true`
  - `click_count int` DEFAULT `0`
  - Timestamps: `created_at`, `updated_at`

### public.team_files
- PK: `id uuid`
- Columns
  - `team_id uuid`, `uploader_id uuid`
  - `file_name text`, `file_url text`
  - `file_type text`, `file_size bigint`
  - `description text`, `tags text[]`
  - `is_public boolean` DEFAULT `false`
  - `download_count int` DEFAULT `0`
  - `version int` DEFAULT `1`
  - Cloud: `cloud_storage_id text`, `cloud_storage_provider text`
  - Timestamps: `created_at`, `updated_at`

---

## Documents and Extractions

### public.documents
- PK: `id uuid`
- Columns
  - `title text` DEFAULT `'Untitled document'`
  - `content text`
  - `document_type text` DEFAULT `'paper'`
  - `owner_id uuid`, `team_id uuid`, `project_id uuid`
  - File: `file_url text`, `file_name text`, `file_type text`, `file_size int`, `mime_type text`
  - Flags: `is_public boolean` DEFAULT `false`, `is_archived boolean` DEFAULT `false`
  - `version int` DEFAULT `1`
  - `metadata jsonb` DEFAULT `{}`
  - `tags text[]` DEFAULT `{}`
  - Audit: `created_at`, `updated_at`, `created_by uuid`, `last_edited_by uuid`, `last_edited_at timestamptz`

### public.document_extractions
- PK: `id uuid`
- Columns
  - `user_id uuid`
  - File: `file_name text`, `file_type text`, `file_size bigint`, `mime_type text`, `file_hash text`
  - Pipeline: `extraction_type text`, `extraction_status text` DEFAULT `'pending'`
  - Timestamps: `extraction_started_at`, `extraction_completed_at`
  - Errors: `extraction_error text`
  - Outputs: `extracted_text text`, `extracted_tables jsonb`, `extracted_metadata jsonb`, `extracted_summary text`, `extracted_key_points text[]`, `extracted_entities jsonb`, `extracted_statistics jsonb`
  - OCR: `ocr_applied boolean` DEFAULT `false`, `ocr_confidence double precision`, `ocr_language text` DEFAULT `'en'`
  - Embeddings: `embeddings_generated boolean` DEFAULT `false`
  - Audit: `created_at`, `updated_at`

---

## Citations

### public.citation_collections
- PK: `id uuid`
- Columns
  - `user_id uuid`
  - `name text`
  - `created_at timestamptz` DEFAULT `now()`

### public.citation_items
- PK: `id uuid`
- Columns
  - `user_id uuid`
  - `collection_id uuid`
  - `title text`, `year text`, `doi text`, `url text`, `journal text`
  - CSL: `csl_json jsonb`
  - `styles jsonb`
  - `created_at timestamptz` DEFAULT `now()`

---

## Users, Profiles, Settings, Storage

### public.user_profiles
- PK: `id uuid`
- Columns
  - `email text`
  - `full_name text`, `display_name varchar`, `avatar_url text`
  - `bio text`, `location varchar`, `website text`, `institution varchar`, `position varchar`
  - `research_interests text[]`
  - Presence: `status varchar` DEFAULT `'online'`, `last_active timestamptz` DEFAULT `now()`
  - Access: `role text` DEFAULT `'user'`, `active boolean` DEFAULT `true`
  - Legal: `accepted_terms boolean` DEFAULT `false`, `accepted_terms_at timestamptz`
  - Marketing: `email_marketing_opt_in boolean` DEFAULT `false`
  - Timestamps: `created_at`, `updated_at`

### public.user_settings
- PK: `id uuid`
- Columns
  - `user_id uuid`
  - `language text` DEFAULT `'en'`, `timezone text` DEFAULT `'UTC'`, `theme text` DEFAULT `'light'`
  - Toggles: `email_notifications boolean` DEFAULT `true`, `research_updates boolean` DEFAULT `true`, `collaboration_invites boolean` DEFAULT `true`, `security_alerts boolean` DEFAULT `true`, `data_sharing boolean` DEFAULT `false`
  - Timestamps: `created_at`, `updated_at`

### public.user_storage_providers
- PK: `id uuid` DEFAULT `uuid_generate_v4()`
- Columns
  - `user_id uuid`
  - `provider text`
  - Tokens: `access_token text`, `refresh_token text`, `expires_at timestamptz`
  - `scope text[]`
  - Provider user identity: `provider_user_id text`, `provider_user_email text`, `provider_user_name text`, `provider_user_avatar text`
  - `is_active boolean` DEFAULT `true`
  - Timestamps: `created_at`, `updated_at`

---

## Views
- `public.users` — security invoker view that exposes limited user fields.

---

## Public Functions (highlights)
- Token & usage
  - `get_feature_cost(feature_name text, context jsonb)`
  - `deduct_user_tokens(user_id uuid, feature_name text, tokens int, context jsonb)`
  - `refund_user_tokens(user_id uuid, feature_name text, tokens int, context jsonb)`
  - `check_token_rate_limit(user_id uuid, feature_name text, context jsonb)`
  - `reset_user_tokens_if_needed(user_id uuid)`
  - `initialize_user_tokens(user_id uuid)`
  - `append_usage_metrics(transaction_id uuid, metrics jsonb)`
- Literature search
  - `check_literature_search_rate_limit(user_id uuid, ip inet, limit int DEFAULT 100, window_minutes int DEFAULT 60)`
- Feature gating
  - `can_use_feature(user_id uuid, feature_name text)`

Use these functions via server-side services (e.g., `lib/services/token.service.ts`). Avoid direct SQL modifications from the app unless coordinated.

---

## Migrations of Note (selection)
- Token system overhaul and monthly-only tokens
  - `create_token_system_fixed`
  - `monthly_only_tokens_20250919`
  - `insert_feature_costs_and_policies`
  - `update_token_functions_idempotency`
- Literature search improvements
  - `enhanced_literature_search_system`
  - `create_literature_search_rate_limits_table`
- Planner drafts
  - `create_planner_drafts`
- Collaboration & chat
  - Numerous RLS, policy, and index migrations across July–Sept 2025

---

## Change Management
- When altering tables/columns/RPCs, create a new migration and update the associated services and docs.
- Maintain backward-compatible API contracts where possible (additive changes preferred).
- Coordinate any token or SSE contract changes with `docs/apis-critical-do-not-touch.md`.
