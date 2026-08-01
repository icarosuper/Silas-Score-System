/**
 * A SQL da janela contra um SQLite de verdade. O core não precisa de banco, mas
 * esta query precisa: o `union all` com `limit` num subselect e o `order by`
 * global são exatamente onde um erro passaria despercebido.
 */
import { Database } from 'bun:sqlite'
import { expect, test } from 'bun:test'
import { INSERT_SQL, TOKEN_SQL, WINDOW_SQL, toOccurrence, type Row } from './window'
import { addDays } from '../core/replay'

const SCHEMA = await Bun.file(new URL('../../../schema.sql', import.meta.url)).text()

const at = (day: string, time: string) => Date.parse(`${day}T${time}:00-03:00`)

function seeded(rows: [string, string, string][]) {
	const db = new Database(':memory:')
	db.run(SCHEMA)
	const insert = db.prepare(INSERT_SQL)
	rows.forEach(([day, time, id]) =>
		insert.run(id, at(day, time), day, 'deployed-yet', 'text', 'a@b.c', '{}')
	)
	return db
}

const windowFrom = (db: Database, today: string) =>
	db.query<Row, [string]>(WINDOW_SQL).all(addDays(today, -5))

test('a janela traz os 6 Dias mais a linha imediatamente anterior', () => {
	const db = seeded([
		['2026-06-01', '14:00', 'antiga-1'],
		['2026-07-20', '10:00', 'anterior'], // a última fora da janela
		['2026-07-27', '09:00', 'dentro-1'], // today − 5
		['2026-08-01', '10:00', 'dentro-2']
	])
	expect(windowFrom(db, '2026-08-01').map((r) => r.id)).toEqual([
		'anterior',
		'dentro-1',
		'dentro-2'
	])
})

test('sem nada antes da janela, a query devolve só a janela', () => {
	const db = seeded([['2026-07-30', '10:00', 'a']])
	expect(windowFrom(db, '2026-08-01').map((r) => r.id)).toEqual(['a'])
})

test('tabela vazia devolve nada', () => {
	expect(windowFrom(seeded([]), '2026-08-01')).toEqual([])
})

test('a linha anterior é a mais recente, com id como desempate', () => {
	const db = seeded([
		['2026-07-20', '10:00', 'b'],
		['2026-07-20', '10:00', 'a'] // mesmo instante
	])
	expect(windowFrom(db, '2026-08-01').map((r) => r.id)).toEqual(['b'])
})

test('a saída sai na ordem canônica day, occurred_at, id', () => {
	const db = seeded([
		['2026-07-31', '10:00', 'z'],
		['2026-07-31', '10:00', 'a'],
		['2026-07-30', '23:59', 'm'],
		['2026-08-01', '00:01', 'c']
	])
	expect(windowFrom(db, '2026-08-01').map((r) => r.id)).toEqual(['m', 'a', 'z', 'c'])
})

test('o change-token cresce a cada insert e nunca decresce', () => {
	const db = seeded([])
	const top = () => db.query<{ top: number | null }, []>(TOKEN_SQL).get()!.top
	expect(top()).toBe(null)
	db.prepare(INSERT_SQL).run('a', 1, '2026-08-01', 'deployed-yet', 'text', 'x@y.z', '{}')
	const first = top()!
	db.prepare(INSERT_SQL).run('b', 2, '2026-08-01', 'deployed-yet', 'text', 'x@y.z', '{}')
	expect(top()!).toBeGreaterThan(first)
})

test('a linha volta como Occurrence, com measures desserializado', () => {
	const db = seeded([])
	db.prepare(INSERT_SQL).run(
		'a',
		1,
		'2026-08-01',
		'boob',
		'sticker',
		'x@y.z',
		JSON.stringify({ urgency: true, laughter: 4 })
	)
	expect(toOccurrence(windowFrom(db, '2026-08-01')[0])).toEqual({
		id: 'a',
		occurredAt: 1,
		day: '2026-08-01',
		event: 'boob',
		channel: 'sticker',
		author: 'x@y.z',
		measures: { urgency: true, laughter: 4 }
	})
})

test('o índice (day, occurred_at) cobre os dois ramos da janela', () => {
	const db = seeded([['2026-07-20', '10:00', 'a']])
	const plan = db
		.query<{ detail: string }, [string]>(`explain query plan ${WINDOW_SQL}`)
		.all('2026-07-27')
		.map((r) => r.detail)
		.join(' | ')
	expect(plan).toContain('idx_occurrences_day')
	expect(plan).not.toContain('SCAN occurrences')
})
