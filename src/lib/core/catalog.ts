/** Transcrição direta do §3 da spec. Dados, não lógica. */
import type { CatalogEvent, CategoryKey } from './types'

/** Rótulo de exibição de cada Categoria (pt-BR). A chave é o identificador. */
export const CATEGORIES: Record<CategoryKey, string> = {
	'status-check': 'Cobrança de Status',
	'online-presence': 'Cobrança de Presença Online',
	'deadline-push': 'Cobrança de Prazo',
	'call-nagging': 'Cobrança em Call',
	'meeting-summons': 'Chamada pra Reunião',
	blunder: 'Gafe',
	ghosting: 'Vácuo',
	'censored-word': 'Palavra Censurada',
	sticker: 'Figurinha',
	motivational: 'Motivacional',
	demotivational: 'Desmotivacional',
	'meeting-overrun': 'Esticar Reunião',
	'phone-call': 'Ligação no Telefone'
}

export const CATALOG: CatalogEvent[] = [
	// Cobrança de Status
	{ key: 'how-are-we', label: 'Como estamos?', category: 'status-check', tier: 'common' },
	{ key: 'all-at-home', label: 'Tudo em casa?', category: 'status-check', tier: 'common' },
	{ key: 'deployed-yet', label: 'Subiu?', category: 'status-check', tier: 'common' },

	// Cobrança de Presença Online
	{ key: 'goofing-off', label: 'Migué?', category: 'online-presence', tier: 'rare' },
	{ key: 'still-off', label: 'Ainda off?', category: 'online-presence', tier: 'epic' },
	{
		key: 'start-time-check',
		label: 'Sua entrada é xh certo?',
		category: 'online-presence',
		tier: 'epic'
	},
	{ key: 'status-is-off', label: 'Status está off', category: 'online-presence', tier: 'epic' },
	{ key: 'still-at-lunch', label: 'Ainda almoçando?', category: 'online-presence', tier: 'legendary' },
	{
		key: 'messaged-you-still-off',
		label: 'Mandei mensagem xh, ainda estava off...',
		category: 'online-presence',
		tier: 'legendary'
	},

	// Cobrança de Prazo
	{ key: 'worth-money', label: 'Valendo grana? rsssss', category: 'deadline-push', tier: 'common' },
	{
		key: 'clear-it-out',
		label: 'Temos que tirar da frente',
		category: 'deadline-push',
		tier: 'common'
	},
	{ key: 'tomorrow', label: 'AMANHÃ?????', category: 'deadline-push', tier: 'rare' },

	// Cobrança em Call
	{ key: 'technical-problems', label: 'Problemas técnicos', category: 'call-nagging', tier: 'common' },
	{ key: 'turn-on-camera', label: 'Ligue a câmera', category: 'call-nagging', tier: 'rare' },
	{ key: 'youre-the-quiet-one', label: 'Você que está quieto', category: 'call-nagging', tier: 'epic' },

	// Chamada pra Reunião
	{ key: 'come-here', label: 'Chega aí...', category: 'meeting-summons', tier: 'rare' },

	// Gafe
	{ key: 'small-talk', label: 'Conversinha fiada...rsss', category: 'blunder', tier: 'common' },
	{ key: 'web-settings', label: 'Web Settings', category: 'blunder', tier: 'rare' },
	{ key: 'resources', label: 'Recursos', category: 'blunder', tier: 'rare' },
	{ key: 'object-value', label: 'Object Value', category: 'blunder', tier: 'epic' },
	{ key: 'warron', label: 'Warron', category: 'blunder', tier: 'legendary' },
	{
		key: 'we-buy-your-hours',
		label: 'A gente compra sua hora das 09hrs às 18hrs',
		category: 'blunder',
		tier: 'legendary'
	},

	// Vácuo
	{
		key: 'too-long-asks-call',
		label: 'Texto muito grande → pede call',
		category: 'ghosting',
		tier: 'rare'
	},
	{
		key: 'wont-read-any-of-it',
		label: 'Sabe que não vou ler nada...',
		category: 'ghosting',
		tier: 'epic'
	},
	{ key: 'here-comes-the-bible', label: 'Lá vem a bíblia...', category: 'ghosting', tier: 'legendary' },
	{
		key: 'no-call-then-text-then-call',
		label: 'Não pode call → pede texto → manda texto → pede call',
		category: 'ghosting',
		tier: 'legendary'
	},

	// Palavra Censurada
	{ key: 'censored', label: 'Mas que m$#$@#$#', category: 'censored-word', tier: 'common' },

	// Figurinha
	{ key: 'boob', label: 'Teta', category: 'sticker', tier: 'common' },
	{ key: 'short-arm', label: 'Braço curto', category: 'sticker', tier: 'common' },

	// Motivacional
	{ key: 'dont-worry', label: 'Desencana...', category: 'motivational', tier: 'common' },
	{ key: 'relax', label: 'Relaxa...', category: 'motivational', tier: 'common' },
	{ key: 'i-work-a-lot', label: 'Sei que trabalho muito', category: 'motivational', tier: 'epic' },
	{ key: 'we-are-professionals', label: 'Somos profissionais', category: 'motivational', tier: 'epic' },

	// Desmotivacional
	{ key: 'silas', label: 'Silas...', category: 'demotivational', tier: 'common' },
	{
		key: 'stealing-from-the-company',
		label: 'Se alguém faz X, está roubando da empresa',
		category: 'demotivational',
		tier: 'epic'
	},
	{ key: 'are-you-kidding', label: 'Está de brincadeira???', category: 'demotivational', tier: 'epic' },
	{
		key: 'not-a-democracy',
		label: 'Isto não é uma democracia',
		category: 'demotivational',
		tier: 'legendary'
	},

	// Esticar Reunião
	{ key: 'stretch-the-meeting', label: 'Esticar reunião', category: 'meeting-overrun', tier: 'rare' },

	// Ligação no Telefone
	{ key: 'call-the-phone', label: 'Ligar no telefone', category: 'phone-call', tier: 'legendary' }
]

const BY_KEY = new Map(CATALOG.map((e) => [e.key, e]))

export const isEventKey = (key: string): boolean => BY_KEY.has(key)

export function eventOf(key: string): CatalogEvent {
	const e = BY_KEY.get(key)
	if (!e) throw new Error(`evento fora do catálogo: ${key}`)
	return e
}

export const byCategory = (category: CategoryKey): CatalogEvent[] =>
	CATALOG.filter((e) => e.category === category)
