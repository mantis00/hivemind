'use client'

import { Trash2, XIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { TaskTemplate } from '@/lib/react-query/queries'

// ─── Types ────────────────────────────────────────────────────────────────────

export type FieldType = 'text' | 'number' | 'boolean' | 'select' | 'multiselect'

export interface FieldDef {
	_id: string
	/** DB question_templates.id — present for questions loaded from DB, undefined for newly added fields */
	dbId?: string
	key: string
	label: string
	type: FieldType
	required: boolean
	choices: string[]
	newChoice: string
	/** Key of another field whose answer must equal `conditionValue` for this field to appear */
	conditionFieldKey: string
	/** The answer value that triggers this field to show */
	conditionValue: string
}

// ─── Condition encoding ───────────────────────────────────────────────────────
// Conditions are stored in the DB by prepending a special marker as the first
// element of the `choices` array so no schema changes are needed.
// Format: "__if__:fieldKey:conditionValue"

const COND_PREFIX = '__if__:'

/**
 * Returns the choices array ready to be saved to the DB.
 * Prepends the condition marker when a condition is configured.
 */
export function encodeChoicesForSave(f: FieldDef): string[] {
	const actual = f.choices.filter((c) => !c.startsWith(COND_PREFIX))
	if (f.conditionFieldKey.trim() && f.conditionValue.trim()) {
		return [`${COND_PREFIX}${f.conditionFieldKey}:${f.conditionValue}`, ...actual]
	}
	return actual
}

function decodeRawChoices(rawChoices: string[]): {
	choices: string[]
	conditionFieldKey: string
	conditionValue: string
} {
	if (rawChoices[0]?.startsWith(COND_PREFIX)) {
		const rest = rawChoices[0].slice(COND_PREFIX.length)
		const colonIdx = rest.indexOf(':')
		const fieldKey = colonIdx >= 0 ? rest.slice(0, colonIdx) : rest
		const val = colonIdx >= 0 ? rest.slice(colonIdx + 1) : ''
		return { choices: rawChoices.slice(1), conditionFieldKey: fieldKey, conditionValue: val }
	}
	return { choices: rawChoices, conditionFieldKey: '', conditionValue: '' }
}

/** Exported so the task complete form can decode raw DB choices without duplicating logic. */
export function decodeChoices(rawChoices: string[] | null): {
	choices: string[]
	conditionFieldKey: string
	conditionValue: string
} {
	return decodeRawChoices(rawChoices ?? [])
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function toSnakeCase(str: string): string {
	return str
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '_')
		.replace(/[^a-z0-9_]/g, '')
}

export const emptyField = (): FieldDef => ({
	_id: crypto.randomUUID(),
	key: '',
	label: '',
	type: 'text',
	required: false,
	choices: [],
	newChoice: '',
	conditionFieldKey: '',
	conditionValue: ''
})

export function templateToFields(template: TaskTemplate): FieldDef[] {
	return (template.question_templates ?? []).map((q) => {
		const { choices, conditionFieldKey, conditionValue } = decodeRawChoices(q.choices ?? [])
		return {
			_id: crypto.randomUUID(),
			dbId: q.id,
			key: q.question_key,
			label: q.label,
			type: q.type as FieldType,
			required: q.required,
			choices,
			newChoice: '',
			conditionFieldKey,
			conditionValue
		}
	})
}

export function validateFields(fs: FieldDef[]): string | null {
	if (fs.length === 0) return 'At least one form field is required.'
	const keys = new Set<string>()
	for (const f of fs) {
		if (!f.label.trim()) return 'All fields must have a display label.'
		if (!f.key.trim()) return 'All fields must have an internal key.'
		if (keys.has(f.key)) return `Duplicate key "${f.key}" — each field key must be unique.`
		keys.add(f.key)
		if ((f.type === 'select' || f.type === 'multiselect') && f.choices.length === 0)
			return `The "${f.label}" field requires at least one option.`
	}
	return null
}

// ─── FieldRow ─────────────────────────────────────────────────────────────────

export interface FieldRowProps {
	field: FieldDef
	index: number
	canDelete: boolean
	/** All sibling fields — used to populate the condition trigger selector */
	allFields: FieldDef[]
	onUpdate: (updates: Partial<FieldDef>) => void
	onDelete: () => void
	onAddChoice: () => void
	onRemoveChoice: (index: number) => void
}

export function FieldRow({
	field,
	index,
	canDelete,
	allFields,
	onUpdate,
	onDelete,
	onAddChoice,
	onRemoveChoice
}: FieldRowProps) {
	const isChoiceType = field.type === 'select' || field.type === 'multiselect'
	const hasCondition = !!field.conditionFieldKey

	// Fields eligible as a condition trigger: boolean, or select/multiselect with at least one option
	// Must also have a filled-in key so the condition can be stored and matched
	const eligibleTriggers = allFields.filter(
		(f) =>
			f._id !== field._id &&
			f.key.trim() !== '' &&
			(f.type === 'boolean' || ((f.type === 'select' || f.type === 'multiselect') && f.choices.length > 0))
	)

	const conditionField = allFields.find((f) => f.key === field.conditionFieldKey)
	const conditionValueOptions =
		conditionField?.type === 'boolean'
			? [
					{ label: 'Yes', value: 'true' },
					{ label: 'No', value: 'false' }
				]
			: (conditionField?.choices ?? []).map((c) => ({ label: c, value: c }))

	return (
		<div className='rounded-lg border bg-muted/30 p-3 space-y-3'>
			<div className='flex items-center justify-between'>
				<span className='text-xs font-semibold text-muted-foreground'>Field {index + 1}</span>
				{canDelete && (
					<Button
						type='button'
						variant='ghost'
						size='icon'
						className='h-7 w-7 text-muted-foreground hover:text-destructive'
						onClick={onDelete}
					>
						<Trash2 className='h-3.5 w-3.5' />
					</Button>
				)}
			</div>

			<div className='grid grid-cols-2 gap-2'>
				<div className='space-y-1'>
					<Label className='text-xs'>Display Label *</Label>
					<Input
						placeholder='e.g. Amount Fed'
						value={field.label}
						onChange={(e) => {
							const label = e.target.value
							onUpdate({ label, key: toSnakeCase(label) })
						}}
						className='h-8 text-sm'
					/>
				</div>
				<div className='space-y-1'>
					<Label className='text-xs'>Internal Key *</Label>
					<Input
						placeholder='e.g. amount_fed'
						value={field.key}
						onChange={(e) => onUpdate({ key: toSnakeCase(e.target.value) })}
						className='h-8 text-sm font-mono'
					/>
				</div>
			</div>

			<div className='flex items-end gap-3'>
				<div className='space-y-1 flex-1'>
					<Label className='text-xs'>Field Type</Label>
					<Select
						value={field.type}
						onValueChange={(val) => onUpdate({ type: val as FieldType, choices: [], newChoice: '' })}
					>
						<SelectTrigger className='h-8 text-sm'>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='text'>Text</SelectItem>
							<SelectItem value='number'>Number</SelectItem>
							<SelectItem value='boolean'>Boolean (Yes / No)</SelectItem>
							<SelectItem value='select'>Select (pick one)</SelectItem>
							<SelectItem value='multiselect'>Multi-select (pick many)</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className='flex items-center gap-1.5 pb-1.5'>
					<Checkbox
						id={`req-${field._id}`}
						checked={field.required}
						onCheckedChange={(c) => onUpdate({ required: !!c })}
					/>
					<Label htmlFor={`req-${field._id}`} className='text-xs cursor-pointer'>
						Required
					</Label>
				</div>
			</div>

			{/* Options for select / multiselect */}
			{isChoiceType && (
				<div className='space-y-2'>
					<Label className='text-xs'>
						Options <span className='text-destructive'>*</span>
					</Label>
					{field.choices.length > 0 && (
						<div className='flex flex-wrap gap-1'>
							{field.choices.map((c, i) => (
								<Badge key={i} variant='secondary' className='gap-1 text-xs pr-1'>
									{c}
									<button
										type='button'
										onClick={() => onRemoveChoice(i)}
										className='ml-0.5 rounded-sm hover:text-destructive'
									>
										<XIcon className='h-2.5 w-2.5' />
									</button>
								</Badge>
							))}
						</div>
					)}
					<div className='flex gap-2'>
						<Input
							placeholder='Type an option and press Enter…'
							value={field.newChoice}
							onChange={(e) => onUpdate({ newChoice: e.target.value })}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault()
									onAddChoice()
								}
							}}
							className='h-7 text-xs'
						/>
						<Button
							type='button'
							size='sm'
							variant='outline'
							className='h-7 text-xs px-2 shrink-0'
							onClick={onAddChoice}
							disabled={!field.newChoice.trim()}
						>
							Add
						</Button>
					</div>
				</div>
			)}

			{/* Conditional visibility */}
			{eligibleTriggers.length > 0 && (
				<div className='space-y-2 pt-1 border-t'>
					<div className='flex items-center gap-1.5'>
						<Checkbox
							id={`cond-${field._id}`}
							checked={hasCondition}
							onCheckedChange={(c) => {
								if (!c) {
									onUpdate({ conditionFieldKey: '', conditionValue: '' })
								} else {
									onUpdate({ conditionFieldKey: eligibleTriggers[0]?.key ?? '', conditionValue: '' })
								}
							}}
						/>
						<Label htmlFor={`cond-${field._id}`} className='text-xs cursor-pointer text-muted-foreground'>
							Show only if…
						</Label>
					</div>

					{hasCondition && (
						<div className='grid grid-cols-2 gap-2 pl-5'>
							<div className='space-y-1'>
								<Label className='text-xs text-muted-foreground'>Trigger field</Label>
								<Select
									value={field.conditionFieldKey}
									onValueChange={(val) => onUpdate({ conditionFieldKey: val, conditionValue: '' })}
								>
									<SelectTrigger className='h-7 text-xs'>
										<SelectValue placeholder='Pick a field…' />
									</SelectTrigger>
									<SelectContent>
										{eligibleTriggers.map((f) => (
											<SelectItem key={f._id} value={f.key}>
												{f.label || f.key}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className='space-y-1'>
								<Label className='text-xs text-muted-foreground'>Equals</Label>
								<Select
									value={field.conditionValue}
									onValueChange={(val) => onUpdate({ conditionValue: val })}
									disabled={!conditionField || conditionValueOptions.length === 0}
								>
									<SelectTrigger className='h-7 text-xs'>
										<SelectValue placeholder='Pick a value…' />
									</SelectTrigger>
									<SelectContent>
										{conditionValueOptions.map((opt) => (
											<SelectItem key={opt.value} value={opt.value}>
												{opt.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	)
}
