import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-12">
      <h1 className="text-3xl font-semibold">Página não encontrada</h1>
      <p className="text-zinc-600 dark:text-zinc-400">Não encontramos uma URL encurtada com esse código.</p>
      <Link href="/urls" className="self-start underline focus-visible:outline-2 focus-visible:outline-blue-600">
        Ver URLs encurtadas
      </Link>
    </main>
  )
}
