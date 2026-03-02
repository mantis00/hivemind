'use client'

import { useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useCreateTaskTemplate } from '@/lib/react-query/mutations'
import { useAllTaskTypes } from '@/lib/react-query/queries'
import type { Species } from '@/lib/react-query/queries'
import { type FieldDef, emptyField, validateFields } from './template-fields'
import { TaskTypeSelector, DescriptionField, FieldsEditor } from './task-template-form-parts'

// ─── CreateTaskCard ───────────────────────────────────────────────────────────

interface CreateTaskCardProps {
	species: Species
	/** Task types already used for this species — used to populate the picker and block duplicates */
	usedTypes: string[]
	onSuccess: () => void
	onCancel: () => void
}

export function CreateTaskCard({ species, usedTypes, onSuccess, onCancel }: CreateTaskCardProps) {
	const [taskType, setTaskType] = useState('')
	const [showNewTypeInput, setShowNewTypeInput] = useState(false)
	const [description, setDescription] = useState('')
	const [fields, setFields] = useState<FieldDef[]>([emptyField()])

	const { data: allTypes } = useAllTaskTypes()
	const createTemplate = useCreateTaskTemplate()

	// Global types minus ones already used for this species
	const availableTypes = (allTypes ?? []).filter((t) => !usedTypes.includes(t))

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

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!taskType.trim()) {
			toast.error('Task type is required.')
			return
		}
		if (usedTypes.includes(taskType.trim().toLowerCase())) {
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
				fields: fields.map((f) => ({
					question_key: f.key,
					label: f.label,
					type: f.type,
					required: f.required,
					choices: f.choices
				}))
			},
			{
				onSuccess,
				onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to save template')
			}
		)
	}

	return (
		<form onSubmit={handleSubmit} className='border-t px-3 py-3 space-y-4 bg-muted/20'>
			<div className='overflow-y-auto max-h-[58vh] space-y-4 px-1 -mx-1'>
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
				/>
			</div>

			<div className='flex gap-2 justify-end pt-2 border-t'>
				<Button type='button' variant='outline' size='sm' onClick={onCancel}>
					Cancel
				</Button>
				<Button type='submit' size='sm' disabled={createTemplate.isPending}>
					{createTemplate.isPending && <LoaderCircle className='h-3.5 w-3.5 animate-spin' />}
					Save Template
				</Button>
			</div>
		</form>
	)
}
