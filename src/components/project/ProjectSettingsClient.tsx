'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { useConfirm } from '@/components/ui/confirm-dialog'

interface Project {
  id: string
  name: string
  description: string | null
  archivedAt: Date | null
  teamId: string
}

interface ProjectSettingsClientProps {
  project: Project
}

export function ProjectSettingsClient({ project }: ProjectSettingsClientProps) {
  const router = useRouter()
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description || '')
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { confirm, dialog } = useConfirm()

  const isArchived = !!project.archivedAt

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: description || null }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update project')
      }

      toast.success('Project updated successfully')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleArchive() {
    const confirmed = await confirm({
      title: isArchived ? 'Restore Project' : 'Archive Project',
      description: isArchived
        ? 'Restore this project to make it active again?'
        : 'Archive this project? Issues will become read-only.',
      confirmLabel: isArchived ? 'Restore' : 'Archive',
      variant: isArchived ? 'info' : 'warning',
    })
    if (!confirmed) return

    setLoading(true)

    try {
      const response = await fetch(`/api/projects/${project.id}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restore: isArchived }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to archive/restore project')
      }

      toast.success(isArchived ? 'Project restored successfully' : 'Project archived successfully')
      router.push(`/teams/${project.teamId}/projects`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete project')
      }

      toast.success('Project deleted successfully')
      router.push(`/teams/${project.teamId}/projects`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <div className="space-y-6">
      {dialog}
      {/* Update Form */}
      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <Label required>Project Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                rows={4}
                showCount
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">Markdown supported</p>
            </div>

            <Button type="submit" disabled={loading || !name.trim()} loading={loading}>
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Archive/Restore */}
      <Card>
        <CardHeader>
          <CardTitle>{isArchived ? 'Restore Project' : 'Archive Project'}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            {isArchived
              ? 'Restore this project to make it active again. Issues will be editable.'
              : 'Archived projects are read-only. Issues cannot be created or modified.'}
          </p>
          <Button
            onClick={handleArchive}
            disabled={loading}
            loading={loading}
            variant={isArchived ? 'primary' : 'secondary'}
            className={isArchived ? '' : 'bg-yellow-600 hover:bg-yellow-700 text-white'}
          >
            {isArchived ? 'Restore Project' : 'Archive Project'}
          </Button>
        </CardContent>
      </Card>

      {/* Delete */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Once deleted, this project and all its issues will be permanently removed after 30 days.
          </p>

          {!showDeleteConfirm ? (
            <Button type="button" onClick={handleDelete} variant="destructive">
              Delete Project
            </Button>
          ) : (
            <div className="space-y-4">
              <p className="text-red-600 font-medium">
                Are you sure you want to delete "{project.name}"?
              </p>
              <div className="flex gap-4">
                <Button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  loading={loading}
                  variant="destructive"
                >
                  Yes, Delete Project
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  variant="ghost"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
