'use client'

import { useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useCreateTaskTemplate } from '@/lib/react-query/mutations'
import { useAllTaskTypes } from '@/lib/react-query/queries'
import type { Species } from '@/lib/react-query/queries'
import { type FieldDef, emptyField, validateFields, encodeChoicesForSave } from './template-fields'
import { TaskTypeSelector, DescriptionField, FieldsEditor } from './task-template-form-parts'

// ─── CreateTaskTemplateCard ───────────────────────────────────────────────────────────

interface CreateTaskTemplateCardProps {
	species: Species
	/** Task types already used for this species — used to populate the picker and block duplicates */
	usedTypes: string[]
	onSuccess: () => void
	onCancel: () => void
}

export function CreateTaskTemplateCard({ species, usedTypes, onSuccess, onCancel }: CreateTaskTemplateCardProps) {
	const [taskType, setTaskType] = useState('')
	const [showNewTypeInput, setShowNewTypeInput] = useState(false)
	const [description, setDescription] = useState('')
	const [fields, setFields] = useState<FieldDef[]>([emptyField()])

	const { data: allTypes } = useAllTaskTypes()
	const createTemplate = useCreateTaskTemplate()

	// Global types minus ones already used for this species (case-insensitive), deduped by lowercase
	const usedLower = usedTypes.map((u) => u.toLowerCase())
	const seenLower = new Set<string>()
	const availableTypes = (allTypes ?? []).filter((t) => {
		const lower = t.toLowerCase()
		if (usedLower.includes(lower)) return false
		if (seenLower.has(lower)) return false
		seenLower.add(lower)
		return true
	})

	const addField = () => setFields((p) => [...p, emptyField()])
	const removeField = (id: string) => setFields((p) => p.filter((f) => f._id !== id))
	const updateField = (id: string, u: Partial<FieldDef>) =>
		setFields((p) => p.map((f) => (f._id === id ? { ...f, ...u } : f)))
	const moveField = (id: string, dir: 'up' | 'down') =>
		setFields((prev) => {
			const idx = prev.findIndex((f) => f._id === id)
			if (idx < 0) return prev
			const next = [...prev]
			const swapIdx = dir === 'up' ? idx - 1 : idx + 1
			if (swapIdx < 0 || swapIdx >= next.length) return prev
			;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
			return next
		})
	const addChoice = (id: string) => {
		const field = fields.find((f) => f._id === id)
		if (!field || !field.newChoice.trim()) return
		const trimmed = field.newChoice.trim()
		if (field.choices.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
			toast.error(`"${trimmed}" is already an option.`)
			return
		}
		setFields((p) => p.map((f) => (f._id !== id ? f : { ...f, choices: [...f.choices, trimmed], newChoice: '' })))
	}
	const removeChoice = (fieldId: string, i: number) =>
		setFields((p) => p.map((f) => (f._id !== fieldId ? f : { ...f, choices: f.choices.filter((_, ci) => ci !== i) })))

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!taskType.trim()) {
			toast.error('Task type is required.')
			return
		}
		// If user typed a new type, block it if that type already exists globally — they should pick it from the dropdown
		if (showNewTypeInput && (allTypes ?? []).map((t) => t.toLowerCase()).includes(taskType.trim().toLowerCase())) {
			toast.error(`"${taskType.trim()}" already exists — select it from the existing types dropdown instead.`)
			return
		}
		// Also block if this species already has a template with this type
		if (usedTypes.map((t) => t.toLowerCase()).includes(taskType.trim().toLowerCase())) {
			toast.error(`A "${taskType.trim()}" template already exists for this species.`)
			return
		}
		const fieldErr = validateFields(fields)
		if (fieldErr) {
			toast.error(fieldErr)
			return
		}

		createTemplate.mutate(
			{
				speciesId: species.id,
				type: taskType.trim(),
				description: description.trim(),
				fields: fields.map((f, index) => ({
					question_key: f.key,
					label: f.label,
					type: f.type,
					required: f.required,
					choices: encodeChoicesForSave(f),
					order: index
				}))
			},
			{
				onSuccess,
				onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to save template')
			}
		)
	}

	return (
		<form onSubmit={handleSubmit} className='border-t px-3 py-3 bg-muted/20 flex flex-col flex-1 gap-4'>
			<div className='flex-1 overflow-y-auto min-h-0 space-y-4 px-1 -mx-1'>
				{/* Task Type */}
				<TaskTypeSelector
					value={taskType}
					onChange={setTaskType}
					availableTypes={availableTypes}
					showNewTypeInput={showNewTypeInput}
					onShowNewTypeInput={setShowNewTypeInput}
				/>

				{/* Description */}
				<DescriptionField value={description} onChange={setDescription} />

				<Separator />

				{/* Fields */}
				<FieldsEditor
					fields={fields}
					onAdd={addField}
					onRemove={removeField}
					onUpdate={updateField}
					onAddChoice={addChoice}
					onRemoveChoice={removeChoice}
					onMove={moveField}
				/>
			</div>

			<div className='flex w-full gap-2 pt-2 border-t'>
				<Button type='button' variant='outline' className='flex-1' onClick={onCancel}>
					Cancel
				</Button>
				<Button type='submit' className='flex-1' disabled={createTemplate.isPending}>
					{createTemplate.isPending && <LoaderCircle className='h-4 w-4 animate-spin' />}
					Save Template
				</Button>
			</div>
		</form>
	)
}
