import { useEffect, useRef, type RefObject } from 'react'

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
  videoUrl: string
  createdId: string
  storageDir: string
  onKeyframesCapture: (frames: string[]) => void
  onCapturingChange: (capturing: boolean) => void
}

/** Auto-capture keyframes when a newly created video loads */
export function useAutoCapture({
  videoRef,
  justCreated,
  videoUrl,
  createdId,
  storageDir,
  onKeyframesCapture,
  onCapturingChange
}: UseAutoCaptureOptions): void {
  const capturedRef = useRef(false)

  useEffect(() => {
    if (!videoUrl || !videoRef.current || !justCreated.current) return
    if (capturedRef.current) return
    capturedRef.current = true

    justCreated.current = false
    const video = videoRef.current

    const doCapture = async (): Promise<void> => {
      onCapturingChange(true)

      if (!video.duration || video.duration === 0) {
        await new Promise<void>((resolve) => {
          const handler = (): void => {
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

      for (let i = 0; i < positions.length; i++) {
        try {
          await seekVideo(video, positions[i])
          const dataUrl = captureFrameToDataUrl(video, canvas)
          if (dataUrl) {
            frames.push(dataUrl)
            window.api.file
              .saveKeyframe({
                base64Data: dataUrl,
                destDir: storageDir,
                filename: `Seedance2_${createdId}_keyframe_${i}`
              })
              .catch(() => {})
          }
        } catch {
          /* skip failed frame */
        }
      }

      onKeyframesCapture(frames)
      onCapturingChange(false)
      video.currentTime = 0
    }

    doCapture()
  }, [videoUrl]) // eslint-disable-line react-hooks/exhaustive-deps
}
