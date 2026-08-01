import { expect, test } from 'bun:test'
import { CHANNELS, MODIFIERS, allowedModifiers, band, BANDS, BINARY_BONUS, classify } from './tables'
import type { CategoryKey, Channel, Modifier } from './types'

// §6.3 — a matriz varrida. `~` vira uma linha por Canal, então cada célula é
// uma pergunta concreta: este Modificador vale nesta Categoria neste Canal?
const M: Modifier[] = [
	'laughter',
	'punctuation',
	'urgency',
	'gap',
	'combo',
	'overtime',
	'outOfNowhere',
	'ghostingStreak'
]

// Por Canal: quais dos oito são possíveis (§6.1), antes da restrição por Categoria
const BY_CHANNEL: Record<Channel, Modifier[]> = {
	text: ['laughter', 'punctuation', 'urgency', 'gap', 'combo', 'outOfNowhere', 'ghostingStreak'],
	sticker: ['urgency', 'gap', 'combo', 'outOfNowhere', 'ghostingStreak'],
	voice: ['gap', 'combo', 'outOfNowhere', 'ghostingStreak'],
	meeting: ['combo', 'overtime', 'outOfNowhere', 'ghostingStreak']
}

// §6.2 — as duas únicas restrições por Categoria
const OUT_OF_NOWHERE_CATEGORIES = ['meeting-summons', 'phone-call', 'deadline-push']

test('§6.1 — compatibilidade por Canal, célula a célula', () => {
	for (const channel of CHANNELS) {
		for (const m of M) {
			// ghosting é a única Categoria onde ghostingStreak sobrevive; usamos ela
			// pra isolar o eixo Canal do eixo Categoria
			const allowed = allowedModifiers('ghosting', channel)
			const expected = BY_CHANNEL[channel].includes(m) && m !== 'outOfNowhere'
			expect([channel, m, allowed.includes(m)]).toEqual([channel, m, expected])
		}
	}
})

test('§6.2 — Sequência de Vácuo só existe na Categoria Vácuo', () => {
	for (const channel of CHANNELS) {
		expect(allowedModifiers('ghosting', channel)).toContain('ghostingStreak')
		expect(allowedModifiers('status-check', channel)).not.toContain('ghostingStreak')
		expect(allowedModifiers('blunder', channel)).not.toContain('ghostingStreak')
	}
})

test('§6.2 — Do nada só nas três Categorias que acionam', () => {
	const categories: CategoryKey[] = [
		'status-check',
		'online-presence',
		'deadline-push',
		'call-nagging',
		'meeting-summons',
		'blunder',
		'ghosting',
		'censored-word',
		'sticker',
		'motivational',
		'demotivational',
		'meeting-overrun',
		'phone-call'
	]
	for (const c of categories) {
		for (const channel of CHANNELS) {
			expect([c, allowedModifiers(c, channel).includes('outOfNowhere')]).toEqual([
				c,
				OUT_OF_NOWHERE_CATEGORIES.includes(c)
			])
		}
	}
})

// §6.3 — as linhas de Canal fixo da matriz, literais
test.each([
	['call-nagging', 'meeting', ['combo', 'overtime']],
	['meeting-overrun', 'meeting', ['combo', 'overtime']],
	['sticker', 'sticker', ['urgency', 'gap', 'combo']],
	['phone-call', 'voice', ['gap', 'combo', 'outOfNowhere']],
	['status-check', 'text', ['laughter', 'punctuation', 'urgency', 'gap', 'combo']],
	['online-presence', 'text', ['laughter', 'punctuation', 'urgency', 'gap', 'combo']],
	['ghosting', 'text', ['laughter', 'punctuation', 'urgency', 'gap', 'combo', 'ghostingStreak']],
	[
		'deadline-push',
		'text',
		['laughter', 'punctuation', 'urgency', 'gap', 'combo', 'outOfNowhere']
	],
	['deadline-push', 'meeting', ['combo', 'overtime', 'outOfNowhere']],
	['meeting-summons', 'text', ['laughter', 'punctuation', 'urgency', 'gap', 'combo', 'outOfNowhere']],
	['blunder', 'meeting', ['combo', 'overtime']],
	['censored-word', 'voice', ['gap', 'combo']],
	['motivational', 'sticker', ['urgency', 'gap', 'combo']],
	['demotivational', 'text', ['laughter', 'punctuation', 'urgency', 'gap', 'combo']]
])('§6.3 matriz: %s em %s', (category, channel, expected) => {
	expect(allowedModifiers(category as CategoryKey, channel as Channel).sort()).toEqual(
		[...(expected as string[])].sort() as Modifier[]
	)
})

