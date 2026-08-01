import { dev } from '$app/environment'
import { error, fail } from '@sveltejs/kit'
import { addDays, replay } from '$lib/core/replay'
import { parseInput, todayInSaoPaulo } from '$lib/server/parse'
import { INSERT_SQL, WINDOW_SQL, toOccurrence, type Row } from '$lib/server/window'
import type { Actions, PageServerLoad, RequestEvent } from './$types'

function db(platform: App.Platform | undefined) {
	if (!platform?.env?.DB) throw error(500, 'binding DB ausente')
	return platform.env.DB
}

/**
 * O Access sobrescreve este header, e o Worker só existe no domínio protegido
 * (§9). Local o Access não roda: o fallback é ramo de `dev`, constante de build,
 * removido do bundle de produção — não apenas não executado.
 */
function authorOf({ request, platform }: RequestEvent): string {
	const email = request.headers.get('Cf-Access-Authenticated-User-Email')
	if (email) return email
	if (dev) return platform?.env?.DEV_AUTHOR ?? 'dev@local'
	throw error(401, 'sem identidade do Access')
}

export const load: PageServerLoad = async (event) => {
	const today = todayInSaoPaulo()
	const { results } = await db(event.platform).prepare(WINDOW_SQL).bind(addDays(today, -5)).all<Row>()

	return {
		author: authorOf(event),
		day: replay(results.map(toOccurrence), today)
	}
}

export const actions: Actions = {
	default: async (event) => {
		const parsed = parseInput(
			Object.fromEntries([...(await event.request.formData())].map(([k, v]) => [k, String(v)]))
		)
		if (!parsed.ok) return fail(400, { error: parsed.error })

		// O `id` e o instante nascem no servidor: o log é monotônico por construção.
		const id = crypto.randomUUID()
		const occurredAt = Date.now()
		await db(event.platform)
			.prepare(INSERT_SQL)
			.bind(
				id,
				occurredAt,
				todayInSaoPaulo(occurredAt),
				parsed.value.event,
				parsed.value.channel,
				authorOf(event),
				JSON.stringify(parsed.value.measures)
			)
			.run()

		// É com o `id` que a tela fixa o Extrato (§7).
		return { id }
	}
}
