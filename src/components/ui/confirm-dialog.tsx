'use client'

import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from './modal'
import { Button } from './button'
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel?: () => void
  variant?: ConfirmVariant
  loading?: boolean
}

const variantConfig: Record<
  ConfirmVariant,
  { icon: React.ReactNode; confirmVariant: 'primary' | 'destructive' }
> = {
  danger: {
    icon: <XCircle className="h-6 w-6 text-red-600" />,
    confirmVariant: 'destructive',
  },
  warning: {
    icon: <AlertTriangle className="h-6 w-6 text-yellow-600" />,
    confirmVariant: 'primary',
  },
  info: {
    icon: <Info className="h-6 w-6 text-blue-600" />,
    confirmVariant: 'primary',
  },
  success: {
    icon: <CheckCircle className="h-6 w-6 text-green-600" />,
    confirmVariant: 'primary',
  },
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'warning',
  loading = false,
}: ConfirmDialogProps) {
  const config = variantConfig[variant]

  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
  }

  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <Modal open={open} onClose={handleCancel}>
      <ModalHeader className="flex items-start gap-4">
        <div className="flex-shrink-0">{config.icon}</div>
        <div>
          <ModalTitle>{title}</ModalTitle>
          {description && <ModalDescription>{description}</ModalDescription>}
        </div>
      </ModalHeader>
      <ModalFooter>
        <Button variant="secondary" onClick={handleCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={config.confirmVariant}
          onClick={handleConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

// Hook for imperative usage - replaces window.confirm()
import { useState, useCallback } from 'react'

interface UseConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmVariant
}

export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean
    options: UseConfirmOptions
    resolver: ((value: boolean) => void) | null
  }>({
    open: false,
    options: { title: '' },
    resolver: null,
  })

  const confirm = useCallback((options: UseConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ open: true, options, resolver: resolve })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    state.resolver?.(true)
    setState((prev) => ({ ...prev, open: false, resolver: null }))
  }, [state.resolver])

  const handleCancel = useCallback(() => {
    state.resolver?.(false)
    setState((prev) => ({ ...prev, open: false, resolver: null }))
  }, [state.resolver])

  const dialog = (
    <ConfirmDialog
      open={state.open}
      onOpenChange={(open) => {
        if (!open) handleCancel()
      }}
      title={state.options.title}
      description={state.options.description}
      confirmLabel={state.options.confirmLabel}
      cancelLabel={state.options.cancelLabel}
      variant={state.options.variant}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  )

  return { confirm, dialog }
}
