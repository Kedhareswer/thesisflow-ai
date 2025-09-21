import { createClient } from '@supabase/supabase-js'

export interface PlannerDraft {
  id: string
  user_id: string
  title: string
  description?: string
  user_query: string
  plan_data: any
  wizard_step: 'inputs' | 'generate' | 'edit' | 'preview' | 'apply'
  selected_model?: string
  provider_used: string
  guardrails_passed?: boolean
  guardrail_issues?: string[]
  created_at: string
  updated_at: string
  last_synced_at: string
  is_applied: boolean
  applied_at?: string
  metadata: any
}

export interface CreateDraftParams {
  title?: string
  description?: string
  user_query: string
  plan_data?: any
  wizard_step?: PlannerDraft['wizard_step']
  selected_model?: string
  metadata?: any
}

export interface UpdateDraftParams {
  title?: string
  description?: string
  user_query?: string
  plan_data?: any
  wizard_step?: PlannerDraft['wizard_step']
  selected_model?: string
  guardrails_passed?: boolean
  guardrail_issues?: string[]
  is_applied?: boolean
  applied_at?: string
  metadata?: any
}

export class PlannerDraftService {
  private supabase: any

  constructor() {
    this.initializeSupabase()
  }

  private async initializeSupabase() {
    if (typeof window !== 'undefined') {
      // Client-side
      const { supabase } = await import('@/integrations/supabase/client')
      this.supabase = supabase
    } else {
      // Server-side
      const { createSupabaseAdmin } = await import('@/lib/auth-utils')
      this.supabase = createSupabaseAdmin()
    }
  }

  private async ensureSupabaseReady() {
    if (!this.supabase) {
      await this.initializeSupabase()
    }
    if (!this.supabase) {
      throw new Error('Supabase client not initialized')
    }
  }

  /**
   * Create a new planner draft
   */
  async createDraft(params: CreateDraftParams, userId?: string): Promise<PlannerDraft> {
    await this.ensureSupabaseReady()

    let finalUserId = userId
    if (!finalUserId && typeof window !== 'undefined') {
      const { data: { session } } = await this.supabase.auth.getSession()
      finalUserId = session?.user?.id
    }

    if (!finalUserId) {
      throw new Error('User ID required to create draft')
    }

    const draftData = {
      user_id: finalUserId,
      title: params.title || 'Untitled Plan',
      description: params.description,
      user_query: params.user_query,
      plan_data: params.plan_data || {},
      wizard_step: params.wizard_step || 'inputs',
      selected_model: params.selected_model,
      provider_used: 'openrouter',
      metadata: params.metadata || {}
    }

    const { data, error } = await this.supabase
      .from('planner_drafts')
      .insert(draftData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create draft: ${error.message}`)
    }

    return data
  }

  /**
   * Update an existing draft
   */
  async updateDraft(draftId: string, params: UpdateDraftParams, userId?: string): Promise<PlannerDraft> {
    await this.ensureSupabaseReady()

    let query = this.supabase
      .from('planner_drafts')
      .update(params)
      .eq('id', draftId)

    // Add user filter if userId provided (for server-side calls)
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query.select().single()

    if (error) {
      throw new Error(`Failed to update draft: ${error.message}`)
    }

    return data
  }

  /**
   * Get a specific draft by ID
   */
  async getDraft(draftId: string, userId?: string): Promise<PlannerDraft | null> {
    await this.ensureSupabaseReady()

    let query = this.supabase
      .from('planner_drafts')
      .select('*')
      .eq('id', draftId)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      throw new Error(`Failed to get draft: ${error.message}`)
    }

    return data
  }

  /**
   * List user's drafts with optional filtering
   */
  async listDrafts(
    userId?: string,
    options: {
      wizardStep?: PlannerDraft['wizard_step']
      isApplied?: boolean
      limit?: number
      offset?: number
    } = {}
  ): Promise<PlannerDraft[]> {
    await this.ensureSupabaseReady()

    let finalUserId = userId
    if (!finalUserId && typeof window !== 'undefined') {
      const { data: { session } } = await this.supabase.auth.getSession()
      finalUserId = session?.user?.id
    }

    if (!finalUserId) {
      throw new Error('User ID required to list drafts')
    }

    let query = this.supabase
      .from('planner_drafts')
      .select('*')
      .eq('user_id', finalUserId)
      .order('updated_at', { ascending: false })

    if (options.wizardStep) {
      query = query.eq('wizard_step', options.wizardStep)
    }

    if (options.isApplied !== undefined) {
      query = query.eq('is_applied', options.isApplied)
    }

    if (options.limit) {
      query = query.limit(options.limit)
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to list drafts: ${error.message}`)
    }

