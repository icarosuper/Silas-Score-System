<script lang="ts">
	import { enhance } from '$app/forms'
	import { invalidateAll } from '$app/navigation'
	import { CATEGORIES, byCategory } from '$lib/core/catalog'
	import {
		CHANNELS,
		CHANNEL_LABELS,
		DERIVED_MODIFIERS,
		MODIFIER_LABELS,
		allowedModifiers
	} from '$lib/core/tables'
	import type { CategoryKey, Channel, Entry, Modifier } from '$lib/core/types'
	import type { SubmitFunction } from '@sveltejs/kit'
	import type { ActionData, PageData } from './$types'

	let { data, form }: { data: PageData; form: ActionData } = $props()

	/**
	 * ponytail: tabelinha de plausibilidade só pro destaque visual — nenhum Canal é
	 * bloqueado, e a matriz de Modificadores (§6.3) não sabe responder "que Canal
	 * faz sentido pra esta Categoria". Se um dia fizer, some daqui.
	 */
	const PLAUSIBLE: Partial<Record<CategoryKey, readonly Channel[]>> = {
		sticker: ['sticker'],
		'meeting-overrun': ['meeting'],
		'call-nagging': ['voice', 'meeting'],
		'phone-call': ['voice'],
		'meeting-summons': ['text', 'sticker', 'voice'],
		ghosting: ['text']
	}

	const BINARY: readonly Modifier[] = ['urgency', 'outOfNowhere']

	const RECENT_MS = 5 * 60 * 1000

	const hhmm = new Intl.DateTimeFormat('pt-BR', {
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'America/Sao_Paulo'
	})

	let category = $state<CategoryKey | ''>('')
	let eventKey = $state('')
	let channel = $state<Channel>('text')
	let submitting = $state(false)
	let now = $state(Date.now())

	/**
	 * O Extrato é fixo: só o próprio registro o troca (§7). Guardamos o `id`, não
	 * a Entry — assim o polling reescreve o Dia sem mexer no comprovante, e o
	 * comprovante ainda acompanha uma eventual correção de pontuação.
	 */
	// svelte-ignore state_referenced_locally -- semente, de propósito
	let pinnedId = $state<string | null>(
		data.day.entries.findLast((e) => e.occurrence.author === data.author)?.occurrence.id ?? null
	)

	const pinned = $derived<Entry | null>(
		data.day.entries.find((e) => e.occurrence.id === pinnedId) ?? null
	)

	const events = $derived(category ? byCategory(category) : [])

	const measures = $derived(
		category
			? allowedModifiers(category, channel).filter((m) => !DERIVED_MODIFIERS.includes(m))
			: []
	)

	const plausible = $derived(category ? (PLAUSIBLE[category] ?? CHANNELS) : CHANNELS)

	const recent = $derived(
		eventKey
			? (data.day.entries.findLast(
					(e) => e.occurrence.event === eventKey && now - e.occurrence.occurredAt < RECENT_MS
				) ?? null)
			: null
	)

	const errorMessage = $derived(form && 'error' in form ? form.error : null)

	const ago = (ms: number) => {
		const min = Math.floor(Math.max(0, ms) / 60000)
		return min < 1 ? 'agora há pouco' : `há ${min} min`
	}

	const pct = (bonus: number) => `+${Math.round(bonus * 100)}%`

	const signed = (value: number) => (value > 0 ? `+${value}` : `${value}`)

	const onSubmit: SubmitFunction = () => {
		submitting = true
		return async ({ result, update }) => {
			await update()
			submitting = false
			if (result.type === 'success') {
				pinnedId = (result.data as { id?: string } | undefined)?.id ?? null
				category = ''
				eventKey = ''
				channel = 'text'
			}
		}
	}

	// Polling do change-token (§6): só invalida quando o token muda.
	$effect(() => {
		let lastToken: string | null = null
		let alive = true

		const check = async () => {
			now = Date.now()
			try {
				const token = await fetch('/token').then((r) => r.text())
				if (!alive) return
				if (lastToken !== null && token !== lastToken) await invalidateAll()
				lastToken = token
			} catch {
				// rede caiu: a próxima batida tenta de novo
			}
		}

		check()
		const timer = setInterval(check, 5000)
		window.addEventListener('focus', check)

		return () => {
			alive = false
			clearInterval(timer)
			window.removeEventListener('focus', check)
		}
	})
