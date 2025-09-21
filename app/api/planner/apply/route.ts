import { NextRequest, NextResponse } from 'next/server'
import { TokenMiddleware } from '@/lib/middleware/token-middleware'
import { getSupabaseAdmin } from '@/lib/server/supabase-admin'

import { createHash } from 'crypto'

// Utilities
function parseEstimatedMinutes(s?: string): number {
  if (!s) return 60
  const m = s.match(/(\d+)(?:-(\d+))?/)
  if (!m) return 60
  const a = parseInt(m[1], 10)
  const b = m[2] ? parseInt(m[2], 10) : a
  return Math.round((a + b) / 2)
}

function toPriorityLabel(p: any): 'low' | 'medium' | 'high' {
  // Accept numeric 1..n or strings
  if (typeof p === 'number') {
    if (p <= 1) return 'high'
    if (p === 2 || p === 3) return 'medium'
    return 'low'
  }
  const s = String(p || '').toLowerCase()
  if (s === 'high') return 'high'
  if (s === 'low') return 'low'
  return 'medium'
}

function hashIdempotency(userId: string, key: string, planId?: string) {
  const data = `${userId}:${key || ''}:${planId || ''}`
  const digest = createHash('sha256').update(data).digest('hex')
  return `idem_${digest}`
}

export async function POST(request: NextRequest) {
  const context = { featureName: 'planner_apply', requiredTokens: 2 }
  return TokenMiddleware.withTokens(request, context, async (userId) => {
    try {
      const body = await request.json()
      const {
        idempotencyKey,
        project,
        plan,
        options = {},
      } = body || {}

      const dryRun: boolean = !!options.dryRun
      const overwriteExisting: boolean = !!options.overwriteExisting

      if (!plan || !Array.isArray(plan?.tasks)) {
        return NextResponse.json({ error: 'Invalid plan payload' }, { status: 400 })
      }

      const admin = getSupabaseAdmin()
      const jobKey = idempotencyKey || plan?.id || 'no-key'
      const jobHash = hashIdempotency(userId, jobKey, plan?.id)

      // Try content-based idempotency: If tasks with same titles already exist under target project,
      // we will skip creating duplicates.

      // Determine project
      let targetProjectId: string | null = null
      const created: { projectId?: string; taskIds: string[]; subtaskIds: string[] } = { taskIds: [], subtaskIds: [] }

      if (dryRun) {
        const summary = {
          jobHash,
          tasks: plan.tasks.length,
          estimatedMinutes: plan.tasks.reduce((acc: number, t: any) => acc + parseEstimatedMinutes(t.estimatedTime), 0),
        }
        return NextResponse.json({ ok: true, dryRun: true, summary })
      }

      // Create or verify project
      if (project?.id) {
        // Verify ownership (best-effort)
        const { data: p, error: perr } = await admin
          .from('projects')
          .select('id, owner_id')
          .eq('id', project.id)
          .single()
        if (perr) {
          return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }
        if (!p.owner_id || p.owner_id !== userId) {
          return NextResponse.json({ error: 'Forbidden: must be project owner' }, { status: 403 })
        }
        targetProjectId = p.id
        // Optionally update deadline (end_date)
        if (project?.deadline) {
          try {
            await admin.from('projects').update({ end_date: project.deadline }).eq('id', targetProjectId)
          } catch {}
        }
      } else {
        const title = project?.title || (plan?.title ? `Auto Plan - ${plan.title}` : 'Auto Plan Project')
        const description = project?.description || (plan?.description || 'Applied from Auto Planner')
        const end_date = project?.deadline || null
        const { data: newProject, error: pErr } = await admin
          .from('projects')
          .insert({
            title,
            description,
            owner_id: userId,
            status: 'planning',
            progress: 0,
            ...(end_date ? { end_date } : {}),
          })
          .select()
          .single()
        if (pErr || !newProject) {
          return NextResponse.json({ error: pErr?.message || 'Failed to create project' }, { status: 500 })
        }
        targetProjectId = newProject.id
        created.projectId = newProject.id
      }

      if (!targetProjectId) {
        return NextResponse.json({ error: 'No project target determined' }, { status: 500 })
      }

      // Apply tasks and subtasks with compensation for rollback on error
      const taskMap: Record<string, string> = {}
      const subtaskMap: Record<string, Record<string, string>> = {}

      try {
        for (const t of plan.tasks as any[]) {
          // Dedup by title under project
          const { data: existingTask } = await admin
            .from('tasks')
            .select('id, title, description')
            .eq('project_id', targetProjectId)
            .eq('title', t.title)
            .maybeSingle()

          let taskId: string
          const estimatedMinutes = parseEstimatedMinutes(t.estimatedTime)
          const estimated_hours = Math.max(1, Math.round((estimatedMinutes / 60) * 10) / 10)

          if (existingTask?.id) {
            if (overwriteExisting) {
              const { data: updated, error: uErr } = await admin
                .from('tasks')
                .update({
                  description: t.description ?? undefined,
                  priority: toPriorityLabel(t.priority),
                  status: 'todo',
                  estimated_hours,
                })
                .eq('id', existingTask.id)
                .select('id')
                .single()
              if (uErr) throw uErr
              taskId = updated.id
            } else {
              taskId = existingTask.id
            }
          } else {
            const { data: inserted, error: iErr } = await admin
              .from('tasks')
              .insert({
                project_id: targetProjectId,
                title: t.title,
                description: t.description,
                priority: toPriorityLabel(t.priority),
                status: 'todo',
                estimated_hours,
              })
              .select('id')
              .single()
            if (iErr || !inserted) throw iErr || new Error('Failed to insert task')
            taskId = inserted.id
            created.taskIds.push(taskId)
          }

          taskMap[t.id] = taskId

          // Subtasks (if provided)
          if (Array.isArray(t.subtasks) && t.subtasks.length) {
            subtaskMap[t.id] = {}
            for (let i = 0; i < t.subtasks.length; i++) {
              const st = t.subtasks[i]
              const stTitle = typeof st === 'string' ? st : st?.title
              if (!stTitle) continue

              const { data: existingSub } = await admin
                .from('subtasks')
                .select('id, title')
                .eq('task_id', taskId)
                .eq('title', stTitle)
                .maybeSingle()

              let subId: string
              if (existingSub?.id) {
                subId = existingSub.id
              } else {
                const { data: insSub, error: sErr } = await admin
                  .from('subtasks')
                  .insert({ task_id: taskId, title: stTitle, is_completed: false })
                  .select('id')
                  .single()
                if (sErr || !insSub) throw sErr || new Error('Failed to insert subtask')
                subId = insSub.id
                created.subtaskIds.push(subId)
              }
              subtaskMap[t.id][String(i)] = subId
            }
          }
        }
      } catch (applyErr) {
        // Compensation-based rollback
        if (created.subtaskIds.length) {
          await admin.from('subtasks').delete().in('id', created.subtaskIds)
        }
        if (created.taskIds.length) {
          await admin.from('tasks').delete().in('id', created.taskIds)
        }
        if (created.projectId) {
          await admin.from('projects').delete().eq('id', created.projectId)
        }
        return NextResponse.json({ error: String(applyErr || 'Apply failed'), rolledBack: true }, { status: 500 })
      }

      // Best-effort activity log
      try {
        await admin.from('activity_logs').insert({
          user_id: userId,
          action: 'plan_applied',
          entity_type: 'project',
          entity_id: targetProjectId,
          metadata: { jobHash, planId: plan?.id || null, tasksApplied: Object.keys(taskMap).length },
        })
      } catch {}

      return NextResponse.json({
        ok: true,
        projectId: targetProjectId,
        jobHash,
        counts: {
          tasks: Object.keys(taskMap).length,
          subtasks: Object.values(subtaskMap).reduce((acc, m) => acc + Object.keys(m).length, 0),
        },
        mapping: { taskMap, subtaskMap },
      })
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
    }
  })
}
