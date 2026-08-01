import { expect, test } from 'bun:test'
import { scoreOccurrence } from './score'
import type { Channel, Derived, Measures, Modifier, Occurrence } from './types'

const NO_DERIVED: Derived = { gapMinutes: null, comboNth: 1, ghostingDays: 0 }

const occ = (event: string, channel: Channel, measures: Measures = {}): Occurrence => ({
	id: 'o1',
	occurredAt: 0,
	day: '2026-08-01',
	event,
	channel,
	author: 'a@b.c',
	measures
})

/** As linhas de Modificador, como `modificador → [Faixa|null, bônus, valor]`. */
const mods = (lines: { modifier?: Modifier; band?: string; bonus?: number; value: number }[]) =>
	Object.fromEntries(
		lines.filter((l) => l.modifier).map((l) => [l.modifier, [l.band ?? null, l.bonus, l.value]])
	)

// ---------------------------------------------------------------- §10 goldens

test('§10.1 AMANHÃ????? — caso comum', () => {
	const { receipt, discards } = scoreOccurrence(
		occ('tomorrow', 'text', { punctuation: 5, urgency: true }),
		{ gapMinutes: 17 * 60 + 45, comboNth: 1, ghostingDays: 0 }
	)
	expect(receipt.lines[0]).toMatchObject({ label: 'Base (Raro)', value: 30 })
	expect(mods(receipt.lines)).toEqual({
		punctuation: ['Ansiedade', 0.2, 6],
		urgency: [null, 0.4, 12],
		gap: ['Reaparecimento', 0.35, 11]
	})
	expect(receipt.score).toBe(59)
	expect(receipt.multiplier).toBeCloseTo(1.95, 10)
	expect(receipt.capped).toBe(false)
	expect(discards).toEqual([])
})

test('§10.2 Lá vem a bíblia... — Combo e Vácuo', () => {
	const { receipt } = scoreOccurrence(occ('here-comes-the-bible', 'text'), {
		gapMinutes: 3 * 60 + 28,
		comboNth: 2,
		ghostingDays: 3
	})
	expect(receipt.lines[0].value).toBe(200)
	expect(mods(receipt.lines)).toEqual({
		gap: ['Reaparecimento', 0.35, 70],
		ghostingStreak: ['Fuga', 0.55, 110],
		combo: ['Insistência', 0.2, 40]
	})
	expect(receipt.score).toBe(420)
	expect(receipt.multiplier).toBeCloseTo(2.1, 10)
	expect(receipt.capped).toBe(false)
})

test('§10.3 Sabe que não vou ler nada... — Teto mordendo', () => {
	const { receipt } = scoreOccurrence(
		occ('wont-read-any-of-it', 'text', { laughter: 5, punctuation: 3, urgency: true }),
		{ gapMinutes: 180, comboNth: 5, ghostingDays: 5 }
	)
	expect(receipt.lines[0].value).toBe(80)
	expect(mods(receipt.lines)).toEqual({
		laughter: ['Deboche', 0.2, 16],
		punctuation: ['Ênfase', 0.1, 8],
		urgency: [null, 0.4, 32],
		gap: ['Reaparecimento', 0.35, 28],
		combo: ['Assédio', 0.75, 60],
		ghostingStreak: ['Desaparecido', 0.9, 72]
	})
	const cap = receipt.lines.at(-1)!
	expect(cap.label).toBe('Teto (3×)')
	expect(cap.value).toBe(-56)
	expect(receipt.score).toBe(240)
	expect(receipt.multiplier).toBe(3)
	expect(receipt.capped).toBe(true)
})

