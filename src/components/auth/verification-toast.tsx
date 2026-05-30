'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'

export function VerificationToast() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [hasShown, setHasShown] = useState(false)

  useEffect(() => {
    if (searchParams.get('verified') === 'true' && !hasShown) {
      toast.success('Your account is successfully verified.')
      setHasShown(true)
      
      // Clean up the URL by removing the verified parameter
      const newSearchParams = new URLSearchParams(searchParams)
      newSearchParams.delete('verified')
      const newUrl = `${pathname}${newSearchParams.toString() ? `?${newSearchParams.toString()}` : ''}`
      router.replace(newUrl)
    }
  }, [searchParams, router, pathname, hasShown])

  return null
}
