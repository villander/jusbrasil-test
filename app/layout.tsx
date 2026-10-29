import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Encurtador de URL",
  description: "Crie links curtos e acompanhe os cliques",
};

const navLinkClass = "underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-zinc-200 dark:border-zinc-800">
          <nav aria-label="Principal" className="mx-auto flex max-w-4xl gap-6 px-4 py-3 font-medium">
            <Link href="/" className={navLinkClass}>Encurtar</Link>
            <Link href="/urls" className={navLinkClass}>URLs</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
