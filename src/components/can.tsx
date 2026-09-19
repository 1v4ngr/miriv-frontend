import type { ReactNode } from 'react'
import { useCan } from '../hooks/use-permissions'

interface CanProps {
  permission?: string
  fallback?: ReactNode
  children: ReactNode
}

export function Can({ permission, fallback = null, children }: CanProps) {
  // Always call the hook (Rules of Hooks); no permission means "no restriction".
  const can = useCan(permission ?? '')
  const allowed = permission ? can : true
  return <>{allowed ? children : fallback}</>
}