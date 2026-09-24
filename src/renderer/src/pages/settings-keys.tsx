import React, { useState, useEffect } from 'react'
import { KeyIcon, SaveIcon, EyeIcon, EyeOffIcon, Loader2Icon, CheckIcon } from 'lucide-react'

export default function SettingsKeysPage(): React.JSX.Element {
  const [seedance15Key, setSeedance15Key] = useState('')
  const [seedance20Key, setSeedance20Key] = useState('')
  const [seedream50Key, setSeedream50Key] = useState('')
  const [show15, setShow15] = useState(false)
  const [show20, setShow20] = useState(false)
  const [show50, setShow50] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    window.api.settings.get().then((settings) => {
      setSeedance15Key(settings.seedance15Key || '')
      setSeedance20Key(settings.seedance20Key || '')
      setSeedream50Key(settings.seedream50Key || '')
      setUserName(settings.userInfo?.name || '')
      setUserEmail(settings.userInfo?.email || '')
    })
  }, [])

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    setSaved(false)
    try {
      await window.api.settings.set({
        seedance15Key,
        seedance20Key,
        seedream50Key,
        userInfo: { name: userName, email: userEmail }
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('保存设置失败:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 w-full max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <KeyIcon className="h-6 w-6" />
          密钥管理
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          配置各模块的 API 密钥，密钥将保存在本地 setting.json 中
        </p>
      </div>

      {/* Seedance 1.5 Key */}
      <div className="rounded-lg border border-border bg-card p-4 mb-4">
        <label className="block text-sm font-medium mb-1.5">Seedance-1.5 API 密钥</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={show15 ? 'text' : 'password'}
              value={seedance15Key}
              onChange={(e) => setSeedance15Key(e.target.value)}
              placeholder="输入 Seedance-1.5 的 API 密钥"
              className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              onClick={() => setShow15(!show15)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {show15 ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          用于调用 doubao-seedance-1-5-pro 模型
        </p>
      </div>

      {/* Seedance 2.0 Key */}
      <div className="rounded-lg border border-border bg-card p-4 mb-4">
        <label className="block text-sm font-medium mb-1.5">Seedance-2.0 API 密钥</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={show20 ? 'text' : 'password'}
              value={seedance20Key}
              onChange={(e) => setSeedance20Key(e.target.value)}
              placeholder="输入 Seedance-2.0 的 API 密钥"
              className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              onClick={() => setShow20(!show20)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {show20 ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          用于调用 doubao-seedance-2-0-pro 模型
        </p>
      </div>

      {/* Seedream 5.0 Key */}
      <div className="rounded-lg border border-border bg-card p-4 mb-4">
        <label className="block text-sm font-medium mb-1.5">Seedream-5.0 API 密钥</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={show50 ? 'text' : 'password'}
              value={seedream50Key}
              onChange={(e) => setSeedream50Key(e.target.value)}
              placeholder="输入 Seedream-5.0 的 API 密钥"
              className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              onClick={() => setShow50(!show50)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {show50 ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          用于调用 doubao-seedream-5-0-lite 模型
        </p>
      </div>

      {/* User Info */}
      <div className="rounded-lg border border-border bg-card p-4 mb-6">
        <label className="block text-sm font-medium mb-3">个人信息</label>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">名称</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">邮箱</label>
            <input
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : saved ? (
            <>
              <CheckIcon className="mr-2 h-4 w-4" />
              已保存
            </>
          ) : (
            <>
              <SaveIcon className="mr-2 h-4 w-4" />
              保存设置
            </>
          )}
        </button>
        {saved && (
          <span className="text-sm text-green-600">设置已保存到 setting.json</span>
        )}
      </div>
    </div>
  )
}
