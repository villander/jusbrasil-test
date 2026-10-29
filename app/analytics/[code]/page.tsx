import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { formatDay } from '@/lib/format'
import { getStats } from '@/lib/url-service'

async function AnalyticsContent({ params }: { params: PageProps<'/analytics/[code]'>['params'] }) {
  const { code } = await params
  // better-sqlite3 is synchronous, so make sure the query runs per request
  await connection()
  const stats = await getStats(code)
  // Unknown codes already get a 404 status from proxy.ts; this renders the not-found UI
  if (!stats) notFound()

  return (
    <>
      <h1 className="text-3xl font-semibold">
        Analytics de <span className="font-mono">{code}</span>
      </h1>

      <dl className="flex flex-col gap-1">
        <dt className="text-zinc-600 dark:text-zinc-400">Total de cliques</dt>
        <dd data-testid="total-clicks" className="text-4xl font-semibold tabular-nums">
          {stats.totalClicks}
        </dd>
      </dl>

      <table className="w-full border-collapse text-left text-sm">
        <caption className="mb-2 text-left text-lg font-semibold">Cliques por dia (últimos 30 dias)</caption>
        <thead>
          <tr className="border-b border-zinc-300 dark:border-zinc-700">
            <th scope="col" className="p-2">Data</th>
            <th scope="col" className="p-2 text-right">Cliques</th>
          </tr>
        </thead>
        <tbody>
          {stats.clicksByDay.map((day) => (
            <tr key={day.date} className="border-b border-zinc-200 dark:border-zinc-800">
              <td className="p-2">
                <time dateTime={day.date}>{formatDay(day.date)}</time>
              </td>
              <td className="p-2 text-right tabular-nums">{day.count}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="w-full border-collapse text-left text-sm">
        <caption className="mb-2 text-left text-lg font-semibold">Top referrers</caption>
        <thead>
          <tr className="border-b border-zinc-300 dark:border-zinc-700">
            <th scope="col" className="p-2">Referrer</th>
            <th scope="col" className="p-2 text-right">Cliques</th>
          </tr>
        </thead>
        <tbody>
          {stats.topReferrers.length === 0 ? (
            <tr>
              <td colSpan={2} className="p-2 text-zinc-600 dark:text-zinc-400">
                Nenhum clique registrado ainda.
              </td>
            </tr>
          ) : (
            stats.topReferrers.map((r) => (
              <tr key={r.referrer} className="border-b border-zinc-200 dark:border-zinc-800">
                <td className="break-all p-2">{r.referrer}</td>
                <td className="p-2 text-right tabular-nums">{r.count}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </>
  )
}

export default function AnalyticsPage({ params }: PageProps<'/analytics/[code]'>) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12">
      <Suspense fallback={<p aria-busy="true">Carregando analytics...</p>}>
        <AnalyticsContent params={params} />
      </Suspense>
    </main>
  )
}
