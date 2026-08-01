import { expect, test } from 'bun:test'
import { CATALOG, CATEGORIES, byCategory, eventOf } from './catalog'
import { BASE_SCORE } from './tables'

test('39 eventos em 13 categorias', () => {
	expect(CATALOG.length).toBe(39)
	expect(Object.keys(CATEGORIES).length).toBe(13)
})

test('toda chave é única', () => {
	expect(new Set(CATALOG.map((e) => e.key)).size).toBe(39)
})

test('todo rótulo é único', () => {
	expect(new Set(CATALOG.map((e) => e.label)).size).toBe(39)
})

test('toda categoria declarada existe e tem ao menos um evento', () => {
	for (const e of CATALOG) expect(CATEGORIES[e.category]).toBeString()
	for (const c of Object.keys(CATEGORIES)) expect(byCategory(c as never).length).toBeGreaterThan(0)
})

// §3 Distribuição
test('contagem por Tier bate com a Distribuição do §3', () => {
	const count = (tier: string) => CATALOG.filter((e) => e.tier === tier).length
	expect(count('common')).toBe(13)
	expect(count('rare')).toBe(8)
	expect(count('epic')).toBe(10)
	expect(count('legendary')).toBe(8)
})

test('Pontuação Base por Tier', () => {
	expect(BASE_SCORE).toEqual({ common: 10, rare: 30, epic: 80, legendary: 200 })
})

// §3 — rótulos transcritos da spec, um por Categoria como âncora
test.each([
	['deployed-yet', 'Subiu?', 'status-check', 'common'],
	['still-at-lunch', 'Ainda almoçando?', 'online-presence', 'legendary'],
	['tomorrow', 'AMANHÃ?????', 'deadline-push', 'rare'],
	['turn-on-camera', 'Ligue a câmera', 'call-nagging', 'rare'],
	['come-here', 'Chega aí...', 'meeting-summons', 'rare'],
	['warron', 'Warron', 'blunder', 'legendary'],
	['here-comes-the-bible', 'Lá vem a bíblia...', 'ghosting', 'legendary'],
	['censored', 'Mas que m$#$@#$#', 'censored-word', 'common'],
	['boob', 'Teta', 'sticker', 'common'],
	['i-work-a-lot', 'Sei que trabalho muito', 'motivational', 'epic'],
	['not-a-democracy', 'Isto não é uma democracia', 'demotivational', 'legendary'],
	['stretch-the-meeting', 'Esticar reunião', 'meeting-overrun', 'rare'],
	['call-the-phone', 'Ligar no telefone', 'phone-call', 'legendary']
])('catálogo: %s', (key, label, category, tier) => {
	expect(eventOf(key)).toMatchObject({ label, category, tier })
})

test('cada Categoria tem a quantidade de Eventos da spec', () => {
	const sizes = Object.fromEntries(
		Object.keys(CATEGORIES).map((c) => [c, byCategory(c as never).length])
	)
	expect(sizes).toEqual({
		'status-check': 3,
		'online-presence': 6,
		'deadline-push': 3,
		'call-nagging': 3,
		'meeting-summons': 1,
		blunder: 6,
		ghosting: 4,
		'censored-word': 1,
		sticker: 2,
		motivational: 4,
		demotivational: 4,
		'meeting-overrun': 1,
		'phone-call': 1
	})
})
