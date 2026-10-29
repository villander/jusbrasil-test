'use client'

import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { debounce, type Debounced } from '@/lib/debounce'
import { validateUrl } from '@/lib/validate-url'

export type ShortenFormProps = { debounceMs?: number }

type ShortenResult = {
  shortCode: string
  shortUrl: string
  originalUrl: string
  createdAt: string
  expiresAt: string | null
}

type Status = 'idle' | 'loading' | 'success' | 'error'

const NETWORK_ERROR_MESSAGE = 'Não foi possível encurtar a URL. Tente novamente.'

export function ShortenForm({ debounceMs = 300 }: ShortenFormProps) {
  const ids = useId()
  const urlId = `${ids}-url`
  const expiresId = `${ids}-expires`
  const errorId = `${ids}-error`

  const [url, setUrl] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ShortenResult | null>(null)

  const urlInputRef = useRef<HTMLInputElement>(null)
  const inFlightRef = useRef(false)
  const lastSubmittedKeyRef = useRef<string | null>(null)

  const loading = status === 'loading'

  const showError = (message: string) => {
    setError(message)
    setStatus('error')
    urlInputRef.current?.focus()
  }

  const submit = async (rawUrl: string, rawExpiresAt: string) => {
    if (inFlightRef.current) return

    const validated = validateUrl(rawUrl)
    if (!validated.ok) return showError(validated.error)

    const payload: { url: string; expiresAt?: string } = { url: rawUrl.trim() }
    if (rawExpiresAt) payload.expiresAt = new Date(rawExpiresAt).toISOString()

    // Same URL and expiration as the last successful submit: keep the existing result
    const key = JSON.stringify(payload)
    if (key === lastSubmittedKeyRef.current) return

    inFlightRef.current = true
    setStatus('loading')
    setError(null)

    try {
      const res = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json().catch(() => null)

      if (!res.ok) {
        showError(typeof body?.error === 'string' ? body.error : NETWORK_ERROR_MESSAGE)
        return
      }

      lastSubmittedKeyRef.current = key
      setResult(body as ShortenResult)
      setStatus('success')
    } catch {
      showError(NETWORK_ERROR_MESSAGE)
    } finally {
      inFlightRef.current = false
    }
  }

  // Always call the latest `submit` so the debounced wrapper can stay stable
  const submitRef = useRef(submit)
  useEffect(() => {
    submitRef.current = submit
  })
  const debouncedSubmitRef = useRef<Debounced<[string, string]> | null>(null)
  useEffect(() => {
    const debounced = debounce((u: string, e: string) => void submitRef.current(u, e), debounceMs)
    debouncedSubmitRef.current = debounced
    return () => debounced.cancel()
  }, [debounceMs])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading) return
    debouncedSubmitRef.current?.(url, expiresAt)
  }

  const clearError = () => {
    if (error) {
      setError(null)
      setStatus(result ? 'success' : 'idle')
    }
  }

  return (
    <form
      aria-label="Encurtar URL"
      aria-busy={loading}
      noValidate
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor={urlId} className="font-medium">
          URL original
        </label>
        <input
          ref={urlInputRef}
          id={urlId}
          name="url"
          type="url"
          inputMode="url"
          autoComplete="url"
          required
          placeholder="https://exemplo.com/pagina"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            clearError()
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="rounded border border-zinc-300 px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 aria-invalid:border-red-600 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={expiresId} className="font-medium">
          Expira em (opcional)
        </label>
        <input
          id={expiresId}
          name="expiresAt"
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => {
            setExpiresAt(e.target.value)
            clearError()
          }}
          className="rounded border border-zinc-300 px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-red-700 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || url.trim() === ''}
        className="rounded bg-black px-4 py-2 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {loading ? 'Encurtando...' : 'Encurtar'}
      </button>

      <div role="status" aria-live="polite" className="min-h-6">
        {result && status !== 'loading' && (
          <div className="flex flex-col gap-1 rounded border border-green-600 p-3">
            <p>URL encurtada com sucesso:</p>
            <a
              href={result.shortUrl}
              className="break-all font-mono font-medium text-blue-700 underline focus-visible:outline-2 focus-visible:outline-blue-600 dark:text-blue-400"
            >
              {result.shortUrl}
            </a>
            <a
              href={`/analytics/${result.shortCode}`}
              className="text-sm underline focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              Ver analytics
            </a>
          </div>
        )}
      </div>
    </form>
  )
}
