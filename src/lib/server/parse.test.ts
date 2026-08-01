import { expect, test } from 'bun:test'
import { MEASURE_CAP, parseInput, todayInSaoPaulo } from './parse'

const ok = (fields: Record<string, string>) => {
	const r = parseInput(fields)
	if (!r.ok) throw new Error(`esperava aceitar, veio: ${r.error}`)
	return r.value
}
const err = (fields: Record<string, string>) => {
	const r = parseInput(fields)
	expect(r.ok).toBe(false)
	return r.ok ? '' : r.error
}

test('corpo mínimo válido', () => {
	expect(ok({ event: 'deployed-yet', channel: 'text' })).toEqual({
		event: 'deployed-yet',
		channel: 'text',
		measures: {}
	})
})

test('event fora do catálogo', () => {
	expect(err({ event: 'nao-existe', channel: 'text' })).toMatch(/event/)
	expect(err({ channel: 'text' })).toMatch(/event/)
})

test('channel fora do enum de quatro', () => {
	expect(err({ event: 'deployed-yet', channel: 'whatsapp' })).toMatch(/channel/)
	expect(err({ event: 'deployed-yet' })).toMatch(/channel/)
})

test('chave de medida desconhecida', () => {
	expect(err({ event: 'deployed-yet', channel: 'text', vibe: '3' })).toMatch(/vibe/)
})

test.each([
	['-1', /inteir|negativ|>= 0/],
	['1.5', /inteir/],
	['abc', /inteir/],
	[String(MEASURE_CAP + 1), /teto/]
])('medida numérica inválida: %p', (value, pattern) => {
	expect(err({ event: 'deployed-yet', channel: 'text', laughter: value as string })).toMatch(
		pattern as RegExp
	)
})

test('o teto sanitário é aceito na borda', () => {
	expect(ok({ event: 'deployed-yet', channel: 'text', laughter: String(MEASURE_CAP) })).toMatchObject({
		measures: { laughter: MEASURE_CAP }
	})
})

test('campo numérico vazio é ausência, não erro', () => {
	expect(ok({ event: 'deployed-yet', channel: 'text', laughter: '', punctuation: '0' })).toEqual({
		event: 'deployed-yet',
		channel: 'text',
		measures: { punctuation: 0 }
	})
})

test('checkbox marcado vira true; ausente não entra', () => {
	expect(ok({ event: 'deployed-yet', channel: 'text', urgency: 'on' }).measures).toEqual({
		urgency: true
	})
	expect(ok({ event: 'deployed-yet', channel: 'text', urgency: 'false' }).measures).toEqual({
		urgency: false
	})
	expect(ok({ event: 'deployed-yet', channel: 'text' }).measures).toEqual({})
})

test('valor não-booleano num campo binário é erro', () => {
	expect(err({ event: 'deployed-yet', channel: 'text', urgency: '7' })).toMatch(/urgency/)
})

// §6 do design — a validação é estrutural, não semântica
test('medida incompatível é ACEITA: é Descarte, não erro', () => {
	expect(ok({ event: 'boob', channel: 'sticker', overtime: '30' }).measures).toEqual({ overtime: 30 })
})

test('medida derivada informada é ACEITA: é Descarte, não erro', () => {
	expect(
		ok({ event: 'deployed-yet', channel: 'text', gap: '400', combo: '3', ghostingStreak: '2' })
			.measures
	).toEqual({ gap: 400, combo: 3, ghostingStreak: 2 })
})

test('todos os quatro Canais passam', () => {
	for (const channel of ['text', 'sticker', 'voice', 'meeting'])
		expect(ok({ event: 'deployed-yet', channel }).channel).toBe(channel as never)
})

test('o Dia é America/Sao_Paulo, não UTC', () => {
	// 2026-08-02T02:00Z são 23h do dia 1 em São Paulo
	expect(todayInSaoPaulo(Date.parse('2026-08-02T02:00:00Z'))).toBe('2026-08-01')
	expect(todayInSaoPaulo(Date.parse('2026-08-02T03:00:00Z'))).toBe('2026-08-02')
	expect(todayInSaoPaulo(Date.parse('2026-08-01T23:47:00-03:00'))).toBe('2026-08-01')
})
