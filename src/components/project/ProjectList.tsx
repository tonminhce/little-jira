'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { ProjectCard } from './ProjectCard'
import { ProjectForm } from './ProjectForm'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton, SkeletonProjectCard } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { FolderKanban } from 'lucide-react'

interface Project {
  id: string
  name: string
  description: string | null
  archivedAt: string | null
  createdAt: string
  owner: {
    id: string
    name: string | null
    email: string
  }
  isFavorited: boolean
  favoriteCount: number
}

interface ProjectListProps {
  teamId: string
}

export function ProjectList({ teamId }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    fetchProjects()
  }, [teamId])

  async function fetchProjects() {
    try {
      const response = await fetch(`/api/teams/${teamId}/projects`)
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects)
      } else {
        setError('Failed to load projects')
      }
    } catch {
      setError('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateProject(data: { name: string; description?: string }) {
    const response = await fetch(`/api/teams/${teamId}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const responseData = await response.json()

    if (!response.ok) {
      throw new Error(responseData.error || 'Failed to create project')
    }

    toast.success('Project created successfully')
    setProjects([responseData.project, ...projects])
    setShowCreateForm(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton variant="text" className="w-32 h-8" />
          <Skeleton width={120} height={40} />
        </div>
        <div className="grid gap-4">
          <SkeletonProjectCard />
          <SkeletonProjectCard />
          <SkeletonProjectCard />
        </div>
      </div>
    )
  }

  const activeProjects = projects.filter((p) => !p.archivedAt)
  const archivedProjects = projects.filter((p) => p.archivedAt)

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Projects</h2>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          variant={showCreateForm ? 'secondary' : 'primary'}
        >
          {showCreateForm ? 'Cancel' : 'New Project'}
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Project</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectForm
              onSubmit={handleCreateProject}
              onCancel={() => setShowCreateForm(false)}
            />
          </CardContent>
        </Card>
      )}

      {projects.length === 0 ? (
        <Card>
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Create a project to start organizing issues."
          />
        </Card>
      ) : (
        <>
          {activeProjects.length > 0 && (
            <div className="grid gap-4">
              {activeProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  teamId={teamId}
                />
              ))}
            </div>
          )}

          {archivedProjects.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-500 mb-4">
                Archived Projects ({archivedProjects.length})
              </h3>
              <div className="grid gap-4">
                {archivedProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    teamId={teamId}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