    return data || []
  }

  /**
   * Delete a draft
   */
  async deleteDraft(draftId: string, userId?: string): Promise<void> {
    await this.ensureSupabaseReady()

    let query = this.supabase
      .from('planner_drafts')
      .delete()
      .eq('id', draftId)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { error } = await query

    if (error) {
      throw new Error(`Failed to delete draft: ${error.message}`)
    }
  }

  /**
   * Get the most recent draft for a user
   */
  async getLatestDraft(userId?: string): Promise<PlannerDraft | null> {
    const drafts = await this.listDrafts(userId, { limit: 1 })
    return drafts.length > 0 ? drafts[0] : null
  }

  /**
   * Save draft progress (upsert based on wizard step)
   */
  async saveDraftProgress(
    params: CreateDraftParams & { draftId?: string },
    userId?: string
  ): Promise<PlannerDraft> {
    if (params.draftId) {
      // Update existing draft
      const { draftId, ...updateParams } = params
      return this.updateDraft(draftId, updateParams, userId)
    } else {
      // Create new draft
      return this.createDraft(params, userId)
    }
  }

  /**
   * Mark draft as applied
   */
  async markDraftApplied(draftId: string, userId?: string): Promise<PlannerDraft> {
    return this.updateDraft(draftId, {
      is_applied: true,
      applied_at: new Date().toISOString(),
      wizard_step: 'apply'
    }, userId)
  }

  /**
   * Clean up old drafts (keep only recent ones)
   */
  async cleanupOldDrafts(userId?: string, keepCount: number = 10): Promise<void> {
    await this.ensureSupabaseReady()

    let finalUserId = userId
    if (!finalUserId && typeof window !== 'undefined') {
      const { data: { session } } = await this.supabase.auth.getSession()
      finalUserId = session?.user?.id
    }

    if (!finalUserId) {
      throw new Error('User ID required to cleanup drafts')
    }

    // Get drafts to delete (older than keepCount)
    const { data: draftsToDelete, error: selectError } = await this.supabase
      .from('planner_drafts')
      .select('id')
      .eq('user_id', finalUserId)
      .order('updated_at', { ascending: false })
      .range(keepCount, 1000) // Get everything after keepCount

    if (selectError) {
      throw new Error(`Failed to select old drafts: ${selectError.message}`)
    }

    if (draftsToDelete && draftsToDelete.length > 0) {
      const idsToDelete = draftsToDelete.map((d: { id: string }) => d.id)
      const { error: deleteError } = await this.supabase
        .from('planner_drafts')
        .delete()
        .in('id', idsToDelete)

      if (deleteError) {
        throw new Error(`Failed to delete old drafts: ${deleteError.message}`)
      }
    }
  }

  /**
   * Sync draft from local storage to Supabase
   */
  async syncFromLocalStorage(localDraft: any, userId?: string): Promise<PlannerDraft> {
    // Convert local storage format to draft format
    const draftParams: CreateDraftParams = {
      title: localDraft.title || 'Imported Plan',
      description: localDraft.description,
      user_query: localDraft.userQuery || localDraft.query || 'Imported from local storage',
      plan_data: localDraft,
      wizard_step: 'edit', // Assume it's in edit state
      metadata: {
        imported_from_local: true,
        import_timestamp: new Date().toISOString()
      }
    }

    return this.createDraft(draftParams, userId)
  }
}

export const plannerDraftService = new PlannerDraftService()
