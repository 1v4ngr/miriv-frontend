import type { ReactNode } from 'react'
import { useCan } from '../hooks/use-permissions'

interface CanProps {
  permission?: string
  fallback?: ReactNode
  children: ReactNode
}

export function Can({ permission, fallback = null, children }: CanProps) {
  const allowed = permission ? useCan(permission) : true
  return <>{allowed ? children : fallback}</>
}