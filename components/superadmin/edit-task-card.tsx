'use client'

import { useState } from 'react'
import { ChevronDownIcon, LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Separator } from '@/components/ui/separator'
import { useUpdateTaskTemplate } from '@/lib/react-query/mutations'
import { DeleteTemplateButton } from '@/components/superadmin/delete-template-button'
import { useAllTaskTypes } from '@/lib/react-query/queries'
import type { Species, TaskTemplate } from '@/lib/react-query/queries'
import { type FieldDef, emptyField, templateToFields, validateFields } from './template-fields'
import { TaskTypeSelector, DescriptionField, FieldsEditor } from './task-template-form-parts'

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
					<TaskTypeSelector
						value={type}
						onChange={setType}
						availableTypes={availableTypes}
						showNewTypeInput={showNewTypeInput}
						onShowNewTypeInput={setShowNewTypeInput}
						resetValue={template.type}
					/>

					<DescriptionField value={description} onChange={setDescription} />

					<Separator />

					<FieldsEditor
						fields={fields}
						onAdd={addField}
						onRemove={removeField}
						onUpdate={updateField}
						onAddChoice={addChoice}
						onRemoveChoice={removeChoice}
					/>

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
