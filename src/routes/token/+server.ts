import { error } from '@sveltejs/kit'
import { todayInSaoPaulo } from '$lib/server/parse'
import { TOKEN_SQL } from '$lib/server/window'
import type { RequestHandler } from './$types'

/**
 * §6 — o change-token. Como o log é append-only, `max(rowid)` é estritamente
 * crescente e nada é editado nem removido: mudou ⇔ existe Ocorrência nova. O
 * `today` entra porque a virada do Dia muda a saída com zero inserts.
 *
 * `max()` de `rowid` o SQLite resolve lendo a última entrada da b-tree: uma
 * linha, sem índice e sem varredura.
 */
export const GET: RequestHandler = async ({ platform }) => {
	const DB = platform?.env?.DB
	if (!DB) throw error(500, 'binding DB ausente')

	const row = await DB.prepare(TOKEN_SQL).first<{ top: number | null }>()

	return new Response(`${todayInSaoPaulo()}:${row?.top ?? 0}`, {
		headers: { 'content-type': 'text/plain', 'cache-control': 'no-store' }
	})
}
