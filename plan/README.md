# Find Topics v2 — Working Plan Docs (READ ME FIRST)

This folder contains the authoritative plan for redesigning the "Find Topics" experience. Read this first, follow the order, and only delete this folder after every checklist is completed and verified.

- Start here → `PLAN.md`
- Then read → `OUTPUTS.md`, `EXPECTED.md`, `FILES.md`
- Keep `STATUS.txt` as `IN_PROGRESS` until all items are done. Change to `IMPLEMENTATION_COMPLETE` once fully implemented and verified.

## Safe commands (PowerShell) — read before running

> All commands below are commented for safety. Copy one line at a time after removing the leading `#` when you are ready.

```powershell
# --- Open plan docs in VS Code (if installed)
# code .\plan

# --- Dry run: see what would be deleted (no changes)
# Remove-Item -Recurse -Force .\plan -WhatIf

# --- Guarded delete: requires STATUS.txt to contain IMPLEMENTATION_COMPLETE
# if (Test-Path .\plan\STATUS.txt) {
#   $status = Get-Content .\plan\STATUS.txt -ErrorAction SilentlyContinue
#   if ($status -match 'IMPLEMENTATION_COMPLETE') {
#     Write-Host 'Deleting plan folder...' -ForegroundColor Yellow
#     Remove-Item -Recurse -Force .\plan
#   } else {
#     Write-Host 'Plan not marked complete. Refusing to delete. Update STATUS.txt to IMPLEMENTATION_COMPLETE after verifying all tasks.' -ForegroundColor Red
#   }
# } else {
#   Write-Host 'STATUS.txt missing — not deleting. Create it and set IMPLEMENTATION_COMPLETE once done.' -ForegroundColor Red
# }

# --- Mark complete (only when all checklists are done)
# Set-Content .\plan\STATUS.txt 'IMPLEMENTATION_COMPLETE'
```

## Scope covered by these docs
- Full UX redesign for Find Topics → Topics & Sources → Topic Detail (as in your mockups)
- Streaming pipeline (SSE named events) with partial results
- Unified search + Deep Research integration, clustering, insights
- Security (fetch-based SSE auth), monthly-only tokens, rate-limit handling
- Accessibility and performance guidelines

## Critical reminders
- Do not pass tokens in URLs. Use Authorization header or session cookies.
- Render any AI content safely (no remote scripts; Mermaid disabled for untrusted content).
- Respect monthly-only tokens and refund on abort/timeout as appropriate.

Version: 1.0.0
