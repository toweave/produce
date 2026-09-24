import { useTheme } from "@/hooks/use-theme"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { SettingsIcon, MoonIcon, SunIcon } from "lucide-react"

const APP_VERSION = "1.0.0"

export function SettingsDialog() {
  const { theme, toggleTheme } = useTheme()

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon-sm">
          <SettingsIcon />
          <span className="sr-only">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>设置</DialogTitle>
          <DialogDescription>管理应用首选项和查看版本信息</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {theme === "dark" ? (
                <MoonIcon className="size-4 text-muted-foreground" />
              ) : (
                <SunIcon className="size-4 text-muted-foreground" />
              )}
              <Label htmlFor="theme-switch" className="text-xs/relaxed">
                {theme === "dark" ? "暗色模式" : "亮色模式"}
              </Label>
            </div>
            <Switch
              id="theme-switch"
              size="sm"
              checked={theme === "dark"}
              onCheckedChange={toggleTheme}
            />
          </div>

          <Separator />

          {/* Version Info */}
          <div className="flex items-center justify-between">
            <span className="text-xs/relaxed text-muted-foreground">应用版本</span>
            <span className="text-xs/relaxed font-medium">{APP_VERSION}</span>
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