test('§10.4 Teta — Descartes', () => {
	const { receipt, discards } = scoreOccurrence(
		occ('boob', 'sticker', { urgency: true, laughter: 4, overtime: 30 }),
		{ gapMinutes: 25, comboNth: 1, ghostingDays: 0 }
	)
	expect(receipt.lines[0].value).toBe(10)
	expect(mods(receipt.lines)).toEqual({
		urgency: [null, 0.4, 4],
		gap: ['Retomada', 0.15, 2]
	})
	expect(receipt.score).toBe(16)
	expect(receipt.multiplier).toBeCloseTo(1.55, 10)
	expect(discards).toEqual([
		{ occurrenceId: 'o1', modifier: 'laughter', reason: 'canal-incompatível' },
		{ occurrenceId: 'o1', modifier: 'overtime', reason: 'canal-incompatível' }
	])
})

// ------------------------------------------------------------------ invariantes

test('as linhas somam exatamente o Score, com e sem Teto', () => {
	const cases: [string, Channel, Measures, Derived][] = [
		['tomorrow', 'text', { punctuation: 5, urgency: true }, { gapMinutes: 1065, comboNth: 1, ghostingDays: 0 }],
		['wont-read-any-of-it', 'text', { laughter: 5, punctuation: 3, urgency: true }, { gapMinutes: 180, comboNth: 5, ghostingDays: 5 }],
		['boob', 'sticker', { urgency: true }, { gapMinutes: 25, comboNth: 3, ghostingDays: 0 }],
		['censored', 'voice', {}, { gapMinutes: 5000, comboNth: 6, ghostingDays: 0 }],
		['stretch-the-meeting', 'meeting', { overtime: 90 }, { gapMinutes: 99999, comboNth: 2, ghostingDays: 0 }]
	]
	for (const [event, channel, measures, derived] of cases) {
		const { receipt } = scoreOccurrence(occ(event, channel, measures), derived)
		const sum = receipt.lines.reduce((a, l) => a + l.value, 0)
		expect([event, sum]).toEqual([event, receipt.score])
	}
})

test('Teto não morde quando Σ bônus ≤ 2', () => {
	// Épico com exatamente +200%: 80 × 3 = 240, sem linha de Teto
	const { receipt } = scoreOccurrence(
		occ('wont-read-any-of-it', 'text', { laughter: 9, urgency: true }),
		{ gapMinutes: 5, comboNth: 3, ghostingDays: 5 }
	)
	// 0,35 + 0,40 + 0,45 + 0,90 = 2,10 → morde
	expect(receipt.capped).toBe(true)

	const solto = scoreOccurrence(occ('warron', 'text', { laughter: 1 }), NO_DERIVED)
	expect(solto.receipt.capped).toBe(false)
	expect(solto.receipt.score).toBe(220)
})

test('Faixa sem bônus não gera linha e não é Descarte (§5)', () => {
	const { receipt, discards } = scoreOccurrence(occ('deployed-yet', 'text', { laughter: 0, punctuation: 1 }), {
		gapMinutes: 8,
		comboNth: 1,
		ghostingDays: 0
	})
	expect(receipt.lines).toHaveLength(1)
	expect(receipt.score).toBe(10)
	expect(discards).toEqual([])
})

test('arredondamento meio para cima, por linha', () => {
	// Comum + Gap Retomada: 10 × 0,15 = 1,5 → 2
	const { receipt } = scoreOccurrence(occ('boob', 'sticker'), {
		gapMinutes: 25,
		comboNth: 1,
		ghostingDays: 0
	})
	expect(receipt.score).toBe(12)
})

// -------------------------------------------------------------------- Descartes

test('medida derivada informada vira Descarte (§8.4)', () => {
	// numa Ocorrência de Vácuo por Texto os três derivados são compatíveis,
	// então o motivo isola a regra de "o chamador não informa derivada"
	const { receipt, discards } = scoreOccurrence(
		occ('here-comes-the-bible', 'text', { gap: 300, combo: 4, ghostingStreak: 9, urgency: true }),
		NO_DERIVED
	)
	expect(discards.map((d) => d.modifier).sort()).toEqual(['combo', 'gap', 'ghostingStreak'])
	expect(discards.every((d) => d.reason === 'medida-derivada-informada')).toBe(true)
	// o valor informado é ignorado; o derivado (NO_DERIVED) é que vale
	expect(mods(receipt.lines)).toEqual({ urgency: [null, 0.4, 80] })
})

