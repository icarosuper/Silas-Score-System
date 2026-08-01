/** §9 da spec, passos 2 a 8. Não vê histórico: recebe os derivados prontos. */
import { eventOf } from './catalog'
import {
	BANDS,
	BASE_SCORE,
	BINARY_BONUS,
	CAP_MULTIPLIER,
	DERIVED_MODIFIERS,
	MODIFIER_LABELS,
	MODIFIERS,
	TIER_LABELS,
	band,
	fitsCategory,
	fitsChannel
} from './tables'
import type { Derived, Discard, Modifier, Occurrence, Receipt, ReceiptLine } from './types'

/**
 * Uma medida só está "presente" se foi observada: `0` e `false` são ausência,
 * não um Modificador a descartar. Sem isso um formulário que manda zeros geraria
 * Descarte pra cada campo escondido.
 */
const present = (v: number | boolean | undefined): boolean =>
	typeof v === 'number' ? v > 0 : v === true

/** Meio para cima, e o −0 do `Math.round(-0.4)` some. */
const round = (n: number): number => Math.round(n) + 0

export function scoreOccurrence(
	occurrence: Occurrence,
	derived: Derived
): { receipt: Receipt; discards: Discard[] } {
	const event = eventOf(occurrence.event)
	const base = BASE_SCORE[event.tier]
	const discards: Discard[] = []

	// Passo 4 — compatibilidade, na ordem do §9: Canal, Categoria, derivada.
	for (const modifier of MODIFIERS) {
		if (!present(occurrence.measures[modifier])) continue
		const reason = !fitsChannel(modifier, occurrence.channel)
			? 'canal-incompatível'
			: !fitsCategory(modifier, event.category)
				? 'categoria-incompatível'
				: DERIVED_MODIFIERS.includes(modifier)
					? 'medida-derivada-informada'
					: null
		if (reason) discards.push({ occurrenceId: occurrence.id, modifier, reason })
	}

	// Passos 3, 5 e 6 — a medida que vale é a derivada, nunca a informada.
	const measureOf = (m: Modifier): number | boolean | undefined => {
		if (m === 'gap') return derived.gapMinutes ?? undefined
		if (m === 'combo') return derived.comboNth
		if (m === 'ghostingStreak') return derived.ghostingDays
		return occurrence.measures[m]
	}

	const lines: ReceiptLine[] = [
		{ label: `Base (${TIER_LABELS[event.tier]})`, value: base }
	]

	for (const modifier of MODIFIERS) {
		if (!fitsChannel(modifier, occurrence.channel)) continue
		if (!fitsCategory(modifier, event.category)) continue
		const measure = measureOf(modifier)
		if (!present(measure)) continue

		if (modifier === 'urgency' || modifier === 'outOfNowhere') {
			const bonus = BINARY_BONUS[modifier]
			lines.push({ modifier, label: MODIFIER_LABELS[modifier], bonus, value: round(base * bonus) })
			continue
		}
		const hit = band(BANDS[modifier as keyof typeof BANDS], measure as number)
		if (!hit) continue // Faixa sem bônus: não gera linha e não é Descarte (§5)
		lines.push({
			modifier,
			label: MODIFIER_LABELS[modifier],
			band: hit.label,
			bonus: hit.bonus,
			value: round(base * hit.bonus)
		})
	}

	// Passos 7 e 8 — total livre, depois o Teto.
	const free = lines.reduce((a, l) => a + l.value, 0)
	const max = base * CAP_MULTIPLIER
	const capped = free > max
	if (capped) lines.push({ label: `Teto (${CAP_MULTIPLIER}×)`, value: max - free })

	const score = capped ? max : free
	return {
		receipt: {
			occurrenceId: occurrence.id,
			event,
			lines,
			multiplier: Math.min(
				1 + lines.reduce((a, l) => a + (l.bonus ?? 0), 0),
				CAP_MULTIPLIER
			),
			score,
			capped
		},
		discards
	}
}
