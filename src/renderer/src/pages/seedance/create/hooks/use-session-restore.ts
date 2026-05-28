import { useEffect, useRef } from 'react'
import { useSeedanceCreateStore } from '@/stores/seedance-create-store'

const STORAGE_LAST_SESSION_KEY = 'seedance-last-session'

/** Restore the last video session (for re-opening the app) */
export function useSessionRestore(currentDir: string): void {
  const blobUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!currentDir) return

    const restore = async (): Promise<void> => {
      try {
        let taskId: string | null = null
        let remoteUrl = ''
        let apiFailed = false

        // Try API first
        try {
          const listResult = await window.api.seedance.listTasks(
            '?page_num=1&page_size=1&filter.status=succeeded'
          ) as { items?: { id: string }[] }
          const latestTask = listResult?.items?.[0]
          if (latestTask?.id) {
            taskId = latestTask.id
            const result = (await window.api.seedance.getTask(taskId)) as Record<string, unknown>
            const content = result.content as Record<string, unknown> | undefined
            remoteUrl = String(content?.video_url || '')
          }
        } catch {
          apiFailed = true
        }

        // Fall back to localStorage
        if (apiFailed || !taskId) {
          const raw = localStorage.getItem(STORAGE_LAST_SESSION_KEY)
          if (raw) {
            const session = JSON.parse(raw)
            taskId = session.taskId || null
            remoteUrl = session.remoteUrl || session.videoUrl || ''
            if (session.localPath && taskId) {
              try {
                const buffer = await window.api.file.readFileBuffer(session.localPath)
                const blob = new Blob([buffer], { type: 'video/mp4' })
                if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
                blobUrlRef.current = URL.createObjectURL(blob)
                useSeedanceCreateStore.getState().update({ videoUrl: blobUrlRef.current })
                remoteUrl = ''
              } catch { /* file unavailable */ }
            }
          }
        }

        if (!taskId) return
        useSeedanceCreateStore.getState().update({ createdId: taskId })

        // Download video if needed
        if (remoteUrl && !blobUrlRef.current) {
          let foundLocal = false
          try {
            const raw = localStorage.getItem(STORAGE_LAST_SESSION_KEY)
            if (raw) {
              const session = JSON.parse(raw)
              if (session.taskId === taskId && session.localPath) {
                const buffer = await window.api.file.readFileBuffer(session.localPath)
                const blob = new Blob([buffer], { type: 'video/mp4' })
                if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
                blobUrlRef.current = URL.createObjectURL(blob)
                useSeedanceCreateStore.getState().update({ videoUrl: blobUrlRef.current })
                foundLocal = true
              }
            }
          } catch { /* ignore */ }

          if (!foundLocal) {
            try {
              const localPath = await window.api.file.downloadVideo({
                url: remoteUrl, destDir: currentDir,
                filename: `Seedance_${taskId}_restore_${Date.now()}`
              })
              const buffer = await window.api.file.readFileBuffer(localPath)
              const blob = new Blob([buffer], { type: 'video/mp4' })
              if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
              blobUrlRef.current = URL.createObjectURL(blob)
              useSeedanceCreateStore.getState().update({ videoUrl: blobUrlRef.current })
              localStorage.setItem(STORAGE_LAST_SESSION_KEY, JSON.stringify({ taskId, remoteUrl, localPath, dir: currentDir }))
            } catch {
              useSeedanceCreateStore.getState().update({ videoUrl: remoteUrl })
            }
          }
        }

        // Restore keyframes
        const result = await window.api.file.readKeyframes({ dir: currentDir, taskId })
        const autoFrames = result.autoFrames.filter(Boolean) as string[]
        if (autoFrames.length > 0) useSeedanceCreateStore.getState().update({ autoKeyframes: autoFrames })
        if (result.manualFrames.length > 0) useSeedanceCreateStore.getState().update({ manualKeyframes: result.manualFrames })
      } catch { /* ignore */ }
    }
    restore()

    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [currentDir])
}
