# Commands

Gerenciador de pacotes é **Bun**. Não use npm/pnpm — o lockfile é `bun.lock`.

## Local

```sh
bun install
bun run db:init      # cria as tabelas no D1 local
bun run dev          # vite dev, com o D1 local por binding
```

O D1 local é um arquivo SQLite em `.wrangler/state/`. Sem connection string, sem Docker. **Resetar o banco é apagar `.wrangler/`** e rodar `db:init` de novo.

## Testes e checagem

```sh
bun test                 # todos
bun test src/lib/core/score.test.ts
bun test -t 'Teto'       # por nome
bun run check            # svelte-check + tsc
```

Nenhum teste precisa de banco nem de `wrangler dev`. Ver [testing.md](testing.md).

## Deploy

```sh
bun run build
bun run deploy       # wrangler deploy
```

## Setup da nuvem — uma vez na vida

1. `bunx wrangler d1 create silas` → cole o `database_id` no `wrangler.toml`
2. `bun run db:init:remote`
3. `bun run deploy`
4. No dashboard: aponte o domínio e crie a aplicação no Access com a lista de e-mails
5. Confirme que `workers_dev = false` e `preview_urls = false` no `wrangler.toml`

**O passo 5 não é opcional.** O Access é configurado por hostname; um segundo endereço público (`*.workers.dev`) aponta pro mesmo Worker e pro mesmo D1 **sem o Access na frente**, e ali o header `Cf-Access-Authenticated-User-Email` é o que o cliente digitou. Ver [decisions.md](decisions.md).

## Banco em produção

```sh
bunx wrangler d1 execute silas --remote --command "select count(*) from occurrences"
```

É também o único jeito de corrigir um registro errado — o log é append-only e a UI não edita nada. Um `delete` aqui é a única coisa que pode fazer o `rowid` ser reusado; no pior caso custa um refresh atrasado no cliente.

## Variáveis de ambiente

Uma só, e só em desenvolvimento. Copie `.dev.vars.example` para `.dev.vars`:

| Nome | Onde | Para quê |
|---|---|---|
| `DEV_AUTHOR` | `.dev.vars` (git-ignored) | O `author` das Ocorrências em local, porque o Access não roda fora da Cloudflare. Em produção o valor vem do header e o fallback nem existe no bundle |

Nenhum segredo no repositório. O binding do D1 é declarado no `wrangler.toml`, não em env.
