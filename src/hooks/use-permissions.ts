import { useEffect, useState } from 'react'
import { accountApi, type AccountSummary } from '../services/account-api'

export const ACCOUNT_UPDATED_EVENT = 'miriv:account-updated'

let cached: AccountSummary | undefined
const listeners = new Set<(value: AccountSummary) => void>()

export function invalidateAccountCache() {
  cached = undefined
  listeners.forEach((listener) => listener(cached as AccountSummary))
}

function fetch() {
  return accountApi.getAccount().then((value) => {
    cached = value
    listeners.forEach((listener) => listener(value))
    return value
  }).catch(() => undefined)
}

export function useAccount() {
  const [account, setAccount] = useState<AccountSummary | undefined>(cached)
  useEffect(() => {
    let active = true
    const handle = (next: AccountSummary) => { if (active) setAccount(next) }
    listeners.add(handle)
    if (!cached) fetch()
    else setAccount(cached)
    const reload = () => fetch()
    window.addEventListener(ACCOUNT_UPDATED_EVENT, reload)
    return () => { active = false; listeners.delete(handle); window.removeEventListener(ACCOUNT_UPDATED_EVENT, reload) }
  }, [])
  return account
}

/** Destructive corrections (deleting an analysis, undoing a movement) are for the super administrator. */
export function useIsSuperAdmin(): boolean {
  const account = useAccount()
  return (account?.roles ?? []).some((role) => role.code === 'SUPER_ADMIN')
}

export function useCan(permission: string): boolean {
  const account = useAccount()
  if (!account) return false
  const permissions = account.permissions ?? []
  return permissions.some((entry) => entry.code === permission)
}