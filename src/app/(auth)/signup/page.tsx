'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { signup } from '../actions'

const signupSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type SignupFormValues = z.infer<typeof signupSchema>

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false)
  
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
    },
  })

  async function onSubmit(data: SignupFormValues) {
    setIsLoading(true)
    const formData = new FormData()
    formData.append('fullName', data.fullName)
    formData.append('email', data.email)
    formData.append('password', data.password)

    const result = await signup(formData)
    
    if (result?.error) {
      toast.error(result.error)
      setIsLoading(false)
    } else if (result?.success) {
      toast.success(result.success)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
      <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-secondary/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
      
      <div className="w-full max-w-md p-8 rounded-2xl border border-white/40 dark:border-slate-700/50 bg-white/40 dark:bg-[#0D2440]/60 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.05)] relative z-10">
        <div className="mb-8 flex flex-col items-center">
          <Image src="/logo.png" alt="SprintDesk Logo" width={400} height={120} className="h-24 w-auto object-contain mb-4 drop-shadow-sm dark:brightness-0 dark:invert" priority />
          <p className="text-center text-slate-500 dark:text-slate-300">Create your workspace account</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} className="bg-white/50 dark:bg-slate-800/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" {...field} className="bg-white/50 dark:bg-slate-800/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} className="bg-white/50 dark:bg-slate-800/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full mt-2" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Sign Up'
              )}
            </Button>
          </form>
        </Form>
        
        <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
            Log in
          </Link>
        </div>
      </div>
    </div>
  )
}
