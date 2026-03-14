import { Suspense } from 'react'
import { ConfirmResetPasswordForm } from '@/components/auth/ConfirmResetPasswordForm'

export default function ConfirmResetPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <Suspense fallback={<div>Loading...</div>}>
        <ConfirmResetPasswordForm />
      </Suspense>
    </main>
  )
}
