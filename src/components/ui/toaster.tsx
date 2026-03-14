'use client'

import { Toaster as Sonner, toast } from 'sonner'

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      richColors
      closeButton
      duration={5000}
      toastOptions={{
        classNames: {
          toast: 'bg-white border shadow-lg',
          title: 'font-medium',
          description: 'text-sm text-gray-500',
          success: 'border-green-200',
          error: 'border-red-200',
          warning: 'border-yellow-200',
          info: 'border-blue-200',
        },
      }}
    />
  )
}

// Re-export toast for convenience
export { toast }
