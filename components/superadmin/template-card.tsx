'use client'

import { useState } from 'react'
import { ChevronDownIcon, LoaderCircle, PlusIcon, TrashIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { useUpdateTaskTemplate } from '@/lib/react-query/mutations'
import { DeleteTemplateButton } from '@/components/superadmin/delete-template-button'
import { useAllTaskTypes } from '@/lib/react-query/queries'
import type { Species, TaskTemplate } from '@/lib/react-query/queries'

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

// ─── TemplateCard ─────────────────────────────────────────────────────────────

interface TemplateCardProps {
	template: TaskTemplate
	species: Species
	allTemplateTypes: string[]
}

export function TemplateCard({ template, species, allTemplateTypes }: TemplateCardProps) {
	const [expanded, setExpanded] = useState(false)
	const [type, setType] = useState(template.type)
	const [showNewTypeInput, setShowNewTypeInput] = useState(false)
	const [description, setDescription] = useState(template.description ?? '')
	const [fields, setFields] = useState<FieldDef[]>(() => templateToFields(template))

	const updateTemplate = useUpdateTaskTemplate()
	const { data: allTypes } = useAllTaskTypes()

	// Types available to switch to: all global types minus types used by OTHER templates for this species
	const otherUsedTypes = allTemplateTypes.filter((t) => t !== template.type)
	const availableTypes = (allTypes ?? []).filter((t) => !otherUsedTypes.includes(t))

	// Dirty detection — compare serialized current vs original template
	const originalSerialized = JSON.stringify(
		(template.question_templates ?? []).map((q) => ({
			key: q.question_key,
			label: q.label,
			type: q.type,
			required: q.required,
			choices: q.choices ?? []
		}))
	)
	const currentSerialized = JSON.stringify(
		fields.map((f) => ({ key: f.key, label: f.label, type: f.type, required: f.required, choices: f.choices }))
	)
	const isDirty =
		type !== template.type || description !== (template.description ?? '') || currentSerialized !== originalSerialized

	const reset = () => {
		setType(template.type)
		setShowNewTypeInput(false)
		setDescription(template.description ?? '')
		setFields(templateToFields(template))
	}

	const addField = () => setFields((p) => [...p, emptyField()])
	const removeField = (id: string) => setFields((p) => p.filter((f) => f._id !== id))
	const updateField = (id: string, u: Partial<FieldDef>) =>
		setFields((p) => p.map((f) => (f._id === id ? { ...f, ...u } : f)))
	const addChoice = (id: string) =>
		setFields((p) =>
			p.map((f) => {
				if (f._id !== id || !f.newChoice.trim()) return f
				return { ...f, choices: [...f.choices, f.newChoice.trim()], newChoice: '' }
			})
		)
	const removeChoice = (fieldId: string, i: number) =>
		setFields((p) => p.map((f) => (f._id !== fieldId ? f : { ...f, choices: f.choices.filter((_, ci) => ci !== i) })))

	const handleSave = (e: React.FormEvent) => {
		e.preventDefault()
		if (!type.trim()) {
			toast.error('Task type is required.')
			return
		}
		if (type.trim() !== template.type && allTemplateTypes.includes(type.trim())) {
			toast.error(`A "${type.trim()}" template already exists for this species.`)
			return
		}
		const fieldErr = validateFields(fields)
		if (fieldErr) {
			toast.error(fieldErr)
			return
		}

		updateTemplate.mutate(
			{
				templateId: template.id,
				speciesId: species.id,
				type: type.trim(),
				description: description.trim(),
				fields: fields.map((f) => ({
					question_key: f.key,
					label: f.label,
					type: f.type,
					required: f.required,
					choices: f.choices
				}))
			},
			{ onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update template') }
		)
	}

	return (
		<Collapsible
			open={expanded}
			onOpenChange={setExpanded}
			className='rounded-lg border-2 ring-1 ring-border bg-card overflow-hidden'
		>
			{/* Sticky header */}
			<div className='sticky top-0 z-10 bg-card'>
				<CollapsibleTrigger asChild>
					<div className='flex items-center gap-2 px-3 py-2.5 select-none cursor-pointer hover:bg-accent/40 transition-colors'>
						{/* Badge + description */}
						<div className='flex items-center gap-2 flex-1 min-w-0'>
							<Badge variant='outline' className='font-mono text-xs capitalize shrink-0'>
								{template.type}
							</Badge>
							<span className='text-xs text-muted-foreground truncate min-w-0'>
								{template.description ??
									`${template.question_templates?.length ?? 0} field${(template.question_templates?.length ?? 0) !== 1 ? 's' : ''}`}
							</span>
						</div>

						{/* Delete button — stop propagation so it doesn't toggle the collapsible */}
						<div onClick={(e) => e.stopPropagation()}>
							<DeleteTemplateButton template={template} species={species} />
						</div>

						{/* Expand chevron */}
						<ChevronDownIcon
							className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
						/>
					</div>
				</CollapsibleTrigger>
			</div>

			{/* Expanded edit form */}
			<CollapsibleContent>
				<form onSubmit={handleSave} className='border-t px-3 py-3 space-y-4 bg-muted/20'>
					<div className='space-y-1'>
						<Label className='text-xs'>
							Task Type <span className='text-destructive'>*</span>
						</Label>
						{showNewTypeInput || availableTypes.length === 0 ? (
							<div className='flex gap-2'>
								<Input
									value={type}
									onChange={(e) => setType(e.target.value)}
									className='h-8 text-sm flex-1'
									placeholder='e.g. feeding'
									autoFocus
								/>
								{availableTypes.length > 0 && (
									<Button
										type='button'
										variant='outline'
										size='sm'
										className='shrink-0'
										onClick={() => {
											setShowNewTypeInput(false)
											setType(template.type)
										}}
									>
										Pick existing
									</Button>
								)}
							</div>
						) : (
							<Select
								value={type}
								onValueChange={(val) => {
									if (val === '__new__') {
										setShowNewTypeInput(true)
										setType('')
									} else {
										setType(val)
									}
								}}
							>
								<SelectTrigger className='h-8 text-sm'>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{availableTypes.map((t) => (
										<SelectItem key={t} value={t}>
											{t}
										</SelectItem>
									))}
									<Separator className='my-1' />
									<SelectItem value='__new__'>+ Create new type…</SelectItem>
								</SelectContent>
							</Select>
						)}
					</div>

					<div className='space-y-1'>
						<Label className='text-xs'>
							Description <span className='text-muted-foreground font-normal'>(optional)</span>
						</Label>
						<Textarea
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							rows={2}
							className='text-sm'
						/>
					</div>

					<Separator />

					<div className='space-y-2'>
						<div className='flex items-center justify-between'>
							<Label className='text-xs font-semibold'>Form Fields</Label>
							<Badge variant='secondary' className='text-xs'>
								{fields.length}
							</Badge>
						</div>
						<div className='space-y-2'>
							{fields.map((field, index) => (
								<FieldRow
									key={field._id}
									field={field}
									index={index}
									canDelete={fields.length > 1}
									onUpdate={(u) => updateField(field._id, u)}
									onDelete={() => removeField(field._id)}
									onAddChoice={() => addChoice(field._id)}
									onRemoveChoice={(ci) => removeChoice(field._id, ci)}
								/>
							))}
						</div>
						<Button type='button' variant='outline' size='sm' className='w-full' onClick={addField}>
							<PlusIcon className='h-3.5 w-3.5' />
							Add Field
						</Button>
					</div>

					{/* Cancel / Save — only when dirty */}
					{isDirty && (
						<div className='flex gap-2 justify-end pt-2 border-t'>
							<Button type='button' variant='outline' size='sm' onClick={reset}>
								Cancel
							</Button>
							<Button type='submit' size='sm' disabled={updateTemplate.isPending}>
								{updateTemplate.isPending && <LoaderCircle className='h-3.5 w-3.5 animate-spin' />}
								Save
							</Button>
						</div>
					)}
				</form>
			</CollapsibleContent>
		</Collapsible>
	)
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
