# Silas

Painel do **Silas Score System** — um placar cômico de simulador de trabalho em escritório. Alguém vê o chefe (Silas) aprontar, registra no celular, e o painel diz quanto aquilo valeu.

O Score não mede o desempenho de ninguém: mede o absurdo coletado. Quanto maior, pior foi o dia — e melhor pro placar.

```
Base (Raro)                    30
Pontuação Excessiva: Ansiedade (+20%)    +6
Urgência                     (+40%)   +12
Gap de Tempo: Reaparecimento (+35%)   +11
──────────────────────────────────────────
Score                        1.95×    59
```

## Como funciona

Uma página, um banco, três rotas. Registrar é escolher Categoria, Evento, Canal e preencher as medidas que aquela combinação aceita. O painel mostra o Extrato do que você acabou de registrar, o total do Dia com sua Classificação, e o Destaque.

O banco guarda só o log de Ocorrências: **a pontuação não é armazenada**, é recalculada a cada carregamento. Mudar uma regra é editar um número — todo o histórico é reinterpretado junto.

## Stack

SvelteKit 2 + Svelte 5 na Cloudflare Workers, D1 (SQLite por binding), Tailwind, Bun. Auth é Cloudflare Access: identidade real, zero linhas de código. **Nenhuma dependência de runtime além do framework** — sem ORM, sem lib de auth, sem roteador.

## Rodando local

```sh
bun install
cp .dev.vars.example .dev.vars   # e ponha seu e-mail em DEV_AUTHOR
bun run db:init
bun run dev
```

O D1 local é um arquivo SQLite em `.wrangler/state/`. Resetar é apagar a pasta.

```sh
bun test        # nenhum teste precisa de banco nem de wrangler
bun run check
bun run deploy
```

Deploy e setup da nuvem: [docs/agents/commands.md](docs/agents/commands.md).

## Documentação

| | |
|---|---|
| [CONTEXT.md](CONTEXT.md) | Glossário do domínio |
| [Especificação do SSS](docs/silas-score-system.md) | As regras e os números: catálogo, Faixas, Teto, algoritmo |
| [Design de implementação](docs/superpowers/specs/2026-08-01-painel-sss-design.md) | Por que esta stack, por que três rotas, o que ficou fora |
| [ADRs](docs/adr/) | As decisões de domínio |
| [docs/agents/](docs/agents/) | Arquitetura, convenções, comandos, testes e decisões de implementação |
| [CLAUDE.md](CLAUDE.md) | Ponto de entrada para trabalho assistido por IA |