test('MODIFIERS tem os oito', () => {
	expect([...MODIFIERS].sort()).toEqual([...M].sort())
})

// §5 — Faixa é limite inferior; abaixo do primeiro não aplica
test.each([
	['laughter', 0, null],
	['laughter', 1, 0.1],
	['laughter', 2, 0.1],
	['laughter', 3, 0.2],
	['laughter', 8, 0.2],
	['laughter', 9, 0.35],
	['laughter', 900, 0.35],
	['punctuation', 1, null],
	['punctuation', 2, 0.1],
	['punctuation', 3, 0.1],
	['punctuation', 4, 0.2],
	['punctuation', 6, 0.2],
	['punctuation', 7, 0.35],
	['gap', 14, null],
	['gap', 15, 0.15],
	['gap', 119, 0.15],
	['gap', 120, 0.35],
	['gap', 1439, 0.35],
	['gap', 1440, 0.6],
	['gap', 4319, 0.6],
	['gap', 4320, 0.9],
	['gap', 43200, 0.9],
	['combo', 1, null],
	['combo', 2, 0.2],
	['combo', 3, 0.45],
	['combo', 4, 0.45],
	['combo', 5, 0.75],
	['combo', 40, 0.75],
	['overtime', 5, null],
	['overtime', 6, 0.2],
	['overtime', 20, 0.2],
	['overtime', 21, 0.45],
	['overtime', 60, 0.45],
	['overtime', 61, 0.8],
	['ghostingStreak', 1, null],
	['ghostingStreak', 2, 0.25],
	['ghostingStreak', 3, 0.55],
	['ghostingStreak', 4, 0.55],
	['ghostingStreak', 5, 0.9],
	['ghostingStreak', 30, 0.9]
])('faixa de %s em %p', (modifier, measure, bonus) => {
	const b = band(BANDS[modifier as keyof typeof BANDS], measure as number)
	expect(b?.bonus ?? null).toBe(bonus as number | null)
})

test('nomes das Faixas (§5)', () => {
	expect(BANDS.laughter.map((b) => b.label)).toEqual(['Tique', 'Deboche', 'Escárnio'])
	expect(BANDS.punctuation.map((b) => b.label)).toEqual(['Ênfase', 'Ansiedade', 'Desespero'])
	expect(BANDS.gap.map((b) => b.label)).toEqual([
		'Retomada',
		'Reaparecimento',
		'Ressurreição',
		'Assombração'
	])
	expect(BANDS.combo.map((b) => b.label)).toEqual(['Insistência', 'Perseguição', 'Assédio'])
	expect(BANDS.overtime.map((b) => b.label)).toEqual(['Alongada', 'Sequestro', 'Refém'])
	expect(BANDS.ghostingStreak.map((b) => b.label)).toEqual([
		'Reincidência',
		'Fuga',
		'Desaparecido'
	])
})

// §8.3 — limiares provisórios da Classificação do Dia
test.each([
	[0, 'Silêncio Suspeito'],
	[299, 'Silêncio Suspeito'],
	[300, 'Dia Normal'],
	[799, 'Dia Normal'],
	[800, 'Dia Pesado'],
	[1499, 'Dia Pesado'],
	[1500, 'Dia de Cão'],
	[2999, 'Dia de Cão'],
	[3000, 'Modo Silas'],
	[999999, 'Modo Silas']
])('Classificação do Dia em %p', (total, label) => {
	expect(classify(total as number)).toBe(label)
})

test('binários (§5)', () => {
	expect(BINARY_BONUS).toEqual({ urgency: 0.4, outOfNowhere: 0.5 })
})
