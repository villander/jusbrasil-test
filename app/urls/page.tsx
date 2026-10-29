import { Suspense } from 'react'
import Link from 'next/link'
import { headers } from 'next/headers'
import { connection } from 'next/server'
import { formatDateTime } from '@/lib/format'
import { originFromHeaders } from '@/lib/url-response'
import { listUrls } from '@/lib/url-service'

async function UrlTable() {
  // better-sqlite3 is synchronous, so make sure the query runs per request
  await connection()
  const [urls, requestHeaders] = await Promise.all([listUrls(), headers()])
  const origin = originFromHeaders(requestHeaders)

  if (urls.length === 0) {
    return <p className="text-zinc-600 dark:text-zinc-400">Nenhuma URL criada ainda.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">URLs encurtadas</caption>
        <thead>
          <tr className="border-b border-zinc-300 dark:border-zinc-700">
            <th scope="col" className="p-2">URL encurtada</th>
            <th scope="col" className="p-2">URL original</th>
            <th scope="col" className="p-2">Criada em</th>
            <th scope="col" className="p-2">Expira em</th>
            <th scope="col" className="p-2 text-right">Cliques</th>
            <th scope="col" className="p-2">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {urls.map((url) => (
            <tr key={url.id} className="border-b border-zinc-200 dark:border-zinc-800">
              <td className="whitespace-nowrap p-2 font-mono">
                <a
                  href={`${origin}/${url.code}`}
                  className="underline focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                  {`${origin}/${url.code}`}
                </a>
              </td>
              <td className="max-w-xs truncate p-2" title={url.originalUrl}>
                {url.originalUrl}
              </td>
              <td className="whitespace-nowrap p-2">{formatDateTime(url.createdAt)}</td>
              <td className="whitespace-nowrap p-2">{url.expiresAt ? formatDateTime(url.expiresAt) : '—'}</td>
              <td className="p-2 text-right tabular-nums">{url.clicks}</td>
              <td className="p-2">
                <Link
                  href={`/analytics/${url.code}`}
                  className="whitespace-nowrap underline focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                  Ver analytics<span className="sr-only"> de {url.code}</span>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function UrlsPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-12">
      <h1 className="text-3xl font-semibold">URLs encurtadas</h1>
      <Suspense fallback={<p aria-busy="true">Carregando URLs...</p>}>
        <UrlTable />
      </Suspense>
    </main>
  )
}