test('incompatibilidade vence a regra de derivada (§9 passo 4 é ordenado)', () => {
	// Sequência de Vácuo informada fora da Categoria Vácuo: o motivo é a Categoria
	const { discards } = scoreOccurrence(occ('deployed-yet', 'text', { ghostingStreak: 9 }), NO_DERIVED)
	expect(discards).toEqual([
		{ occurrenceId: 'o1', modifier: 'ghostingStreak', reason: 'categoria-incompatível' }
	])
	// Gap informado numa Reunião: o motivo é o Canal
	const naReuniao = scoreOccurrence(occ('stretch-the-meeting', 'meeting', { gap: 300 }), NO_DERIVED)
	expect(naReuniao.discards[0].reason).toBe('canal-incompatível')
})

test('Do nada em Categoria que não aciona vira categoria-incompatível (§6.2)', () => {
	const { receipt, discards } = scoreOccurrence(
		occ('deployed-yet', 'text', { outOfNowhere: true }),
		NO_DERIVED
	)
	expect(discards).toEqual([
		{ occurrenceId: 'o1', modifier: 'outOfNowhere', reason: 'categoria-incompatível' }
	])
	expect(receipt.score).toBe(10)
})

test('Do nada vale nas três Categorias que acionam, em qualquer Canal', () => {
	for (const [event, channel] of [
		['come-here', 'text'],
		['call-the-phone', 'voice'],
		['tomorrow', 'meeting']
	] as [string, Channel][]) {
		const { discards, receipt } = scoreOccurrence(occ(event, channel, { outOfNowhere: true }), NO_DERIVED)
		expect([event, discards]).toEqual([event, []])
		expect(mods(receipt.lines).outOfNowhere).toEqual([null, 0.5, expect.any(Number)])
	}
})

test('Canal é checado antes de Categoria (§9 passo 4)', () => {
	// Enrolação numa figurinha: incompatível com o Canal
	const { discards } = scoreOccurrence(occ('boob', 'sticker', { overtime: 10 }), NO_DERIVED)
	expect(discards[0].reason).toBe('canal-incompatível')
})

test('medida zero/falsa não é Descarte mesmo sendo incompatível', () => {
	const { discards } = scoreOccurrence(
		occ('boob', 'sticker', { laughter: 0, overtime: 0, outOfNowhere: false }),
		NO_DERIVED
	)
	expect(discards).toEqual([])
})

test('Gap ausente não gera linha nem Descarte', () => {
	const { receipt, discards } = scoreOccurrence(occ('deployed-yet', 'text'), NO_DERIVED)
	expect(receipt.lines).toHaveLength(1)
	expect(discards).toEqual([])
})

test('Vácuo pontua Sequência; outra Categoria nem com o mesmo derivado', () => {
	const comVacuo = scoreOccurrence(occ('here-comes-the-bible', 'text'), {
		gapMinutes: null,
		comboNth: 1,
		ghostingDays: 5
	})
	expect(mods(comVacuo.receipt.lines).ghostingStreak).toEqual(['Desaparecido', 0.9, 180])

	const semVacuo = scoreOccurrence(occ('deployed-yet', 'text'), {
		gapMinutes: null,
		comboNth: 1,
		ghostingDays: 5
	})
	expect(mods(semVacuo.receipt.lines).ghostingStreak).toBeUndefined()
	expect(semVacuo.discards).toEqual([]) // não foi informado, então não há o que descartar
})

test('Reunião não pontua Gap mesmo com derivado presente', () => {
	const { receipt, discards } = scoreOccurrence(occ('stretch-the-meeting', 'meeting'), {
		gapMinutes: 9999,
		comboNth: 1,
		ghostingDays: 0
	})
	expect(mods(receipt.lines).gap).toBeUndefined()
	expect(discards).toEqual([])
})
