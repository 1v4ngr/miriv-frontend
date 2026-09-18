import { useCallback, useEffect, useState } from 'react'
import { ApiRequestError } from '../services/api-client'

export interface Resource<T> {
  data: T | undefined
  loading: boolean
  error: string
  notFound: boolean
  reload: () => void
  setData: (value: T) => void
}

/** Loads data once per change of `deps` and exposes loading / error / 404 states. */
export function useResource<T>(fetcher: () => Promise<T | undefined>, deps: unknown[]): Resource<T> {
  const [data, setData] = useState<T>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [version, setVersion] = useState(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fetcher, deps)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setNotFound(false)
    run()
      .then((value) => { if (!active) return; if (value === undefined) setNotFound(true); setData(value) })
      .catch((cause) => {
        if (!active) return
        if (cause instanceof ApiRequestError && cause.status === 404) setNotFound(true)
        else setError(cause instanceof Error ? cause.message : 'No se ha podido cargar la información.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [run, version])

  return { data, loading, error, notFound, reload: () => setVersion((value) => value + 1), setData }
}