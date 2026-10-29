import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShortenForm } from '@/app/components/ShortenForm'

const successBody = {
  shortCode: 'abc1234',
  shortUrl: 'http://localhost:3000/abc1234',
  originalUrl: 'https://example.com/',
  createdAt: '2026-10-29T12:00:00.000Z',
  expiresAt: null,
}

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, successBody))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const setup = () => {
  const user = userEvent.setup()
  render(<ShortenForm debounceMs={50} />)
  return {
    user,
    urlInput: screen.getByLabelText(/url original/i),
    expiresInput: screen.getByLabelText(/expira em/i),
    submit: screen.getByRole('button', { name: /encurtar/i }),
  }
}

describe('ShortenForm', () => {
  it('renders an accessible form with labelled fields', () => {
    const { urlInput, expiresInput } = setup()

    expect(screen.getByRole('form', { name: /encurtar url/i })).toBeInTheDocument()
    expect(urlInput).toHaveAttribute('type', 'url')
    expect(urlInput).toBeRequired()
    expect(expiresInput).toHaveAttribute('type', 'datetime-local')
    expect(expiresInput).not.toBeRequired()
  })

  it('disables submit while the url is empty', async () => {
    const { user, urlInput, submit } = setup()

    expect(submit).toBeDisabled()
    await user.type(urlInput, 'https://example.com')
    expect(submit).toBeEnabled()
    await user.clear(urlInput)
    expect(submit).toBeDisabled()
  })

  it('shows an accessible error for a non http(s) url without calling the api', async () => {
    const { user, urlInput } = setup()

    await user.type(urlInput, 'ftp://example.com{Enter}')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/http:\/\/ ou https:\/\//i)
    expect(urlInput).toHaveAttribute('aria-invalid', 'true')
    expect(urlInput).toHaveAttribute('aria-describedby', expect.stringContaining(alert.id))
    expect(urlInput).toHaveFocus()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('clears the error once the user edits the url', async () => {
    const { user, urlInput } = setup()

    await user.type(urlInput, 'ftp://example.com{Enter}')
    await screen.findByRole('alert')
    await user.type(urlInput, 'x')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(urlInput).not.toHaveAttribute('aria-invalid', 'true')
  })

  it('shows a loading state with the button disabled while the request is pending', async () => {
    let resolve!: (res: Response) => void
    fetchMock.mockReturnValue(new Promise<Response>((r) => (resolve = r)))
    const { user, urlInput, submit } = setup()

    await user.type(urlInput, 'https://example.com{Enter}')

    await waitFor(() => expect(submit).toBeDisabled())
    expect(submit).toHaveTextContent(/encurtando/i)
    expect(screen.getByRole('form', { name: /encurtar url/i })).toHaveAttribute('aria-busy', 'true')

    resolve(jsonResponse(201, successBody))
    await screen.findByRole('link', { name: successBody.shortUrl })
    expect(screen.getByRole('form', { name: /encurtar url/i })).toHaveAttribute('aria-busy', 'false')
  })

  it('posts the url and announces the short link on success', async () => {
    const { user, urlInput } = setup()

    await user.type(urlInput, 'https://example.com{Enter}')

    const status = await screen.findByRole('status')
    await waitFor(() => expect(status).toHaveTextContent(successBody.shortUrl))
    expect(screen.getByRole('link', { name: successBody.shortUrl })).toHaveAttribute('href', successBody.shortUrl)
    expect(screen.getByRole('link', { name: /ver analytics/i })).toHaveAttribute('href', '/analytics/abc1234')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/shorten')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ url: 'https://example.com' })
  })

  it('sends expiresAt as an ISO string when provided', async () => {
    const { user, urlInput, expiresInput } = setup()

    await user.type(urlInput, 'https://example.com')
    await user.type(expiresInput, '2030-01-01T12:00')
    await user.click(screen.getByRole('button', { name: /encurtar/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      url: 'https://example.com',
      expiresAt: new Date('2030-01-01T12:00').toISOString(),
    })
  })

  it('debounces rapid repeated submits into a single request', async () => {
    const { user, urlInput } = setup()

    await user.type(urlInput, 'https://example.com')
    await user.keyboard('{Enter}{Enter}{Enter}')

    await screen.findByRole('link', { name: successBody.shortUrl })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not post the same url again after a successful submit', async () => {
    const { user, urlInput } = setup()

    await user.type(urlInput, 'https://example.com{Enter}')
    await screen.findByRole('link', { name: successBody.shortUrl })
    await user.click(screen.getByRole('button', { name: /encurtar/i }))
    await new Promise((r) => setTimeout(r, 100))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('link', { name: successBody.shortUrl })).toBeInTheDocument()
  })

  it('posts again when the url changes', async () => {
    const { user, urlInput } = setup()

    await user.type(urlInput, 'https://example.com{Enter}')
    await screen.findByRole('link', { name: successBody.shortUrl })
    await user.type(urlInput, '/other{Enter}')

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  })

  it('shows the api error message when the request is rejected', async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { error: 'URL inválida (vinda da API).' }))
    const { user, urlInput } = setup()

    await user.type(urlInput, 'https://example.com{Enter}')

    expect(await screen.findByRole('alert')).toHaveTextContent('URL inválida (vinda da API).')
    expect(screen.getByRole('button', { name: /encurtar/i })).toBeEnabled()
  })

  it('shows a generic error when the network fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const { user, urlInput } = setup()

    await user.type(urlInput, 'https://example.com{Enter}')

    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível encurtar/i)
  })
})
