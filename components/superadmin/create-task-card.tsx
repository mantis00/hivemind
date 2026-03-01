'use client'

import { useState } from 'react'
import { LoaderCircle, PlusIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { useCreateTaskTemplate } from '@/lib/react-query/mutations'
import { useAllTaskTypes } from '@/lib/react-query/queries'
import type { Species } from '@/lib/react-query/queries'
import { FieldRow, type FieldDef, emptyField, validateFields } from './template-fields'

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
				<div className='space-y-1'>
					<Label className='text-xs'>
						Task Type <span className='text-destructive'>*</span>
					</Label>
					{showNewTypeInput || availableTypes.length === 0 ? (
						<div className='flex gap-2'>
							<Input
								placeholder='e.g. feeding, cleaning, inspection'
								value={taskType}
								onChange={(e) => setTaskType(e.target.value)}
								autoFocus
								className='h-8 text-sm flex-1'
							/>
							{availableTypes.length > 0 && (
								<Button
									type='button'
									variant='outline'
									size='sm'
									className='shrink-0'
									onClick={() => {
										setShowNewTypeInput(false)
										setTaskType('')
									}}
								>
									Pick existing
								</Button>
							)}
						</div>
					) : (
						<Select
							value={taskType}
							onValueChange={(val) => {
								if (val === '__new__') {
									setShowNewTypeInput(true)
									setTaskType('')
								} else {
									setTaskType(val)
								}
							}}
						>
							<SelectTrigger className='h-8 text-sm'>
								<SelectValue placeholder='Select a type...' />
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

				{/* Description */}
				<div className='space-y-1'>
					<Label className='text-xs'>
						Description <span className='text-muted-foreground font-normal'>(optional)</span>
					</Label>
					<Textarea
						placeholder='Brief description of what this template is for…'
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						rows={2}
						className='text-sm'
					/>
				</div>

				<Separator />

				{/* Fields */}
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
