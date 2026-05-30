'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { UserPlus, Trash2 } from 'lucide-react'
import { deleteWorkspace } from '@/app/actions/workspace'
import { inviteMember } from '@/app/(dashboard)/team/actions'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { WorkspaceRole } from '@/types'

export default function KanbanActions({ role, workspaceId }: { role: string, workspaceId: string }) {
  const router = useRouter()
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('member')
  const [isLoading, setIsLoading] = useState(false)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setIsLoading(true)
    const result = await inviteMember(inviteEmail, inviteRole)
    setIsLoading(false)
    
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`Invite sent to ${inviteEmail}`)
      setIsInviteOpen(false)
      setInviteEmail('')
      router.refresh()
    }
  }

  const handleDeleteWorkspace = async () => {
    setIsLoading(true)
    const result = await deleteWorkspace(workspaceId)
    setIsLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Workspace deleted')
      setIsDeleteOpen(false)
      router.refresh()
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setIsInviteOpen(true)} className="gap-2">
        <UserPlus className="h-4 w-4" />
        <span className="hidden sm:inline">Invite Team</span>
      </Button>

      {(role === 'owner' || role === 'admin') && (
        <Button variant="destructive" onClick={() => setIsDeleteOpen(true)} className="gap-2">
          <Trash2 className="h-4 w-4" />
        </Button>
      )}

      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <form onSubmit={handleInvite}>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Invite someone to collaborate in this workspace.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="mt-2"
                  required
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={inviteRole} onValueChange={(val) => { if (val) setInviteRole(val as WorkspaceRole) }}>
                  <SelectTrigger className="mt-2">
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
              <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send Invite'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Workspace</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this workspace? This action cannot be undone and will delete all tasks within it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteWorkspace} disabled={isLoading}>
              {isLoading ? 'Deleting...' : 'Yes, Delete Workspace'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
