'use client'

import { useState } from 'react'
import { Plus, Trash2, Send, MoreHorizontal } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addInboxItem, deleteInboxItem } from './actions'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'

export function InboxClient({ initialItems }: { initialItems: any[] }) {
  const [items, setItems] = useState(initialItems)
  const [newItem, setNewItem] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItem.trim()) return

    setIsSubmitting(true)
    const tempId = Math.random().toString()
    const tempItem = {
      id: tempId,
      content: newItem,
      created_at: new Date().toISOString(),
    }
    
    // Optimistic UI
    setItems((prev) => [tempItem, ...prev])
    setNewItem('')

    const result = await addInboxItem(tempItem.content)
    setIsSubmitting(false)

    if (result.error) {
      toast.error('Failed to save to inbox')
      setItems((prev) => prev.filter((i) => i.id !== tempId))
    } else {
      toast.success('Added to Inbox')
    }
  }

  const handleDelete = async (id: string) => {
    const backup = [...items]
    setItems((prev) => prev.filter((i) => i.id !== id))

    const result = await deleteInboxItem(id)
    if (result.error) {
      toast.error('Failed to delete item')
      setItems(backup)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-white/20 dark:border-slate-800 shadow-xl">
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleAdd} className="flex gap-3 relative">
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="What's on your mind? (e.g., Follow up with Sarah, Fix navbar bug)"
              className="flex-1 text-lg py-6 bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500"
              disabled={isSubmitting}
              autoFocus
            />
            <Button 
              type="submit" 
              size="lg" 
              className="px-8 h-auto bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={!newItem.trim() || isSubmitting}
            >
              <Send className="h-5 w-5 mr-2" />
              Capture
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="group bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-slate-900 dark:text-slate-100 text-lg">{item.content}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Captured {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="outline" size="sm" className="hidden sm:flex border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-400 dark:hover:bg-indigo-900/30">
                      Triage to Board
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(item.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {items.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="text-center py-12 text-slate-500"
            >
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <Plus className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-lg">Your inbox is empty.</p>
              <p className="text-sm">Capture ideas as they come to you.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
