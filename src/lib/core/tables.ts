/**
 * Transcrição dos §4, §5, §6 e §8.3 da spec. Dados, não lógica — mudar um bônus
 * é editar um número.
 */
import type { CategoryKey, Channel, Modifier, Tier } from './types'

export const CHANNELS: readonly Channel[] = ['text', 'sticker', 'voice', 'meeting']

export const CHANNEL_LABELS: Record<Channel, string> = {
	text: 'Texto',
	sticker: 'Figurinha',
	voice: 'Voz',
	meeting: 'Reunião'
}

export const MODIFIERS: readonly Modifier[] = [
	'laughter',
	'punctuation',
	'urgency',
	'outOfNowhere',
	'gap',
	'combo',
	'overtime',
	'ghostingStreak'
]

/** Os três que o SSS deriva sozinho — informá-los é Descarte (§2). */
export const DERIVED_MODIFIERS: readonly Modifier[] = ['gap', 'combo', 'ghostingStreak']

export const MODIFIER_LABELS: Record<Modifier, string> = {
	laughter: 'Risada',
	punctuation: 'Pontuação Excessiva',
	urgency: 'Urgência',
	gap: 'Gap de Tempo',
	combo: 'Combo',
	overtime: 'Enrolação',
	outOfNowhere: 'Do nada',
	ghostingStreak: 'Sequência de Vácuo'
}

export const TIER_LABELS: Record<Tier, string> = {
	common: 'Comum',
	rare: 'Raro',
	epic: 'Épico',
	legendary: 'Lendário'
}

// §3 Distribuição
export const BASE_SCORE: Record<Tier, number> = { common: 10, rare: 30, epic: 80, legendary: 200 }

/** §4 — Σ bônus efetivo ≤ 2,00, logo Score ≤ 3 × Base. */
export const CAP_MULTIPLIER = 3

export type Band = { min: number; bonus: number; label: string }

/** §5 — cada Faixa é um limite inferior. Vale a maior que a medida alcança. */
export const BANDS = {
	laughter: [
		{ min: 1, bonus: 0.1, label: 'Tique' },
		{ min: 3, bonus: 0.2, label: 'Deboche' },
		{ min: 9, bonus: 0.35, label: 'Escárnio' }
	],
	punctuation: [
		{ min: 2, bonus: 0.1, label: 'Ênfase' },
		{ min: 4, bonus: 0.2, label: 'Ansiedade' },
		{ min: 7, bonus: 0.35, label: 'Desespero' }
	],
	// medida em minutos
	gap: [
		{ min: 15, bonus: 0.15, label: 'Retomada' },
		{ min: 120, bonus: 0.35, label: 'Reaparecimento' },
		{ min: 1440, bonus: 0.6, label: 'Ressurreição' },
		{ min: 4320, bonus: 0.9, label: 'Assombração' }
	],
	// medida é a enésima Ocorrência da Categoria no Dia
	combo: [
		{ min: 2, bonus: 0.2, label: 'Insistência' },
		{ min: 3, bonus: 0.45, label: 'Perseguição' },
		{ min: 5, bonus: 0.75, label: 'Assédio' }
	],
	// medida em minutos além do fim agendado
	overtime: [
		{ min: 6, bonus: 0.2, label: 'Alongada' },
		{ min: 21, bonus: 0.45, label: 'Sequestro' },
		{ min: 61, bonus: 0.8, label: 'Refém' }
	],
	// medida em Dias consecutivos
	ghostingStreak: [
		{ min: 2, bonus: 0.25, label: 'Reincidência' },
		{ min: 3, bonus: 0.55, label: 'Fuga' },
		{ min: 5, bonus: 0.9, label: 'Desaparecido' }
	]
} satisfies Record<string, Band[]>

export const BINARY_BONUS = { urgency: 0.4, outOfNowhere: 0.5 } as const

export const band = (table: Band[], measure: number): Band | undefined =>
	table.findLast((b) => measure >= b.min)

// §6.1 — derivada do Canal: onde há substrato pra medir
const CHANNEL_COMPAT: Record<Modifier, readonly Channel[]> = {
	laughter: ['text'],
	punctuation: ['text'],
	urgency: ['text', 'sticker'],
	gap: ['text', 'sticker', 'voice'],
	overtime: ['meeting'],
	combo: CHANNELS,
	outOfNowhere: CHANNELS,
	ghostingStreak: CHANNELS
}

// §6.2 — as duas únicas restrições por Categoria
const CATEGORY_COMPAT: Partial<Record<Modifier, readonly CategoryKey[]>> = {
	ghostingStreak: ['ghosting'],
	outOfNowhere: ['meeting-summons', 'phone-call', 'deadline-push']
}

export const fitsChannel = (modifier: Modifier, channel: Channel): boolean =>
	CHANNEL_COMPAT[modifier].includes(channel)

export const fitsCategory = (modifier: Modifier, category: CategoryKey): boolean =>
	CATEGORY_COMPAT[modifier]?.includes(category) ?? true

/**
 * §6.3 — a matriz, derivada dos dois eixos acima. Fonte única: consumida pelo
 * `scoreOccurrence` e pelo formulário.
 */
export const allowedModifiers = (category: CategoryKey, channel: Channel): Modifier[] =>
	MODIFIERS.filter((m) => fitsChannel(m, channel) && fitsCategory(m, category))

/** §8.3 — limiares provisórios, mesmo formato de limite inferior. */
export const CLASSIFICATIONS: Band[] = [
	{ min: 0, bonus: 0, label: 'Silêncio Suspeito' },
	{ min: 300, bonus: 0, label: 'Dia Normal' },
	{ min: 800, bonus: 0, label: 'Dia Pesado' },
	{ min: 1500, bonus: 0, label: 'Dia de Cão' },
	{ min: 3000, bonus: 0, label: 'Modo Silas' }
]

export const classify = (total: number): string =>
	band(CLASSIFICATIONS, total)?.label ?? CLASSIFICATIONS[0].label
