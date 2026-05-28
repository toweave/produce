import React, { useRef } from 'react'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useProfileStore } from '@/stores/profile-store'
import { UserIcon, CameraIcon, Loader2Icon } from 'lucide-react'

export default function ProfileEditPage(): React.JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    username,
    email,
    gender,
    avatarDataUrl,
    isSubmitting,
    isDirty,
    errors,
    setUsername,
    setEmail,
    setGender,
    setAvatar,
    clearAvatar,
    save,
    reset,
  } = useProfileStore()

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await setAvatar(file)
    }
    // Reset input value so the same file can be re-selected
    e.target.value = ''
  }

  const handleSelectGender = (val: string) => {
    setGender(val)
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>编辑个人资料</CardTitle>
          <CardDescription>更新您的个人信息和头像</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar size="lg" className="size-24">
                {avatarDataUrl ? (
                  <AvatarImage src={avatarDataUrl} alt="用户头像" />
                ) : (
                  <AvatarFallback className="text-2xl">
                    <UserIcon className="size-8" />
                  </AvatarFallback>
                )}
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -right-1 -bottom-1 flex size-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm ring-2 ring-background transition-colors hover:bg-primary/80"
              >
                <CameraIcon className="size-4" />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />

            {avatarDataUrl && (
              <button
                type="button"
                onClick={clearAvatar}
                className="cursor-pointer text-xs text-muted-foreground underline hover:text-foreground"
              >
                移除头像
              </button>
            )}

            <p className="text-xs text-muted-foreground">支持 JPG、PNG、WebP 格式，建议 1:1 比例</p>
          </div>

          <Separator />

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              aria-invalid={!!errors.username}
            />
            {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入邮箱地址"
              aria-invalid={!!errors.email}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label htmlFor="gender">性别</Label>
            <Select value={gender} onValueChange={handleSelectGender}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="请选择性别" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">男</SelectItem>
                <SelectItem value="female">女</SelectItem>
                <SelectItem value="other">其他</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={save} disabled={isSubmitting || !isDirty}>
              {isSubmitting && <Loader2Icon className="size-3.5 animate-spin" />}
              {isSubmitting ? '保存中...' : '保存'}
            </Button>
            <Button variant="outline" onClick={reset} disabled={isSubmitting}>
              重置
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
