import FileDropZone from './components/FileDropZone'
import Versions from './components/Versions'
import SettingsDialog from '@/components/SettingsDialog'

function App() {
  return (
    <>
      <div className="mt-8 mb-4">
        <h1 className="text-2xl font-bold text-center">文件拖拽导入</h1>
        <p className="text-sm text-muted-foreground text-center mt-1">
          从系统文件管理器拖拽图片或文本文件到下方区域
        </p>
      </div>
      <FileDropZone />
      <Versions />
      <div className="fixed top-4 right-4">
        <SettingsDialog />
      </div>
    </>
  )
}

export default App
