import { useEffect, type RefObject } from 'react'
import { useSeedanceCreateStore } from '@/stores/seedance-create-store'

function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - time) < 0.05) {
      resolve()
      return
    }
    const handler = (): void => {
      video.removeEventListener('seeked', handler)
      resolve()
    }
    video.addEventListener('seeked', handler)
    video.currentTime = time
  })
}

function captureFrameToDataUrl(video: HTMLVideoElement, canvas: HTMLCanvasElement): string {
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  try {
    ctx.drawImage(video, 0, 0)
    return canvas.toDataURL('image/png')
  } catch {
    return ''
  }
}

interface UseAutoCaptureOptions {
  videoRef: RefObject<HTMLVideoElement | null>
  justCreated: { current: boolean }
}

/** Auto-capture keyframes when a newly created video loads */
export function useAutoCapture({ videoRef, justCreated }: UseAutoCaptureOptions): void {
  const videoUrl = useSeedanceCreateStore((s) => s.videoUrl)

  useEffect(() => {
    if (!videoUrl || !videoRef.current || !justCreated.current) return
    justCreated.current = false
    const video = videoRef.current

    const doCapture = async ():Promise<void> => {
      useSeedanceCreateStore.getState().update({ capturingAuto: true })

      if (!video.duration || video.duration === 0) {
        await new Promise<void>((resolve) => {
          const handler = ():void => {
            video.removeEventListener('loadedmetadata', handler)
            resolve()
          }
          video.addEventListener('loadedmetadata', handler)
        })
      }

      const dur = video.duration
      const positions = [
        0,
        Math.floor((dur / 5) * 1000) / 1000,
        Math.floor(((2 * dur) / 5) * 1000) / 1000,
        Math.floor(((3 * dur) / 5) * 1000) / 1000,
        Math.floor(((4 * dur) / 5) * 1000) / 1000,
        Math.max(0, dur - 1 / 24)
      ]

      video.pause()
      const canvas = document.createElement('canvas')
      const frames: string[] = []
      const { currentDir, createdId } = useSeedanceCreateStore.getState()

      for (let i = 0; i < positions.length; i++) {
        try {
          await seekVideo(video, positions[i])
          const dataUrl = captureFrameToDataUrl(video, canvas)
          if (dataUrl) {
            frames.push(dataUrl)
            window.api.file
              .saveKeyframe({
                base64Data: dataUrl,
                destDir: currentDir,
                filename: `Seedance_${createdId}_keyframe_${i}`
              })
              .catch(() => {})
          }
        } catch {
          /* skip failed frame */
        }
      }

      useSeedanceCreateStore.getState().update({ autoKeyframes: frames, capturingAuto: false })
      video.currentTime = 0
    }

    doCapture()
  }, [videoUrl]) // eslint-disable-line react-hooks/exhaustive-deps
}
