'use client'

import { useState } from 'react'
import Link from 'next/link'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, Mail } from 'lucide-react'

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
import { resetPassword } from '../actions'

const forgotSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type ForgotFormValues = z.infer<typeof forgotSchema>

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const form = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: {
      email: '',
    },
  })

  async function onSubmit(data: ForgotFormValues) {
    setIsLoading(true)
    const formData = new FormData()
    formData.append('email', data.email)

    const result = await resetPassword(formData)

    if (result?.error) {
      toast.error(result.error)
    } else if (result?.success) {
      setEmailSent(true)
      toast.success(result.success)
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-indigo-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
      <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-purple-500/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>

      <div className="w-full max-w-md p-8 rounded-2xl border border-white/20 bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl shadow-2xl relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
            Reset Password
          </h1>
          <p className="text-center text-slate-500 dark:text-slate-400 mt-2">
            {emailSent
              ? 'Check your email for a reset link'
              : 'Enter your email to receive a reset link'}
          </p>
        </div>

        {emailSent ? (
          <div className="text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center">
              <Mail className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              We&apos;ve sent a password reset link to <span className="font-medium">{form.getValues('email')}</span>. 
              Please check your inbox and follow the instructions.
            </p>
            <Link href="/login">
              <Button variant="outline" className="w-full mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="name@example.com"
                          {...field}
                          className="bg-white/50 dark:bg-slate-800/50"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center text-sm text-slate-500">
              Remember your password?{' '}
              <Link href="/login" className="text-indigo-600 hover:text-indigo-500 font-medium">
                Log in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
