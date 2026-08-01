/**
 * A fold do §5 do design. Recebe o log já ordenado por `day, occurred_at, id` e
 * devolve o Dia corrente. Não sabe que existe janela de leitura (ADR 0005).
 */
import { eventOf } from './catalog'
import { classify } from './tables'
import { scoreOccurrence } from './score'
import type { CategoryKey, Day, Discard, Entry, DayResult, Occurrence } from './types'

export const addDays = (day: Day, n: number): Day => {
	const d = new Date(`${day}T00:00:00Z`)
	d.setUTCDate(d.getUTCDate() + n)
	return d.toISOString().slice(0, 10)
}

export function replay(log: Occurrence[], today: Day): DayResult {
	const byDay = new Map<Day, Occurrence[]>()
	for (const o of log) {
		const bucket = byDay.get(o.day)
		if (bucket) bucket.push(o)
		else byDay.set(o.day, [o])
	}

	// Os três acumuladores. `lastBossAt` e `ghostingDays` são a Sequência (§7.2).
	let lastBossAt: number | null = null
	let ghostingDays = 0
	const entries: Entry[] = []
	const discards: Discard[] = []

	// Itera os Dias do calendário, não só os presentes no log: um Dia vazio não
	// contém Ocorrência de Vácuo, logo zera o contador (§7.3).
	for (let day = log[0]?.day ?? today; day <= today; day = addDays(day, 1)) {
		const combo = new Map<CategoryKey, number>()
		let sawGhosting = false

		for (const occurrence of byDay.get(day) ?? []) {
			const { category } = eventOf(occurrence.event)
			const comboNth = (combo.get(category) ?? 0) + 1
			combo.set(category, comboNth)

			// §7.3 — incrementa antes de pontuar: "3º Dia consecutivo" precisa ler 3
			// já na primeira Ocorrência de Vácuo do 3º Dia.
			if (category === 'ghosting' && !sawGhosting) {
				sawGhosting = true
				ghostingDays++
			}

			const scored = scoreOccurrence(occurrence, {
				gapMinutes: lastBossAt === null ? null : (occurrence.occurredAt - lastBossAt) / 60000,
				comboNth,
				ghostingDays
			})

			if (day === today) {
				entries.push({ occurrence, receipt: scored.receipt })
				discards.push(...scored.discards)
			}

			// Toda Ocorrência move o marcador, inclusive Reunião: ela não pontua Gap,
			// mas o chefe não estava calado (§5 do design).
			lastBossAt = occurrence.occurredAt
		}

		// O Dia corrente ainda não virou: seu reset só acontece amanhã. Até lá o
		// contador fica pendente, que é o valor de que a próxima Ocorrência precisa.
		if (!sawGhosting && day !== today) ghostingDays = 0
	}

	const total = entries.reduce((a, e) => a + e.receipt.score, 0)
	const highlight = entries.reduce<Entry | null>(
		(best, e) => (best === null || e.receipt.score > best.receipt.score ? e : best),
		null
	)

	return { day: today, entries, discards, total, classification: classify(total), highlight, ghostingDays }
}
