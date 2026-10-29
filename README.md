# Encurtador de URL

Aplicação web para transformar URLs longas em links curtos e acompanhar quantas vezes cada link foi acessado.

## O que o projeto resolve

URLs longas são difíceis de compartilhar e não dizem nada sobre quem clicou nelas. Este projeto:

- **Encurta URLs:** gera um código de 7 caracteres alfanuméricos (ex.: `http://localhost:3000/aB3xY9z`) que redireciona (301) para a URL original.
- **Controla a validade:** cada link pode ter uma data de expiração opcional. Depois dela, o link responde `410 Gone`.
- **Mede o uso:** cada acesso registra um clique com referrer, user-agent, IP e data. Os cliques aparecem numa listagem geral e numa página de analytics por link, com total de cliques, cliques por dia (últimos 30 dias) e top referrers.

Só são aceitas URLs `http://` e `https://`.

## Como rodar

Pré-requisito: Node.js 22.12 ou superior (testado com Node 24).

```bash
# 1. Instalar as dependências (também gera o Prisma Client)
npm install

# 2. Configurar o banco SQLite
echo 'DATABASE_URL="file:./dev.db"' > .env

# 3. Criar as tabelas
npx prisma migrate dev

# 4. Subir o servidor de desenvolvimento
npm run dev
```

Depois, abra **http://localhost:3000** no navegador.

> Se o schema do Prisma mudar (`prisma migrate dev` / `prisma generate`), reinicie o `npm run dev`. Em desenvolvimento o Prisma Client fica em cache entre hot reloads.

## Páginas

| URL | O que faz |
| --- | --- |
| http://localhost:3000 | Formulário para encurtar uma URL (com expiração opcional) |
| http://localhost:3000/urls | Lista dos links criados, do mais recente para o mais antigo, com a contagem de cliques |
| http://localhost:3000/analytics/{código} | Analytics de um link: total de cliques, cliques por dia e top referrers |
| http://localhost:3000/{código} | Redireciona para a URL original e registra o clique |

## API

| Método e rota | Descrição |
| --- | --- |
| `POST /api/shorten` | Recebe `{ url, expiresAt? }` e devolve `{ shortCode, shortUrl, originalUrl, createdAt, expiresAt }` com status 201. Responde 400 para URL inválida ou `expiresAt` inválido/no passado. |
| `GET /:code` | Redireciona (301) para a URL original. Responde 404 se o código não existir e 410 se o link expirou. |
| `GET /api/urls` | Lista os links (mais recentes primeiro) com a contagem de cliques. |
| `GET /api/stats/:code` | Devolve `totalClicks`, `clicksByDay` (últimos 30 dias) e `topReferrers`. Responde 404 se o código não existir. |

Exemplo:

```bash
curl -X POST http://localhost:3000/api/shorten \
  -H 'content-type: application/json' \
  -d '{"url": "https://example.com/uma/pagina/bem/longa"}'
```

## Testes

O projeto foi construído com TDD.

```bash
npm test                         # Vitest: unidade, integração (SQLite em test.db) e componentes
npx playwright install chromium  # só na primeira vez
npm run test:e2e                 # Playwright: build de produção na porta 3100 com e2e.db
```

## Configuração

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | Sim | Caminho do SQLite, ex.: `file:./dev.db` |
| `BASE_URL` | Não | Origem pública usada para montar os links curtos (ex.: `https://sho.rt`). Sem ela, usa a origem da requisição. |

## Stack

Next.js 16 (App Router), React 19, Prisma 7 com SQLite (`better-sqlite3`), Tailwind CSS 4, Vitest + Testing Library e Playwright.

## Estrutura

```
app/
  page.tsx                  # Formulário de encurtar
  urls/page.tsx             # Listagem de links
  analytics/[code]/page.tsx # Analytics por link
  [code]/route.ts           # Redirect + registro de clique
  api/                      # shorten, urls, stats/[code]
  components/ShortenForm.tsx
lib/                        # Validação, geração de código, stats e acesso ao banco (url-service.ts)
proxy.ts                    # Garante status 404 real no analytics de códigos inexistentes
prisma/                     # Schema e migrations
__tests__/                  # Testes Vitest (server/ e ui/)
e2e/                        # Testes Playwright
```
