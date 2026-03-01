'use client'

import { useState } from 'react'
import { ChevronDownIcon, LoaderCircle, PlusIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { FieldRow, type FieldDef, emptyField, templateToFields, validateFields } from './template-fields'

// ─── EditTaskCard ─────────────────────────────────────────────────────────────

interface EditTaskCardProps {
	template: TaskTemplate
	species: Species
	allTemplateTypes: string[]
}

export function EditTaskCard({ template, species, allTemplateTypes }: EditTaskCardProps) {
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
									placeholder='e.g. feeding, cleaning, inspection'
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
