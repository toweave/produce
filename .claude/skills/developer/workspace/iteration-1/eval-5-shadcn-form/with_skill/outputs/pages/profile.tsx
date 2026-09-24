import React, { useRef } from 'react'
import { useProfileStore } from '@/stores/profile-store'
import { UserIcon, UploadIcon, CameraIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Field, FieldLabel, FieldContent } from '@/components/ui/field'

export default function ProfilePage(): React.JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Single-field selectors — each causes re-render only when that field changes
  const username = useProfileStore((s) => s.username)
  const email = useProfileStore((s) => s.email)
  const gender = useProfileStore((s) => s.gender)
  const avatarData = useProfileStore((s) => s.avatarData)
  const saving = useProfileStore((s) => s.saving)

  const setUsername = useProfileStore((s) => s.setUsername)
  const setEmail = useProfileStore((s) => s.setEmail)
  const setGender = useProfileStore((s) => s.setGender)
  const setAvatarData = useProfileStore((s) => s.setAvatarData)

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      setAvatarData(reader.result as string)
    }
    reader.readAsDataURL(file)
    // Reset so the same file can be re-selected
    e.target.value = ''
  }

  const handleSave = async () => {
    const { saveProfile } = useProfileStore.getState()
    await saveProfile()
    toast.success('Profile saved successfully')
  }

  return (
    <div className="p-6 w-full max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="size-4" />
            Edit Profile
          </CardTitle>
          <CardDescription>
            Manage your personal information and avatar.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          {/* Avatar Upload Section */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar size="lg" className="size-16">
                {avatarData ? (
                  <AvatarImage src={avatarData} alt="Avatar preview" />
                ) : (
                  <AvatarFallback>
                    <CameraIcon className="size-5 text-muted-foreground" />
                  </AvatarFallback>
                )}
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background cursor-pointer hover:bg-primary/80 transition-colors"
                aria-label="Upload avatar"
              >
                <UploadIcon className="size-3" />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs/relaxed font-medium">Avatar</span>
              <span className="text-xs/relaxed text-muted-foreground">
                PNG, JPG or WEBP. 1:1 ratio recommended.
              </span>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleAvatarSelect}
            />
          </div>

          {/* Username */}
          <Field orientation="vertical">
            <FieldLabel>
              <Label htmlFor="username">Username</Label>
            </FieldLabel>
            <FieldContent>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </FieldContent>
          </Field>

          {/* Email */}
          <Field orientation="vertical">
            <FieldLabel>
              <Label htmlFor="email">Email</Label>
            </FieldLabel>
            <FieldContent>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FieldContent>
          </Field>

          {/* Gender Select */}
          <Field orientation="vertical">
            <FieldLabel>
              <Label htmlFor="gender">Gender</Label>
            </FieldLabel>
            <FieldContent>
              <Select
                value={gender}
                onValueChange={(val: string) => setGender(val as '' | 'male' | 'female' | 'other')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </FieldContent>
          </Field>
        </CardContent>

        <CardFooter className="border-t border-border pt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
