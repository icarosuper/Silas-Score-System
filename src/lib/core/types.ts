/** Tipos do core do SSS. Zero IO, zero framework — importado por caminho relativo. */

export type Tier = 'common' | 'rare' | 'epic' | 'legendary'

export type Channel = 'text' | 'sticker' | 'voice' | 'meeting'

export type CategoryKey =
	| 'status-check'
	| 'online-presence'
	| 'deadline-push'
	| 'call-nagging'
	| 'meeting-summons'
	| 'blunder'
	| 'ghosting'
	| 'censored-word'
	| 'sticker'
	| 'motivational'
	| 'demotivational'
	| 'meeting-overrun'
	| 'phone-call'

export type Modifier =
	| 'laughter'
	| 'punctuation'
	| 'urgency'
	| 'gap'
	| 'combo'
	| 'overtime'
	| 'outOfNowhere'
	| 'ghostingStreak'

/** As cinco medidas que o chamador informa (§2). As outras três o SSS deriva. */
export type InformableModifier = 'laughter' | 'punctuation' | 'urgency' | 'overtime' | 'outOfNowhere'

export type CatalogEvent = {
	key: string
	label: string
	category: CategoryKey
	tier: Tier
}

/** `YYYY-MM-DD` em America/Sao_Paulo. */
export type Day = string

export type Measures = Partial<Record<Modifier, number | boolean>>

export type Occurrence = {
	id: string
	occurredAt: number
	day: Day
	event: string
	channel: Channel
	author: string
	measures: Measures
}

/** Os três Modificadores derivados, já resolvidos como números (§5 do design). */
export type Derived = {
	/** Minutos desde a última mensagem do chefe, ou `null` se não há anterior. */
	gapMinutes: number | null
	/** A enésima Ocorrência da Categoria no Dia (1 = primeira). */
	comboNth: number
	/** Dias consecutivos de vácuo, incluindo o Dia corrente. */
	ghostingDays: number
}

export type DiscardReason =
	| 'canal-incompatível'
	| 'categoria-incompatível'
	| 'medida-derivada-informada'

export type Discard = {
	occurrenceId: string
	modifier: Modifier
	reason: DiscardReason
}

export type ReceiptLine = {
	/** Ausente na linha de Base e na linha de Teto. */
	modifier?: Modifier
	label: string
	/** Nome da Faixa, quando o Modificador é Graduado. */
	band?: string
	/** Fração (0,4 = +40%). Ausente na Base; negativa não existe. */
	bonus?: number
	value: number
}

export type Receipt = {
	occurrenceId: string
	event: CatalogEvent
	lines: ReceiptLine[]
	/** `1 + Σ bônus`, já cortado pelo Teto quando ele morde. */
	multiplier: number
	/** Soma exata das linhas. */
	score: number
	capped: boolean
}

export type Entry = {
	occurrence: Occurrence
	receipt: Receipt
}

export type DayResult = {
	day: Day
	entries: Entry[]
	discards: Discard[]
	total: number
	classification: string
	highlight: Entry | null
	ghostingDays: number
}
