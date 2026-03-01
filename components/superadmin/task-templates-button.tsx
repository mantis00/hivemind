'use client'

import { useState } from 'react'
import { ArrowLeftIcon, ClipboardListIcon, LoaderCircle, PlusIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { useCreateTaskTemplate } from '@/lib/react-query/mutations'
import { useAllTaskTypes, useTaskTemplatesForSpecies, type Species } from '@/lib/react-query/queries'
import { TemplateCard, FieldRow, type FieldDef, emptyField, validateFields } from './template-card'

// ─── Types ────────────────────────────────────────────────────────────────────

type View = 'list' | 'create'

// ─── Main Component ───────────────────────────────────────────────────────────

interface TaskTemplatesButtonProps {
	species: Species
	usedTypes?: string[]
}

export function TaskTemplatesButton({ species, usedTypes = [] }: TaskTemplatesButtonProps) {
	const [open, setOpen] = useState(false)
	const [view, setView] = useState<View>('list')

	// Create-form state
	const [taskType, setTaskType] = useState('')
	const [showNewTypeInput, setShowNewTypeInput] = useState(false)
	const [description, setDescription] = useState('')
	const [fields, setFields] = useState<FieldDef[]>([emptyField()])

	const { data: templates, isLoading } = useTaskTemplatesForSpecies(species.id)
	const { data: allTypes } = useAllTaskTypes()
	const createTemplate = useCreateTaskTemplate()

	// Global types minus ones already used for this species
	const availableTypes = (allTypes ?? []).filter((t) => !usedTypes.includes(t))
	const templateCount = templates?.length ?? 0

	// ── Navigation ────────────────────────────────────────────────────────────

	const resetCreate = () => {
		setTaskType('')
		setShowNewTypeInput(false)
		setDescription('')
		setFields([emptyField()])
	}

	const goToList = () => {
		setView('list')
		resetCreate()
	}

	const handleOpenChange = (isOpen: boolean) => {
		if (!isOpen) goToList()
		setOpen(isOpen)
	}

	// ── Create-form field helpers ──────────────────────────────────────────────

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

	// ── Submit create ──────────────────────────────────────────────────────────

	const handleSubmitCreate = (e: React.FormEvent) => {
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
				onSuccess: goToList,
				onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to save template')
			}
		)
	}

	// ── Render ────────────────────────────────────────────────────────────────

	return (
		<ResponsiveDialogDrawer
			title={view === 'list' ? 'Task Templates' : 'New Template'}
			description={
				view === 'list' ? `${species.common_name} · ${species.scientific_name}` : `For ${species.common_name}`
			}
			className='sm:max-w-5xl'
			trigger={
				<Button size='sm' variant='outline'>
					<ClipboardListIcon className='h-3.5 w-3.5' />
					Templates
					{templateCount > 0 && (
						<Badge variant='secondary' className='ml-1 h-4 px-1.5 text-[10px]'>
							{templateCount}
						</Badge>
					)}
				</Button>
			}
			open={open}
			onOpenChange={handleOpenChange}
		>
			<Separator />
			{view === 'list' && (
				<Button type='button' className='w-full mb-1' onClick={() => setView('create')}>
					<PlusIcon className='h-4 w-4' />
					New Template
				</Button>
			)}
			{/* ── List view ── */}
			{view === 'list' && (
				<div className='flex flex-col gap-3'>
					{isLoading ? (
						<div className='space-y-2'>
							{[...Array(3)].map((_, i) => (
								<div key={i} className='rounded-lg border bg-muted/30 h-12 animate-pulse' />
							))}
						</div>
					) : templateCount === 0 ? (
						<div className='rounded-lg border border-dashed p-6 text-center'>
							<p className='text-sm text-muted-foreground'>No templates yet for this species.</p>
						</div>
					) : (
						<div className='overflow-y-auto max-h-[50vh] space-y-2 pr-1'>
							{templates!.map((template) => (
								<TemplateCard
									key={template.id}
									template={template}
									species={species}
									allTemplateTypes={templates!.map((t) => t.type)}
								/>
							))}
						</div>
					)}
				</div>
			)}

			{/* ── Create view ── */}
			{view === 'create' && (
				<form onSubmit={handleSubmitCreate} className='flex flex-col gap-5'>
					<div className='overflow-y-auto max-h-[58vh] space-y-5 py-1 pr-1'>
						{/* Task Type */}
						<div className='space-y-2'>
							<Label>
								Task Type <span className='text-destructive'>*</span>
							</Label>
							{showNewTypeInput || availableTypes.length === 0 ? (
								<div className='flex gap-2'>
									<Input
										placeholder='e.g. feeding, cleaning, inspection'
										value={taskType}
										onChange={(e) => setTaskType(e.target.value)}
										autoFocus
										className='flex-1'
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
									<SelectTrigger>
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
						<div className='space-y-2'>
							<Label>
								Description <span className='text-muted-foreground text-xs font-normal'>(optional)</span>
							</Label>
							<Textarea
								placeholder='Brief description of what this template is for…'
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								rows={2}
							/>
						</div>

						<Separator />

						{/* Fields */}
						<div className='space-y-3'>
							<div className='flex items-center justify-between'>
								<Label className='text-sm font-semibold'>Form Fields</Label>
								<Badge variant='secondary'>
									{fields.length} {fields.length === 1 ? 'field' : 'fields'}
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
								<PlusIcon className='h-4 w-4' />
								Add Field
							</Button>
						</div>
					</div>

					<div className='flex gap-2 justify-end pt-2 border-t'>
						<Button type='button' variant='outline' onClick={goToList}>
							Cancel
						</Button>
						<Button type='submit' disabled={createTemplate.isPending}>
							{createTemplate.isPending && <LoaderCircle className='h-4 w-4 animate-spin' />}
							Save Template
						</Button>
					</div>
				</form>
			)}
		</ResponsiveDialogDrawer>
	)
}
