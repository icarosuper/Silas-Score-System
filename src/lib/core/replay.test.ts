import { expect, test } from 'bun:test'
import { replay } from './replay'
import type { Channel, Entry, Measures, Modifier, Occurrence } from './types'

/** Instante em America/Sao_Paulo (UTC−3, sem horário de verão desde 2019). */
const at = (day: string, time: string) => Date.parse(`${day}T${time}:00-03:00`)

let n = 0
const o = (
	day: string,
	time: string,
	event: string,
	channel: Channel = 'text',
	measures: Measures = {}
): Occurrence => ({
	id: `o${++n}`,
	occurredAt: at(day, time),
	day,
	event,
	channel,
	author: 'a@b.c',
	measures
})

const lineFor = (entry: Entry, modifier: Modifier) =>
	entry.receipt.lines.find((l) => l.modifier === modifier)

// ------------------------------------------------------------------- vazio

test('log vazio', () => {
	const r = replay([], '2026-08-01')
	expect(r).toMatchObject({
		day: '2026-08-01',
		entries: [],
		discards: [],
		total: 0,
		classification: 'Silêncio Suspeito',
		highlight: null,
		ghostingDays: 0
	})
})

test('primeira Ocorrência do log não tem Gap', () => {
	const r = replay([o('2026-08-01', '10:00', 'deployed-yet')], '2026-08-01')
	expect(lineFor(r.entries[0], 'gap')).toBeUndefined()
	expect(r.entries[0].receipt.score).toBe(10)
})

// ------------------------------------------------------------------- Combo

test('Combo conta por Categoria, não por Evento (§5)', () => {
	const r = replay(
		[
			o('2026-08-01', '09:12', 'how-are-we'),
			o('2026-08-01', '09:31', 'all-at-home'),
			o('2026-08-01', '09:48', 'deployed-yet')
		],
		'2026-08-01'
	)
	expect(r.entries.map((e) => lineFor(e, 'combo')?.band ?? null)).toEqual([
		null,
		'Insistência',
		'Perseguição'
	])
})

test('Combo zera na virada do Dia', () => {
	const r = replay(
		[
			o('2026-07-31', '09:00', 'how-are-we'),
			o('2026-07-31', '10:00', 'deployed-yet'),
			o('2026-08-01', '09:00', 'all-at-home')
		],
		'2026-08-01'
	)
	expect(r.entries).toHaveLength(1)
	expect(lineFor(r.entries[0], 'combo')).toBeUndefined()
})

// ---------------------------------------------------------- virada do Dia

test('Gap atravessa a meia-noite — o caso das 23h47', () => {
	const r = replay(
		[o('2026-07-31', '23:47', 'deployed-yet'), o('2026-08-01', '09:05', 'still-off')],
		'2026-08-01'
	)
	expect(r.entries).toHaveLength(1)
	expect(lineFor(r.entries[0], 'gap')).toMatchObject({ band: 'Reaparecimento', bonus: 0.35 })
})

test('toda Ocorrência move o marcador de Gap, inclusive Reunião', () => {
	const r = replay(
		[
			o('2026-08-01', '08:00', 'deployed-yet'),
			o('2026-08-01', '09:00', 'stretch-the-meeting', 'meeting', { overtime: 30 }),
			o('2026-08-01', '09:20', 'how-are-we')
		],
		'2026-08-01'
	)
	// a reunião não pontuou Gap...
	expect(lineFor(r.entries[1], 'gap')).toBeUndefined()
	// ...mas zerou o silêncio: 20 min desde ela, e não 80 min desde a primeira
	expect(lineFor(r.entries[2], 'gap')).toMatchObject({ band: 'Retomada' })
})

// -------------------------------------------------------- Sequência de Vácuo

test('escada de vácuo 1 → 2 → 0 → 1 (§7.3)', () => {
	const log = [
		o('2026-07-28', '10:00', 'here-comes-the-bible'),
		o('2026-07-29', '10:00', 'here-comes-the-bible'),
		// 2026-07-30 sem nenhuma Ocorrência de Vácuo
		o('2026-07-30', '10:00', 'deployed-yet'),
		o('2026-07-31', '10:00', 'here-comes-the-bible')
	]
	expect(replay(log.slice(0, 1), '2026-07-28').ghostingDays).toBe(1)
	expect(replay(log.slice(0, 2), '2026-07-29').ghostingDays).toBe(2)
	expect(replay(log, '2026-07-31').ghostingDays).toBe(1)
	// e o bônus acompanha: no Dia 2 é Reincidência, no Dia 4 não há Faixa
	expect(lineFor(replay(log.slice(0, 2), '2026-07-29').entries[0], 'ghostingStreak')).toMatchObject({
		band: 'Reincidência'
	})
	expect(lineFor(replay(log, '2026-07-31').entries[0], 'ghostingStreak')).toBeUndefined()
})

