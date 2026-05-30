import { useEffect, useRef } from 'react'

const STORAGE_LAST_SESSION_KEY = 'seedance2-last-session'

interface SessionData {
  taskId: string
  remoteUrl?: string
  localPath?: string
  dir: string
  formParams?: Record<string, unknown>
}

interface SessionRestoreCallbacks {
  onRestore: (data: {
    createdId: string
    videoUrl: string
    storageDir: string
    formParams?: Record<string, unknown> | null
  }) => void
  onKeyframesRestore: (frames: string[]) => void
}

/** Restore the last video session (for re-opening the app) */
export function useSessionRestore(
  currentDir: string,
  { onRestore, onKeyframesRestore }: SessionRestoreCallbacks
): void {
  const blobUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!currentDir) return

    const restore = async (): Promise<void> => {
      try {
        const raw = localStorage.getItem(STORAGE_LAST_SESSION_KEY)
        if (!raw) return

        const session: SessionData = JSON.parse(raw)
        if (!session.taskId) return

        // Restore form params if available
        const formParams = session.formParams || null

        onRestore({ createdId: session.taskId, videoUrl: '', storageDir: session.dir, formParams })

        // Try local file first
        if (session.localPath && session.taskId) {
          try {
            const buffer = await window.api.file.readFileBuffer(session.localPath)
            const blob = new Blob([buffer], { type: 'video/mp4' })
            if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
            blobUrlRef.current = URL.createObjectURL(blob)
            onRestore({ createdId: session.taskId, videoUrl: blobUrlRef.current, storageDir: session.dir, formParams })
            return
          } catch { /* file unavailable */ }
        }

        // Fall back to remote URL (play directly without re-downloading)
        if (session.remoteUrl) {
          onRestore({ createdId: session.taskId, videoUrl: session.remoteUrl, storageDir: session.dir, formParams })
          return
        }

        // Restore keyframes
        const result = await window.api.file.readKeyframes({ dir: session.dir, taskId: session.taskId, prefix: 'Seedance2_' })
        const autoFrames = result.autoFrames.filter(Boolean) as string[]
        const allFrames = [...autoFrames, ...result.manualFrames]
        if (allFrames.length > 0) onKeyframesRestore(allFrames)
      } catch { /* ignore */ }
    }
    restore()

    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [currentDir]) // eslint-disable-line react-hooks/exhaustive-deps
}
