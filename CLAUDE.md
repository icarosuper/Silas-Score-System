# CLAUDE.md

Guidance for Claude Code (claude.ai/code) in this repo.

## Project Overview

Silas = painel do **Silas Score System (SSS)**. Um app SvelteKit de uma página, rodando como Worker na Cloudflare, onde um humano registra as interações do chefe (Silas) e vê a pontuação do Dia. Banco é D1 (SQLite serverless por binding), auth é Cloudflare Access (zero linhas de código), zero dependências de runtime além do framework.

O SSS não observa nada: recebe Ocorrências já observadas e devolve Score. O core é função pura, sem IO e sem framework — o Score não é persistido, é derivado por replay do log a cada requisição.

Vocabulário do domínio (Ocorrência, Evento, Modificador, Faixa, Extrato, Descarte…) vive em [CONTEXT.md](CONTEXT.md). **Use esses termos**; a spec e o código dependem deles.

## Important — After Any Change

1. **Run tests**: `bun test`
2. **Type check**: `bun run check`
3. **Update docs**: arquivo adicionado ou removido em `src/` → seção correspondente no [Mapa de arquivos](docs/agents/architecture.md#mapa-de-arquivos), com os símbolos exportados. Rota, tabela de números ou convenção → o doc correspondente em `docs/agents/`. Padrão não-óbvio novo → entrada em [decisions.md](docs/agents/decisions.md)
4. **Spec é a fonte**: `src/lib/core/catalog.ts` e `tables.ts` são transcrição de [docs/silas-score-system.md](docs/silas-score-system.md). Mudou um número no código? Mude na spec junto, e vice-versa — o teste de catálogo pega a divergência de contagem, não a de valor. Decisão de domínio vira ADR; decisão de implementação vira entrada em `decisions.md`
5. **Git é livre**: pode commitar, criar branch e fazer rebase sem pedir. Commits no estilo do histórico: `feat(core): …`, `feat(ui): …`, `chore: …`, em pt-BR, minúsculo, descrevendo a entrega e não o arquivo. Não faça `push` de força em `master`

## Docs

### Domínio (leia antes de mexer em regra de pontuação)

- [CONTEXT.md](CONTEXT.md) — glossário. Todo termo do domínio, com os sinônimos proibidos
- [Especificação do SSS](docs/silas-score-system.md) — os números: catálogo, Faixas, Teto, compatibilidade, algoritmo, exemplos trabalhados
- [Design de implementação](docs/superpowers/specs/2026-08-01-painel-sss-design.md) — por que a stack é esta, por que existem três rotas, o que ficou fora de escopo
- [ADRs](docs/adr/) — as cinco decisões de domínio que antecedem o código

### Implementação

- [Architecture](docs/agents/architecture.md) — leia ao navegar o código ou adicionar feature; mapa de arquivos, símbolos, fluxo de dados, as três rotas
- [Conventions](docs/agents/conventions.md) — leia ao escrever código; camadas, idioma, checklists de Evento novo / Modificador novo / número mudado
- [Commands](docs/agents/commands.md) — leia ao rodar, testar ou fazer deploy; inclui a única variável de ambiente
- [Testing](docs/agents/testing.md) — leia ao escrever teste; o que cada grupo cobre e por que nenhum precisa de banco
- [Decisions](docs/agents/decisions.md) — **leia antes de "consertar" um padrão estranho**; documenta as escolhas intencionais de implementação
