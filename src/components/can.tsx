import type { ReactNode } from 'react'
import { useCan } from '../hooks/use-permissions'

interface CanProps {
  permission?: string
  fallback?: ReactNode
  children: ReactNode
}

export function Can({ permission, fallback = null, children }: CanProps) {
  if (!permission) return <>{children}</>
  return useCan(permission) ? <>{children}</> : <>{fallback}</>
}