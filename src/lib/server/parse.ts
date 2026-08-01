/**
 * Fronteira de confiança do POST (§6 do design). Função pura: recebe os campos
 * do formulário já achatados e devolve a Ocorrência ou o motivo da recusa.
 *
 * Estrutural, não semântica: medida incompatível e medida derivada informada
 * passam, porque são Descarte e o core precisa recebê-las pra reportá-las.
 */
import { isEventKey } from '../core/catalog'
import { CHANNELS, MODIFIERS } from '../core/tables'
import type { Channel, Day, Measures, Modifier } from '../core/types'

/** Teto sanitário. A Faixa satura muito antes, então não muda pontuação nenhuma. */
export const MEASURE_CAP = 1000

const BINARY: readonly Modifier[] = ['urgency', 'outOfNowhere']

export type ParsedInput = { event: string; channel: Channel; measures: Measures }
export type ParseResult = { ok: true; value: ParsedInput } | { ok: false; error: string }

export function parseInput(fields: Record<string, string>): ParseResult {
	const { event, channel, ...rest } = fields

	if (!event || !isEventKey(event)) return { ok: false, error: `event fora do catálogo: ${event}` }
	if (!CHANNELS.includes(channel as Channel))
		return { ok: false, error: `channel fora do enum: ${channel}` }

	const measures: Measures = {}
	for (const [key, raw] of Object.entries(rest)) {
		if (!MODIFIERS.includes(key as Modifier))
			return { ok: false, error: `medida desconhecida: ${key}` }
		const modifier = key as Modifier

		if (BINARY.includes(modifier)) {
			if (raw === 'on' || raw === 'true') measures[modifier] = true
			else if (raw === '' || raw === 'false') measures[modifier] = false
			else return { ok: false, error: `${modifier} não é booleano: ${raw}` }
			continue
		}

		if (raw === '') continue // campo do formulário deixado em branco: ausência
		if (!/^\d+$/.test(raw)) return { ok: false, error: `${modifier} não é inteiro >= 0: ${raw}` }
		const n = Number(raw)
		if (n > MEASURE_CAP) return { ok: false, error: `${modifier} acima do teto sanitário: ${raw}` }
		measures[modifier] = n
	}

	return { ok: true, value: { event, channel: channel as Channel, measures } }
}

const DAY_FORMAT = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })

/** A fronteira do Dia é decisão de fuso e é gravada, não derivada (§4 do design). */
export const todayInSaoPaulo = (now: number = Date.now()): Day => DAY_FORMAT.format(now)
