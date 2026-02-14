import { useState, useEffect } from 'react'
import { uploadAllLocalData, syncAll } from '@/sync/syncEngine'
import { clearQueue } from '@/sync/syncQueue'

interface InitialSyncDialogProps {
  isOpen: boolean
  entryCount: number
  projectCount: number
  onDone: () => void
}

export default function InitialSyncDialog({
  isOpen,
  entryCount,
  projectCount,
  onDone,
}: InitialSyncDialogProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) { setError(null); setUploading(false) }
  }, [isOpen])

  if (!isOpen) return null

  const handleUploadAndSync = async () => {
    setUploading(true)
    setError(null)
    try {
      await uploadAllLocalData()
      await syncAll()
      // Mark as completed so the dialog doesn't show again
      await chrome.storage.local.set({ initialSyncDone: true })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleStartFresh = async () => {
    // Don't upload local data; pull from cloud, clear sync queue
    await clearQueue()
    await syncAll()
    await chrome.storage.local.set({ initialSyncDone: true })
    onDone()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="bg-white dark:bg-dark-card rounded-2xl shadow-xl w-full max-w-sm p-5"
        role="dialog"
        aria-labelledby="initial-sync-title"
      >
        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
        </div>

        <h2
          id="initial-sync-title"
          className="text-base font-semibold text-stone-900 dark:text-stone-100 mb-1.5"
        >
          You have local data
        </h2>
        <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">
          Found{' '}
          <span className="font-medium text-stone-700 dark:text-stone-300">{entryCount} entries</span>
          {projectCount > 0 && (
            <> and{' '}
              <span className="font-medium text-stone-700 dark:text-stone-300">{projectCount} projects</span>
            </>
          )}
          {' '}stored locally. Would you like to upload them to your cloud account?
        </p>

        {error && (
          <p className="text-xs text-rose-500 mb-3">{error}</p>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={handleUploadAndSync}
            disabled={uploading}
            className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-400 text-white py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            {uploading && (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            Upload & Sync
          </button>
          <button
            onClick={handleStartFresh}
            disabled={uploading}
            className="w-full border border-stone-200 dark:border-dark-border text-stone-600 dark:text-stone-300 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-50 dark:hover:bg-dark-hover disabled:opacity-40 transition-colors"
          >
            Skip — start from cloud
          </button>
        </div>
      </div>
    </div>
  )
}
