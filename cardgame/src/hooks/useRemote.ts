'use client'
import { useCallback, useEffect, useState } from 'react'
export async function readApi<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', signal })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Chargement indisponible')
  return data
}
export function useRemote<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(Boolean(url))
  const [revision, setRevision] = useState(0)
  const retry = useCallback(() => setRevision(n => n + 1), [])
  useEffect(() => {
    if (!url) { setData(null); setLoading(false); return }
    const controller = new AbortController()
    setData(null); setLoading(true); setError('')
    readApi<T>(url, controller.signal).then(result => { if (!controller.signal.aborted) setData(result) })
      .catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Chargement indisponible') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [url, revision])
  return { data, error, loading, retry }
}
