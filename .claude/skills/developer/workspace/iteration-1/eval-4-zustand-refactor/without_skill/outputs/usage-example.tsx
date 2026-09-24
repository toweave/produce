/**
 * UsageExample
 *
 * Demonstrates how a parent component interacts with the refactored VideoPlayer.
 *
 * BEFORE (15 props scattered across parent):
 *   <VideoPlayer
 *     videoUrl={videoUrl}
 *     isPlaying={isPlaying}
 *     currentTime={currentTime}
 *     onPlay={() => setIsPlaying(true)}
 *     onPause={() => setIsPlaying(false)}
 *     onTimeUpdate={(t) => setCurrentTime(t)}
 *     onCaptureFrame={(dataUrl) => handleCapture(dataUrl)}
 *     capturing={capturing}
 *     hasError={hasError}
 *     errorMessage={errorMessage}
 *     videoRef={videoRef}
 *     volume={volume}
 *     muted={muted}
 *     playbackRate={playbackRate}
 *     onRateChange={(r) => setPlaybackRate(r)}
 *   />
 *
 * AFTER (3 props, state managed internally):
 *   <VideoPlayer
 *     videoUrl={videoUrl}
 *     videoRef={videoRef}
 *     callbacks={{
 *       onPlay: () => console.log('playing'),
 *       onPause: () => console.log('paused'),
 *       onTimeUpdate: (t) => console.log('time:', t),
 *       onRateChange: (r) => console.log('rate:', r),
 *       onCaptureFrame: (dataUrl) => handleCapture(dataUrl),
 *     }}
 *   />
 *
 * The parent can also imperatively read/write state via the store:
 *   import { useVideoPlayerStore } from './video-player-store'
 *
 *   const isPlaying = useVideoPlayerStore((s) => s.isPlaying)
 *   const { pause, setVolume, setPlaybackRate } = useVideoPlayerStore.getState()
 */

import { useRef } from 'react'
import { VideoPlayer } from './video-player'
import { useVideoPlayerStore } from './video-player-store'

export function ParentUsingVideoPlayer() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const videoUrl = 'https://example.com/video.mp4'

  // The parent component can optionally subscribe to store state
  // without needing props to pass them down.
  const currentTime = useVideoPlayerStore((s) => s.currentTime)
  const isPlaying = useVideoPlayerStore((s) => s.isPlaying)
  const { pause, setVolume } = useVideoPlayerStore.getState()

  return (
    <div className="space-y-4">
      {/* Only 3 props needed — well within the 10-prop limit */}
      <VideoPlayer
        videoUrl={videoUrl}
        videoRef={videoRef}
        callbacks={{
          onCaptureFrame: (dataUrl) => {
            console.log('Captured frame:', dataUrl.substring(0, 50) + '...')
          },
        }}
      />

      {/* Parent can still control the player via store actions */}
      <div className="flex gap-2">
        <button onClick={pause}>暂停</button>
        <button onClick={() => setVolume(0.5)}>50% 音量</button>
      </div>

      {/* Parent can read player state from store */}
      <div className="text-xs text-muted-foreground">
        当前时间: {currentTime.toFixed(2)}s | 状态: {isPlaying ? '播放中' : '已暂停'}
      </div>
    </div>
  )
}
