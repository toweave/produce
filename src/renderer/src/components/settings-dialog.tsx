import { Settings2, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/use-theme'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

const APP_NAME = 'Produce'
const APP_VERSION = '1.0.0'

export function SettingsDialog(): React.JSX.Element {
  const { theme, toggleTheme } = useTheme()

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon-sm">
          <Settings2 className="h-4 w-4" />
          <span className="sr-only">设置</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>设置</DialogTitle>
          <DialogDescription>管理应用首选项和查看版本信息</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {theme === 'dark' ? (
                <Moon className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Sun className="h-4 w-4 text-muted-foreground" />
              )}
              <Label htmlFor="theme-switch" className="text-xs/relaxed">
                {theme === 'dark' ? '暗色模式' : '亮色模式'}
              </Label>
            </div>
            <Switch
              id="theme-switch"
              size="sm"
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
            />
          </div>

          <Separator />

          {/* Version Info */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs/relaxed text-muted-foreground">应用名称</span>
              <span className="text-xs/relaxed font-medium">{APP_NAME}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs/relaxed text-muted-foreground">应用版本</span>
              <span className="text-xs/relaxed font-medium">v{APP_VERSION}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogTrigger asChild>
            <Button variant="default">关闭</Button>
          </DialogTrigger>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
