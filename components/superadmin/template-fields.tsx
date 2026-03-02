'use client'

import { TrashIcon, XIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { TaskTemplate } from '@/lib/react-query/queries'

// ─── Types ────────────────────────────────────────────────────────────────────

export type FieldType = 'text' | 'number' | 'boolean' | 'select'

export interface FieldDef {
	_id: string
	key: string
	label: string
	type: FieldType
	required: boolean
	choices: string[]
	newChoice: string
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
	newChoice: ''
})

export function templateToFields(template: TaskTemplate): FieldDef[] {
	return (template.question_templates ?? []).map((q) => ({
		_id: crypto.randomUUID(),
		key: q.question_key,
		label: q.label,
		type: q.type as FieldType,
		required: q.required,
		choices: q.choices ?? [],
		newChoice: ''
	}))
}

export function validateFields(fs: FieldDef[]): string | null {
	if (fs.length === 0) return 'At least one form field is required.'
	const keys = new Set<string>()
	for (const f of fs) {
		if (!f.label.trim()) return 'All fields must have a display label.'
		if (!f.key.trim()) return 'All fields must have an internal key.'
		if (keys.has(f.key)) return `Duplicate key "${f.key}" — each field key must be unique.`
		keys.add(f.key)
		if (f.type === 'select' && f.choices.length === 0)
			return `The "${f.label}" field is a Select type but has no options defined.`
	}
	return null
}

// ─── FieldRow ─────────────────────────────────────────────────────────────────

export interface FieldRowProps {
	field: FieldDef
	index: number
	canDelete: boolean
	onUpdate: (updates: Partial<FieldDef>) => void
	onDelete: () => void
	onAddChoice: () => void
	onRemoveChoice: (index: number) => void
}

export function FieldRow({ field, index, canDelete, onUpdate, onDelete, onAddChoice, onRemoveChoice }: FieldRowProps) {
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
						<TrashIcon className='h-3.5 w-3.5' />
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
							<SelectItem value='boolean'>Checkbox (Yes / No)</SelectItem>
							<SelectItem value='select'>Select / Dropdown</SelectItem>
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

			{field.type === 'select' && (
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
		</div>
	)
}
