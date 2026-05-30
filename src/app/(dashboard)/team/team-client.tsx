'use client'

import { useState } from 'react'
import { inviteMember, removeMember } from './actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { WorkspaceRole } from '@/types'
import { Trash2, UserPlus, Mail } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Member {
  id: string
  user_id: string
  role: WorkspaceRole
  created_at: string
  full_name: string
  avatar_url: string | null
}

interface TeamClientProps {
  members: Member[]
  currentUserId: string
  currentUserRole: WorkspaceRole
}

export default function TeamClient({ members, currentUserId, currentUserRole }: TeamClientProps) {
  const router = useRouter()
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('member')
  const [isLoading, setIsLoading] = useState(false)

  const canManageTeam = currentUserRole === 'owner' || currentUserRole === 'admin'

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail) return

    setIsLoading(true)
    const result = await inviteMember(inviteEmail, inviteRole)
    setIsLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`Invitation sent to ${inviteEmail}`)
      setIsInviteOpen(false)
      setInviteEmail('')
      router.refresh()
    }
  }

  const handleRemove = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return

    setIsLoading(true)
    const result = await removeMember(userId)
    setIsLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Member removed successfully')
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Workspace Members</CardTitle>
            <CardDescription>Manage who has access to this workspace</CardDescription>
          </div>
          {canManageTeam && (
            <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
              <DialogTrigger
                render={
                  <Button className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Invite Member
                  </Button>
                }
              />
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleInvite}>
                  <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>
                      Send an email invitation to add a new member to your workspace.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="email" className="text-right">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="col-span-3"
                        placeholder="colleague@example.com"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="role" className="text-right">
                        Role
                      </Label>
                      <Select value={inviteRole} onValueChange={(val) => { if (val) setInviteRole(val as WorkspaceRole) }}>
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? 'Sending...' : 'Send Invitation'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 rounded-lg border bg-background/50">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback>
                      {member.full_name ? member.full_name.substring(0, 2).toUpperCase() : <Mail className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium leading-none">{member.full_name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Joined {new Date(member.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={member.role === 'owner' ? 'default' : member.role === 'admin' ? 'secondary' : 'outline'}>
                    {member.role}
                  </Badge>
                  
                  {canManageTeam && member.user_id !== currentUserId && member.role !== 'owner' && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleRemove(member.user_id)}
                      disabled={isLoading}
                      className="text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            {members.length === 0 && (
              <div className="text-center p-8 text-muted-foreground border border-dashed rounded-lg">
                No members found in this workspace.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
