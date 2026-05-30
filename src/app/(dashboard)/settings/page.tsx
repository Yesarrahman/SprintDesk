import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ThemeSwitcher } from '@/components/layout/theme-switcher'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <h1 className="text-3xl font-bold">Settings</h1>
      
      <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-white/20 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Manage your personal profile information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user.email} disabled className="bg-slate-50 dark:bg-slate-800/50" />
            <p className="text-xs text-slate-500">Your email is managed by Supabase Auth.</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" defaultValue={profile?.full_name || ''} placeholder="John Doe" />
          </div>

          <Button className="mt-2">Save Profile</Button>
        </CardContent>
      </Card>

      <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-white/20 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize the look and feel of the application.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 mb-4">
            Toggle between light and dark themes.
          </p>
          <ThemeSwitcher />
        </CardContent>
      </Card>
    </div>
  )
}
