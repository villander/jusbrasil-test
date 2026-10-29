import Link from 'next/link'
import { ShortenForm } from '@/app/components/ShortenForm'

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Encurtador de URL</h1>
        <p className="text-zinc-600 dark:text-zinc-400">Cole uma URL http:// ou https:// para gerar um link curto.</p>
      </div>
      <ShortenForm />
      <Link href="/urls" className="self-start underline focus-visible:outline-2 focus-visible:outline-blue-600">
        Minhas URLs
      </Link>
    </main>
  )
}
