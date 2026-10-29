import { prisma } from '@/lib/prisma'

export async function resetDatabase() {
  await prisma.click.deleteMany()
  await prisma.shortUrl.deleteMany()
}

export { prisma }
