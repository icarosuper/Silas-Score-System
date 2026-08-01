import type { Channel, Measures, Occurrence } from '../core/types'

/**
 * §5 — os últimos 6 Dias de calendário mais a Ocorrência imediatamente anterior
 * a eles, numa query só. `?1 = today − 5`.
 *
 * O primeiro ramo traz a mensagem anterior à janela: sem ela, o Gap de Tempo da
 * primeira Ocorrência da janela não teria de onde ser medido, e `Assombração`
 * — o chefe ressuscitando — nunca pontuaria. O `limit 1` obriga o subselect: o
 * SQLite não aceita `order by`/`limit` num ramo de compound select. ADR 0005.
 */
export const WINDOW_SQL = `
select * from (select * from occurrences where day < ?1 order by day desc, occurred_at desc, id desc limit 1)
union all
select * from occurrences where day >= ?1
order by day, occurred_at, id
`

export type Row = {
	id: string
	occurred_at: number
	day: string
	event: string
	channel: string
	author: string
	measures: string
}

export const toOccurrence = (r: Row): Occurrence => ({
	id: r.id,
	occurredAt: r.occurred_at,
	day: r.day,
	event: r.event,
	channel: r.channel as Channel,
	author: r.author,
	measures: JSON.parse(r.measures) as Measures
})

export const TOKEN_SQL = 'select max(rowid) as top from occurrences'

export const INSERT_SQL =
	'insert into occurrences (id, occurred_at, day, event, channel, author, measures) values (?1, ?2, ?3, ?4, ?5, ?6, ?7)'
