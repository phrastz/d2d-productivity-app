'use client'

import { createClient } from '@/lib/supabase/client'
import { SubProject, SubProjectStatus, SubProjectPriority } from '@/types'

export function useSubProjects() {
  const supabase = createClient()

  const createSubProject = async (
    projectId: string,
    name: string,
    description?: string,
    priority: SubProjectPriority = 'medium'
  ): Promise<SubProject> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      if (!userId) throw new Error('Not authenticated')

      // Get the highest order_index for this project (with graceful fallback)
      let nextOrderIndex = 0
      try {
        const { data: existing } = await supabase
          .from('sub_projects')
          .select('order_index')
          .eq('project_id', projectId)
          .order('order_index', { ascending: false })
          .limit(1)

        nextOrderIndex = existing && existing.length > 0 ? existing[0].order_index + 1 : 0
      } catch (err) {
        console.warn('Could not fetch existing sub-projects for order_index, using 0:', err)
      }

      const insertData = {
        project_id: projectId,
        name: name.trim(),
        description: description?.trim() || null,
        priority,
        status: 'not_started' as SubProjectStatus,
        order_index: nextOrderIndex,
        owner_id: userId,
      }

      console.log('Attempting to insert sub-project:', insertData)

      const { data, error } = await supabase
        .from('sub_projects')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        // Log full error details for debugging
        console.error('=== SUPABASE ERROR DETAILS ===')
        console.error('Code:', error.code)
        console.error('Message:', error.message)
        console.error('Details:', error.details)
        console.error('Hint:', error.hint)
        console.error('Full error object:', JSON.stringify(error, null, 2))
        console.error('==============================')
        throw error
      }

      if (!data) {
        throw new Error('No data returned from insert')
      }

      console.log('Sub-project created successfully:', data)
      return data
    } catch (err) {
      console.error('Error creating sub-project:', err)
      // Re-throw so UI can show proper error message
      throw err
    }
  }

  const updateSubProject = async (
    id: string,
    updates: Partial<Pick<SubProject, 'name' | 'description' | 'status' | 'priority'>>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('sub_projects')
        .update(updates)
        .eq('id', id)

      if (error) {
        console.error('=== UPDATE ERROR ===')
        console.error('Code:', error.code)
        console.error('Message:', error.message)
        console.error('Details:', error.details)
        console.error('===================')
        throw error
      }
      return true
    } catch (err) {
      console.error('Error updating sub-project:', err)
      throw err
    }
  }

  const deleteSubProject = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('sub_projects')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('=== DELETE ERROR ===')
        console.error('Code:', error.code)
        console.error('Message:', error.message)
        console.error('Details:', error.details)
        console.error('===================')
        throw error
      }
      return true
    } catch (err) {
      console.error('Error deleting sub-project:', err)
      throw err
    }
  }

  const reorderSubProjects = async (
    projectId: string,
    orderedIds: string[]
  ): Promise<boolean> => {
    try {
      // Update order_index for each sub-project
      const updates = orderedIds.map((id, index) =>
        supabase
          .from('sub_projects')
          .update({ order_index: index })
          .eq('id', id)
          .eq('project_id', projectId)
      )

      await Promise.all(updates)
      return true
    } catch (err) {
      console.error('Error reordering sub-projects:', err)
      return false
    }
  }

  return {
    createSubProject,
    updateSubProject,
    deleteSubProject,
    reorderSubProjects,
  }
}
