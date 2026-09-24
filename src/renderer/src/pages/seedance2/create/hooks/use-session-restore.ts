import { useEffect, useRef } from 'react'
import { useSeedance2CreateStore } from '@/stores/seedance2-create-store'
import type { TaskDetail } from '../../types'

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
        let taskId: string | null = null
        let remoteUrl = ''
        let formParams: Record<string, unknown> | null = null
        let apiFailed = false

        // Try API first (like seedance 1.5)
        try {
          const listResult = await window.api.seedance2.listTasks(
            '?page_num=1&page_size=1&filter.status=succeeded'
          ) as { items?: { id: string }[] }
          const latestTask = listResult?.items?.[0]
          if (latestTask?.id) {
            taskId = latestTask.id
            const result = await window.api.seedance2.getTask(taskId) as TaskDetail
            remoteUrl = result.content?.video_url || ''

            // Try to get form params from task_params table
            try {
              const params = await window.api.taskParams.getByTaskId(taskId)
              if (params?.full_params) {
                const parsed = JSON.parse(params.full_params) as Record<string, unknown>
                formParams = {
                  generationMode: parsed.generationMode || 'multi-modal-ref',
                  prompt: params.prompt || '',
                  ratio: params.ratio || 'adaptive',
                  duration: params.duration || 5,
                  resolution: params.resolution || '720p',
                  generateAudio: params.generate_audio ? true : false,
                  watermark: params.watermark ? true : false,
                  model: params.model || 'doubao-seedance-2-0-260128',
                  ...parsed
                }
              }
            } catch { /* ignore */ }
          }
        } catch {
          apiFailed = true
        }

        // Fall back to localStorage if API failed or no task found
        if ((apiFailed || !taskId) && !taskId) {
          const raw = localStorage.getItem(STORAGE_LAST_SESSION_KEY)
          if (raw) {
            const session: SessionData = JSON.parse(raw)
            taskId = session.taskId || null
            remoteUrl = session.remoteUrl || ''
            formParams = session.formParams || null
            if (session.localPath && taskId) {
              try {
                const buffer = await window.api.file.readFileBuffer(session.localPath)
                const blob = new Blob([buffer], { type: 'video/mp4' })
                if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
                blobUrlRef.current = URL.createObjectURL(blob)
                useSeedance2CreateStore.getState().update({ videoUrl: blobUrlRef.current })
                onRestore({ createdId: taskId, videoUrl: blobUrlRef.current, storageDir: session.dir, formParams })
                remoteUrl = ''
              } catch { /* file unavailable */ }
            }
          }
        }

        if (!taskId) return

        // Restore taskId and form params
        onRestore({ createdId: taskId, videoUrl: '', storageDir: currentDir, formParams })

        // Download video if needed (no local file loaded yet)
        if (remoteUrl) {
          let foundLocal = false
          // Try localStorage path first
          try {
            const raw = localStorage.getItem(STORAGE_LAST_SESSION_KEY)
            if (raw) {
              const session: SessionData = JSON.parse(raw)
              if (session.taskId === taskId && session.localPath) {
                const buffer = await window.api.file.readFileBuffer(session.localPath)
                const blob = new Blob([buffer], { type: 'video/mp4' })
                if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
                blobUrlRef.current = URL.createObjectURL(blob)
                useSeedance2CreateStore.getState().update({ videoUrl: blobUrlRef.current })
                foundLocal = true
              }
            }
          } catch { /* ignore */ }

          // Download from remote URL
          if (!foundLocal) {
            try {
              const localPath = await window.api.file.downloadVideo({
                url: remoteUrl, destDir: currentDir,
                filename: `Seedance2_${taskId}_restore_${Date.now()}`
              })
              const buffer = await window.api.file.readFileBuffer(localPath)
              const blob = new Blob([buffer], { type: 'video/mp4' })
              if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
              blobUrlRef.current = URL.createObjectURL(blob)
              useSeedance2CreateStore.getState().update({ videoUrl: blobUrlRef.current })
              localStorage.setItem(STORAGE_LAST_SESSION_KEY, JSON.stringify({
                taskId, remoteUrl, localPath, dir: currentDir, formParams
              }))
            } catch {
              // Fall back to remote URL
              useSeedance2CreateStore.getState().update({ videoUrl: remoteUrl })
            }
          }
        }

        // Restore keyframes
        const keyframeResult = await window.api.file.readKeyframes({
          dir: currentDir, taskId, prefix: 'Seedance2_'
        })
        const autoFrames = keyframeResult.autoFrames.filter(Boolean) as string[]
        if (autoFrames.length > 0) {
          useSeedance2CreateStore.getState().update({ autoKeyframes: autoFrames })
        }
        if (keyframeResult.manualFrames.length > 0) {
          onKeyframesRestore(keyframeResult.manualFrames)
        }
      } catch { /* ignore */ }
    }
    restore()

    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [currentDir]) // eslint-disable-line react-hooks/exhaustive-deps
}