</script>

<div class="min-h-screen bg-neutral-950 text-neutral-100">
	<header class="border-b border-neutral-800 px-4 py-4">
		<h1 class="text-lg font-semibold tracking-tight">Silas Score System</h1>
		<p class="text-sm text-neutral-400">{data.author}</p>
	</header>

	<main class="mx-auto grid max-w-5xl gap-6 p-4 md:grid-cols-2">
		<section class="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
			<h2 class="mb-4 text-base font-semibold">Registrar</h2>

			<form method="POST" use:enhance={onSubmit} class="flex flex-col gap-4">
				<label class="flex flex-col gap-1">
					<span class="text-sm text-neutral-400">Categoria</span>
					<select
						bind:value={category}
						onchange={() => (eventKey = '')}
						class="min-h-12 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-base"
					>
						<option value="">Escolha uma Categoria…</option>
						{#each Object.entries(CATEGORIES) as [key, label] (key)}
							<option value={key}>{label}</option>
						{/each}
					</select>
				</label>

				<label class="flex flex-col gap-1">
					<span class="text-sm text-neutral-400">Evento</span>
					<select
						name="event"
						bind:value={eventKey}
						disabled={!category}
						required
						class="min-h-12 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-base disabled:opacity-40"
					>
						<option value="">Escolha um Evento…</option>
						{#each events as e (e.key)}
							<option value={e.key}>{e.label}</option>
						{/each}
					</select>
				</label>

				<fieldset class="flex flex-col gap-2">
					<legend class="mb-2 text-sm text-neutral-400">Canal</legend>
					<div class="grid grid-cols-2 gap-2">
						{#each CHANNELS as c (c)}
							<button
								type="button"
								onclick={() => (channel = c)}
								aria-pressed={channel === c}
								class="min-h-12 rounded-lg border px-3 text-base transition {channel === c
									? 'border-amber-400 bg-amber-400/15 text-amber-200'
									: plausible.includes(c)
										? 'border-neutral-600 bg-neutral-800/60'
										: 'border-neutral-800 bg-neutral-900 text-neutral-500'}"
							>
								{CHANNEL_LABELS[c]}
							</button>
						{/each}
					</div>
					<input type="hidden" name="channel" value={channel} />
				</fieldset>

				{#if measures.length}
					<fieldset class="flex flex-col gap-3">
						<legend class="mb-2 text-sm text-neutral-400">Medidas</legend>
						{#each measures as m (m)}
							{#if BINARY.includes(m)}
								<label class="flex min-h-12 items-center gap-3">
									<input
										type="checkbox"
										name={m}
										class="size-5 rounded border-neutral-600 bg-neutral-900"
									/>
									<span class="text-base">{MODIFIER_LABELS[m]}</span>
								</label>
							{:else}
								<label class="flex flex-col gap-1">
									<span class="text-sm text-neutral-400">{MODIFIER_LABELS[m]}</span>
									<input
										type="number"
										name={m}
										min="0"
										max="1000"
										step="1"
										value=""
										inputmode="numeric"
										class="min-h-12 rounded-lg border border-neutral-700 bg-neutral-900 px-3 text-base"
									/>
								</label>
							{/if}
						{/each}
					</fieldset>
				{/if}

				<button
					type="submit"
					disabled={submitting || !eventKey}
					class="min-h-12 rounded-lg bg-amber-500 px-4 text-base font-semibold text-neutral-950 disabled:opacity-40"
				>
					{submitting ? 'Registrando…' : 'Registrar'}
				</button>

				{#if recent}
					<p class="text-sm text-amber-300/90">
						Já registrado por {recent.occurrence.author}
						{ago(now - recent.occurrence.occurredAt)}.
					</p>
				{/if}

				{#if errorMessage}
					<p class="text-sm text-red-400">{errorMessage}</p>
				{/if}
			</form>
		</section>

		<section class="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
			<h2 class="mb-4 text-base font-semibold">Extrato</h2>
			{#if pinned}
				<p class="mb-3 text-sm text-neutral-400">
					{pinned.receipt.event.label} · {hhmm.format(pinned.occurrence.occurredAt)}
				</p>
				<ul class="flex flex-col gap-1 text-sm">
					{#each pinned.receipt.lines as line, i (i)}
						<li class="flex items-baseline justify-between gap-3 border-b border-neutral-800/60 py-1">
							<span>
								{line.band ? `${line.label}: ${line.band}` : line.label}
								{#if line.bonus !== undefined}
									<span class="text-neutral-400"> ({pct(line.bonus)})</span>
								{/if}
							</span>
							<span class="tabular-nums">{i === 0 ? line.value : signed(line.value)}</span>
						</li>
					{/each}
				</ul>
				<p class="mt-3 flex items-baseline justify-between gap-3 text-base font-semibold">
					<span>Score{pinned.receipt.capped ? ' (no Teto)' : ''}</span>
					<span class="text-sm font-normal text-neutral-400 tabular-nums">
						{pinned.receipt.multiplier.toLocaleString('pt-BR', {
							minimumFractionDigits: 2,
							maximumFractionDigits: 2
						})}×
					</span>
					<span class="tabular-nums">{pinned.receipt.score}</span>
				</p>
			{:else}
				<p class="text-sm text-neutral-500">Nenhuma Ocorrência sua hoje.</p>
			{/if}
		</section>

		<section class="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 md:col-span-2">
			<h2 class="mb-4 text-base font-semibold">O Dia</h2>
			<div class="mb-4 flex flex-wrap items-baseline gap-x-6 gap-y-1">
				<span class="text-3xl font-bold tabular-nums">{data.day.total}</span>
				<span class="text-amber-300">{data.day.classification}</span>
				{#if data.day.highlight}
					<span class="text-sm text-neutral-400">
						Destaque: {data.day.highlight.receipt.event.label} ({data.day.highlight.receipt.score})
					</span>
				{/if}
			</div>

			{#if data.day.entries.length}
				<ul class="flex flex-col">
					{#each data.day.entries as entry (entry.occurrence.id)}
						<li
							class="flex items-baseline justify-between gap-3 border-b border-neutral-800/60 py-2 text-sm"
						>
							<span class="tabular-nums text-neutral-400">
								{hhmm.format(entry.occurrence.occurredAt)}
							</span>
							<span class="flex-1">{entry.receipt.event.label}</span>
							<span class="hidden text-neutral-500 sm:inline">{entry.occurrence.author}</span>
							<span class="tabular-nums font-semibold">{entry.receipt.score}</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="text-sm text-neutral-500">Nada registrado hoje.</p>
			{/if}
		</section>

		<details class="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 md:col-span-2">
			<summary class="cursor-pointer text-base font-semibold">
				Descartes ({data.day.discards.length})
			</summary>
			{#if data.day.discards.length}
				<ul class="mt-3 flex flex-col gap-1 text-sm text-neutral-400">
					{#each data.day.discards as d (d.occurrenceId + d.modifier)}
						<li>{MODIFIER_LABELS[d.modifier]} — {d.reason}</li>
					{/each}
				</ul>
			{:else}
				<p class="mt-3 text-sm text-neutral-500">Nenhum.</p>
			{/if}
		</details>
	</main>
</div>
