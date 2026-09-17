import { useEffect, useState } from 'react'
import { profileApi, type CurrentUserProfile } from '../services/profile-api'

export const PROFILE_UPDATED_EVENT = 'miriv:profile-updated'

export function useCurrentProfile() {
  const [profile, setProfile] = useState<CurrentUserProfile>()

  useEffect(() => {
    let active = true
    const load = () => { profileApi.getCurrentProfile().then((response) => { if (active) setProfile(response) }).catch(() => undefined) }
    load()
    window.addEventListener(PROFILE_UPDATED_EVENT, load)
    return () => { active = false; window.removeEventListener(PROFILE_UPDATED_EVENT, load) }
  }, [])

  return profile
}
