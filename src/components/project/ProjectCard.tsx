'use client'

import Link from 'next/link'
import { FavoriteButton } from './FavoriteButton'

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

interface ProjectCardProps {
  project: Project
  teamId: string
}

export function ProjectCard({ project, teamId }: ProjectCardProps) {
  const isArchived = !!project.archivedAt

  return (
    <div
      className={`bg-white shadow rounded-lg p-6 hover:shadow-md hover:scale-[1.01] transition-all duration-200 ${
        isArchived ? 'opacity-60' : ''
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/projects/${project.id}`}
              className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
            >
              {project.name}
            </Link>
            {isArchived && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                Archived
              </span>
            )}
          </div>
          {project.description && (
            <p className="text-gray-600 text-sm mt-1 line-clamp-2">
              {project.description}
            </p>
          )}
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
            <span>
              Owner: {project.owner.name || project.owner.email}
            </span>
            <span>
              Created {new Date(project.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <FavoriteButton
          projectId={project.id}
          initialFavorited={project.isFavorited}
          favoriteCount={project.favoriteCount}
        />
      </div>
    </div>
  )
}
