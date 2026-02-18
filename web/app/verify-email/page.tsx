import { Suspense } from 'react'
import VerifyEmailContent from './VerifyEmailContent'

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <div className="text-stone-500">Loading…</div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
