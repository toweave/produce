import React, { useEffect, useRef, useCallback } from 'react'
import { Loader2Icon, ChevronRightIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { TwoColumnLayout } from '@/components/two-column-layout'
import VideoPlayer from '@/components/video-player'
import { CreateForm, type CreateFormMeta } from './components/create-form'
import { STATUS_LABEL } from '../constants'
import type { TaskDetail } from '../types'

export default function Seedance2CreatePage(): React.JSX.Element {
  const navigate = useNavigate()
  const blobUrlRef = useRef<string | null>(null)
  const justCreated = useRef(false)

  // Task state
  const [createdId, setCreatedId] = React.useState('')
  const [taskStatus, setTaskStatus] = React.useState('')
  const [videoUrl, setVideoUrl] = React.useState('')
  const [pollError, setPollError] = React.useState('')
  const [keyframes, setKeyframes] = React.useState<string[]>([])
  const [storageDir, setStorageDir] = React.useState('')

  useEffect(() => {
    window.api.file.getDefaultPath().then((dir) => setStorageDir(dir)).catch(() => {})
  }, [])

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [])

  const pollTask = useCallback((taskId: string) => {
    let stopped = false
    const poll = async () => {
      while (!stopped) {
        await new Promise((r) => setTimeout(r, 5000))
        if (stopped) break
        try {
          const result = await window.api.seedance2.getTask(taskId) as TaskDetail
          const status = result.status || ''
          setTaskStatus(status)

          if (status === 'succeeded') {
            stopped = true
            justCreated.current = true
            const remoteUrl = result.content?.video_url
            if (remoteUrl) {
              try {
                const localPath = await window.api.file.downloadVideo({
                  url: remoteUrl,
                  destDir: storageDir,
                  filename: `Seedance2_${taskId}_${Date.now()}`
                })
                const buffer = await window.api.file.readFileBuffer(localPath)
                const blob = new Blob([buffer], { type: 'video/mp4' })
                if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
                blobUrlRef.current = URL.createObjectURL(blob)
                setVideoUrl(blobUrlRef.current)
              } catch {
                setVideoUrl(remoteUrl)
              }
            }
          } else if (status === 'failed') {
            stopped = true
            const errObj = result.error
            setPollError(errObj?.message ? String(errObj.message) : '视频生成失败')
          } else if (status === 'cancelled' || status === 'expired') {
            stopped = true
            setPollError(`任务已${status === 'cancelled' ? '取消' : '过期'}`)
          }
        } catch {
          setPollError('查询任务状态失败')
          stopped = true
        }
      }
    }
    poll()
  }, [storageDir])

  const handleSubmit = useCallback(async (apiParams: Record<string, unknown>, meta: CreateFormMeta) => {
    try {
      const result = await window.api.seedance2.createTask(apiParams) as { id: string }
      const id = result.id
      setCreatedId(id)
      setTaskStatus('queued')
      setVideoUrl('')
      setPollError('')
      setKeyframes([])

      // Save task params (best-effort)
      try {
        const dir = await window.api.file.getDefaultPath()

        // Compute relative paths for all reference files
        const imageRefs = await Promise.all(
          meta.images.map(async (img) => ({
            name: img.name,
            relativePath: img.filePath ? await window.api.path.relative(dir, img.filePath) : null
          }))
        )
        const videoRefs = await Promise.all(
          meta.videos.map(async (v) => ({
            name: v.name,
            url: v.filePath ? null : v.dataUri || null,
            relativePath: v.filePath ? await window.api.path.relative(dir, v.filePath) : null
          }))
        )
        const audioRefs = await Promise.all(
          meta.audioFiles.map(async (a) => ({
            name: a.name,
            relativePath: a.filePath ? await window.api.path.relative(dir, a.filePath) : null
          }))
        )

        await window.api.taskParams.save({
          task_id: id,
          version: '2.0',
          prompt: meta.prompt || null,
          ratio: meta.ratio,
          duration: meta.duration > 0 ? meta.duration : null,
          resolution: meta.resolution,
          generate_audio: meta.generateAudio ? 1 : 0,
          watermark: meta.watermark ? 1 : 0,
          model: meta.model,
          first_frame_path: null,
          last_frame_path: null,
          first_frame_data: null,
          last_frame_data: null,
          full_params: JSON.stringify({
            returnLastFrame: meta.returnLastFrame,
            webSearch: meta.webSearch,
            priority: meta.priority,
            references: {
              images: imageRefs,
              videos: videoRefs,
              audioFiles: audioRefs
            }
          })
        })
      } catch {
        /* task params save is best-effort */
      }

      pollTask(id)
      return { id }
    } catch {
      return undefined
    }
  }, [pollTask])

  const handleReset = useCallback(() => {
    setCreatedId('')
    setTaskStatus('')
    setVideoUrl('')
    setPollError('')
    setKeyframes([])
  }, [])

  const handleKeyframeCapture = useCallback((dataUrl: string) => {
    setKeyframes((prev) => [...prev, dataUrl])
  }, [])

  const handleDownload = useCallback(async () => {
    // Download is handled by VideoPlayer's onDownload
  }, [])

  const renderRight = () => {
    if (!createdId) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground min-h-[300px]">
          <ChevronRightIcon className="h-10 w-10" />
          <span className="text-sm">填写左侧参数后点击"生成视频"</span>
        </div>
      )
    }

    if (pollError && !videoUrl) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 min-h-[300px]">
          <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive max-w-sm">
            {pollError}
          </div>
          <button
            onClick={handleReset}
            className="text-sm text-primary hover:underline"
          >
            重新开始
          </button>
        </div>
      )
    }

    if (videoUrl) {
      return (
        <div className="flex-1 flex flex-col gap-4">
          <div className="rounded-lg border border-border bg-card overflow-hidden flex-1 min-h-[240px] flex flex-col">
            <div className="flex-1 relative">
              <VideoPlayer
                videoUrl={videoUrl}
                taskId={createdId}
                storageDir={storageDir}
                onKeyframeCapture={handleKeyframeCapture}
                onDownload={handleDownload}
              />
            </div>
          </div>

          {keyframes.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">关键帧</p>
              <div className="flex gap-2 overflow-x-auto">
                {keyframes.map((dataUrl, i) => (
                  <img
                    key={i}
                    src={dataUrl}
                    alt={`关键帧 ${i + 1}`}
                    className="h-14 w-auto rounded border border-border flex-shrink-0"
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/seedance2/tasks/${createdId}`)}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              查看任务详情
            </button>
            <button
              onClick={handleReset}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              继续创作
            </button>
          </div>
        </div>
      )
    }

    // Loading / polling state
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground min-h-[300px]">
        <Loader2Icon className="h-8 w-8 animate-spin" />
        <span className="text-sm">
          {taskStatus === 'queued' ? '任务排队中...' : '正在生成视频...'}
        </span>
        <span className="text-xs font-mono">ID: {createdId}</span>
        <span className="text-xs text-muted-foreground">
          状态：{STATUS_LABEL[taskStatus] || taskStatus}
        </span>
        <button
          onClick={() => navigate(`/seedance2/tasks/${createdId}`)}
          className="text-xs text-primary hover:underline mt-2"
        >
          查看任务详情
        </button>
      </div>
    )
  }

  return (
    <TwoColumnLayout
      left={<CreateForm onSubmit={handleSubmit} />}
      right={<div className="flex flex-col gap-4 h-full">{renderRight()}</div>}
    />
  )
}
