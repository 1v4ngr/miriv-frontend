import { useEffect, useState } from 'react'
import { profileApi, type CurrentUserProfile } from '../services/profile-api'

export function useCurrentProfile() {
  const [profile, setProfile] = useState<CurrentUserProfile>()

  useEffect(() => {
    let active = true
    profileApi.getCurrentProfile().then((response) => { if (active) setProfile(response) }).catch(() => undefined)
    return () => { active = false }
  }, [])

  return profile
}