test('Dia sem nenhuma Ocorrência zera o contador de vácuo', () => {
	const log = [
		o('2026-07-28', '10:00', 'here-comes-the-bible'),
		o('2026-07-29', '10:00', 'here-comes-the-bible'),
		// 2026-07-30 e 2026-07-31 vazios: a fold itera os Dias do calendário
		o('2026-08-01', '10:00', 'here-comes-the-bible')
	]
	expect(replay(log, '2026-08-01').ghostingDays).toBe(1)
})

test('só a primeira Ocorrência de Vácuo do Dia incrementa', () => {
	const log = [
		o('2026-07-31', '09:00', 'here-comes-the-bible'),
		o('2026-07-31', '10:00', 'wont-read-any-of-it'),
		o('2026-08-01', '09:00', 'here-comes-the-bible'),
		o('2026-08-01', '10:00', 'wont-read-any-of-it')
	]
	expect(replay(log, '2026-08-01').ghostingDays).toBe(2)
})

// ------------------------------------------------- linha anterior à janela

test('a linha anterior à janela ancora o Assombração e não aparece na saída', () => {
	const r = replay(
		[
			o('2026-06-01', '14:00', 'deployed-yet'), // 61 dias atrás
			o('2026-08-01', '10:00', 'still-off')
		],
		'2026-08-01'
	)
	expect(r.entries).toHaveLength(1)
	expect(r.entries[0].occurrence.event).toBe('still-off')
	expect(lineFor(r.entries[0], 'gap')).toMatchObject({ band: 'Assombração', bonus: 0.9 })
})

test('os Dias vazios entre a linha anterior e a janela zeram o vácuo', () => {
	const r = replay(
		[
			o('2026-06-01', '14:00', 'here-comes-the-bible'), // seria vácuo dia 1...
			o('2026-08-01', '10:00', 'here-comes-the-bible')
		],
		'2026-08-01'
	)
	// ...mas dois meses de silêncio zeraram: hoje é o Dia 1 de novo
	expect(r.ghostingDays).toBe(1)
	expect(lineFor(r.entries[0], 'ghostingStreak')).toBeUndefined()
})

test('a linha anterior conta Combo no Dia dela, não no de hoje', () => {
	const r = replay(
		[
			o('2026-07-20', '10:00', 'deployed-yet'),
			o('2026-08-01', '10:00', 'how-are-we')
		],
		'2026-08-01'
	)
	expect(lineFor(r.entries[0], 'combo')).toBeUndefined()
})

// ------------------------------------------------------------------- o Dia

test('Total, Classificação e Destaque do Dia', () => {
	const r = replay(
		[
			o('2026-08-01', '09:00', 'deployed-yet'), // Comum 10
			o('2026-08-01', '10:00', 'warron'), // Lendário 200 + Retomada? 60 min → Retomada +15% = 30
			o('2026-08-01', '10:30', 'boob', 'sticker') // Comum 10 + Retomada 15% → 2
		],
		'2026-08-01'
	)
	expect(r.entries.map((e) => e.receipt.score)).toEqual([10, 230, 12])
	expect(r.total).toBe(252)
	expect(r.classification).toBe('Silêncio Suspeito')
	expect(r.highlight?.occurrence.event).toBe('warron')
})

test('Classificação sobe ao vivo conforme o Dia avança (§8.3)', () => {
	// mesmo instante em todas: sem Gap; Categorias distintas: sem Combo.
	// Cada uma é Lendário pelado = 200.
	const solo = ['warron', 'still-at-lunch', 'not-a-democracy', 'call-the-phone']
	const log = solo.map((e) => o('2026-08-01', '10:00', e))
	expect(log.map((_, i) => replay(log.slice(0, i + 1), '2026-08-01')).map((r) => [r.total, r.classification])).toEqual([
		[200, 'Silêncio Suspeito'],
		[400, 'Dia Normal'],
		[600, 'Dia Normal'],
		[800, 'Dia Pesado']
	])
})

// -------------------------------------------------------------- Descartes

test('os Descartes da saída são só os do Dia corrente', () => {
	const r = replay(
		[
			o('2026-07-31', '10:00', 'boob', 'sticker', { overtime: 5 }),
			o('2026-08-01', '10:00', 'boob', 'sticker', { laughter: 3 })
		],
		'2026-08-01'
	)
	expect(r.discards).toEqual([
		{ occurrenceId: r.entries[0].occurrence.id, modifier: 'laughter', reason: 'canal-incompatível' }
	])
})
