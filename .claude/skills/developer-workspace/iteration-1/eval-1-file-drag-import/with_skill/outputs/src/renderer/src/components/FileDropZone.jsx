import { useState, useCallback } from 'react'
import { FileText, Image as ImageIcon, X, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'

function FileDropZone() {
  const [isDragOver, setIsDragOver] = useState(false)
  const [fileData, setFileData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragEnter = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    async (e) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)
      setError(null)

      const files = e.dataTransfer.files
      if (files.length === 0) return

      const file = files[0]
      const filePath = file.path

      if (!filePath) {
        setError('无法获取文件路径')
        return
      }

      setLoading(true)
      try {
        const result = await window.api.readFile(filePath)
        setFileData(result)
      } catch (err) {
        setError(`读取文件失败: ${err.message}`)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const handleClear = useCallback(() => {
    setFileData(null)
    setError(null)
  }, [])

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      {!fileData ? (
        <div
          className={`relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
            isDragOver
              ? 'border-primary bg-primary/10'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }`}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center gap-4">
            <Upload className="w-12 h-12 text-muted-foreground/50" />
            <div>
              <p className="text-lg font-medium">拖拽文件到此处</p>
              <p className="text-sm text-muted-foreground mt-1">
                支持图片和文本文件
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {fileData.type === 'image' ? (
                <ImageIcon className="w-5 h-5" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
              <span className="font-medium">{fileData.fileName}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClear}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {fileData.type === 'image' ? (
            <div className="flex justify-center">
              <img
                src={fileData.content}
                alt={fileData.fileName}
                className="max-w-full max-h-96 rounded object-contain"
              />
            </div>
          ) : (
            <pre className="max-h-96 overflow-auto rounded bg-muted p-4 text-sm whitespace-pre-wrap break-all">
              {fileData.content}
            </pre>
          )}
        </div>
      )}

      {loading && (
        <div className="text-center py-4">
          <p className="text-muted-foreground">正在读取文件...</p>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <p>{error}</p>
        </div>
      )}
    </div>
  )
}

export default FileDropZone
