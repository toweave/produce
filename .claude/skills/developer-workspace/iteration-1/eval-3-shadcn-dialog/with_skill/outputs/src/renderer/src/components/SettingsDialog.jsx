import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Settings } from 'lucide-react'

function SettingsDialog() {
  const [open, setOpen] = useState(false)
  const [themeDark, setThemeDark] = useState(true)
  const [appVersion, setAppVersion] = useState('')
  const [versions, setVersions] = useState({})

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electron?.process?.versions) {
      setVersions(window.electron.process.versions)
    }
  }, [])

  useEffect(() => {
    if (open && window.api?.getAppVersion) {
      window.api.getAppVersion().then(setAppVersion)
    }
  }, [open])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', themeDark)
  }, [themeDark])

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        aria-label="Settings"
        onClick={() => setOpen(true)}
      >
        <Settings className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Configure your app preferences and view version information.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Dark Mode</label>
                <p className="text-sm text-muted-foreground">
                  Toggle between dark and light theme
                </p>
              </div>
              <Switch
                checked={themeDark}
                onCheckedChange={setThemeDark}
                aria-label="Toggle dark mode"
              />
            </div>

            {/* Version Information */}
            <div>
              <h4 className="text-sm font-medium mb-2">Version Information</h4>
              <div className="rounded-lg border p-3 space-y-1 text-sm">
                {appVersion && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">App</span>
                    <span className="font-mono">v{appVersion}</span>
                  </div>
                )}
                {versions.electron && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Electron</span>
                    <span className="font-mono">{versions.electron}</span>
                  </div>
                )}
                {versions.chrome && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Chromium</span>
                    <span className="font-mono">{versions.chrome}</span>
                  </div>
                )}
                {versions.node && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Node.js</span>
                    <span className="font-mono">{versions.node}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default SettingsDialog
