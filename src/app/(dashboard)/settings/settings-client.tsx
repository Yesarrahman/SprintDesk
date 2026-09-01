'use client'

import { useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Camera, User } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { saveProfile, uploadAvatar } from './actions'

interface SettingsClientProps {
  email: string
  initialFullName: string
  initialAvatarUrl: string
}

export function SettingsClient({ email, initialFullName, initialAvatarUrl }: SettingsClientProps) {
  const [fullName, setFullName] = useState(initialFullName)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isPendingProfile, startProfileTransition] = useTransition()
  const [isPendingAvatar, startAvatarTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const initials = (initialFullName || email)
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    startAvatarTransition(async () => {
      const fd = new FormData()
      fd.append('avatar', file)
      const result = await uploadAvatar(fd)
      if (result.error) {
        toast.error(result.error)
        setAvatarPreview(null)
      } else {
        setAvatarUrl(result.avatarUrl || '')
        toast.success('Avatar updated!')
      }
    })
  }

  function handleSaveProfile() {
    startProfileTransition(async () => {
      const fd = new FormData()
      fd.append('full_name', fullName)
      const result = await saveProfile(fd)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Profile saved!')
      }
    })
  }

  const displaySrc = avatarPreview || avatarUrl

  return (
    <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-white/20 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none">
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Manage your personal profile information and avatar.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <Avatar className="h-20 w-20 border-4 border-white dark:border-slate-800 shadow-lg">
              <AvatarImage src={displaySrc} alt={fullName || 'Avatar'} />
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xl font-bold">
                {initials || <User className="h-8 w-8" />}
              </AvatarFallback>
            </Avatar>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPendingAvatar}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              title="Change avatar"
            >
              {isPendingAvatar ? (
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              ) : (
                <Camera className="h-5 w-5 text-white" />
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium">Profile Photo</p>
            <p className="text-xs text-slate-500">
              Click the avatar to upload a new photo.<br />
              JPEG, PNG, WebP or GIF · Max 2MB
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPendingAvatar}
              className="mt-2"
            >
              {isPendingAvatar && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              {isPendingAvatar ? 'Uploading...' : 'Change Photo'}
            </Button>
          </div>
        </div>

        <div className="h-px bg-slate-100 dark:bg-slate-800" />

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={email}
              disabled
              className="bg-slate-50 dark:bg-slate-800/50"
            />
            <p className="text-xs text-slate-500">Your email is managed by Supabase Auth.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
            />
          </div>

          <Button
            type="button"
            onClick={handleSaveProfile}
            disabled={isPendingProfile}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isPendingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}