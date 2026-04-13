'use client'
import { useState } from 'react'
import { PlusIcon, LoaderCircle } from 'lucide-react'
import { RRule } from 'rrule'
import { UUID } from 'crypto'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { ViewScheduleTemplateButton } from '@/components/tasks/view-schedule-template-button'

import {
	useCreateTask,
	useCreateSchedule,
	useBatchCreateTasks,
	useBatchCreateSchedules
} from '@/lib/react-query/mutations'
import {
	useTaskTemplatesForOrgSpecies,
	useEnclosureById,
	useOrgMembers,
	useMemberProfiles
} from '@/lib/react-query/queries'

import {
	TaskScheduleSection,
	WEEKDAYS,
	type ScheduleType,
	type EndsType,
	type TimeWindow
} from './task-schedule-section'

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskType = 'template' | 'custom'

interface CreateTaskButtonProps {
	enclosureId?: UUID
	orgId: UUID
	disabled?: boolean
	onTaskCreated?: () => void
	batchEnclosureIds?: UUID[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateTaskButton({
	enclosureId,
	orgId,
	disabled,
	onTaskCreated,
	batchEnclosureIds
}: CreateTaskButtonProps) {
	const [open, setOpen] = useState(false)

	const isBatch = (batchEnclosureIds?.length ?? 0) > 0
	const effectiveEnclosureId = batchEnclosureIds?.[0] ?? enclosureId

	// Task type
	const [taskType, setTaskType] = useState<TaskType>('template')
	const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')

	// Custom task fields
	const [customName, setCustomName] = useState('')
	const [customDescription, setCustomDescription] = useState('')

	// Common fields
	const [assignedTo, setAssignedTo] = useState<string>('')
	const [priority, setPriority] = useState<string>('medium')

	// Schedule
	const [scheduleType, setScheduleType] = useState<ScheduleType>('one-time')
	const [dueDate, setDueDate] = useState<Date | undefined>(new Date())
	const [timeWindow, setTimeWindow] = useState<TimeWindow>('Any')

	// Flexible recurring
	const [flexInterval, setFlexInterval] = useState('')
	const [flexUnit, setFlexUnit] = useState<'days' | 'weeks' | 'months'>('days')
	const [flexStartDate, setFlexStartDate] = useState<Date | undefined>(new Date())
	const [flexEnds, setFlexEnds] = useState<EndsType>('never')
	const [flexEndDate, setFlexEndDate] = useState<Date | undefined>(undefined)
	const [flexEndCount, setFlexEndCount] = useState('')

	// Fixed recurring
	const [advanceTaskCount, setAdvanceTaskCount] = useState('')
	const [fixedSelectedDays, setFixedSelectedDays] = useState<number[]>([])
	const [fixedEnds, setFixedEnds] = useState<EndsType>('never')
	const [fixedEndDate, setFixedEndDate] = useState<Date | undefined>(undefined)
	const [fixedEndCount, setFixedEndCount] = useState('')

	// Data
	const { data: enclosure } = useEnclosureById(effectiveEnclosureId as UUID, orgId)
	const orgSpeciesId = enclosure?.species_id as UUID | undefined
	const { data: templates } = useTaskTemplatesForOrgSpecies(orgSpeciesId as UUID)
	const { data: orgMembers } = useOrgMembers(orgId)
	const memberIds = orgMembers?.map((m) => m.user_id) ?? []
	const { data: members } = useMemberProfiles(memberIds)

	const createTask = useCreateTask()
	const createSchedule = useCreateSchedule()
	const batchCreateTask = useBatchCreateTasks()
	const batchCreateSchedule = useBatchCreateSchedules()

	const isPending =
		createTask.isPending || createSchedule.isPending || batchCreateTask.isPending || batchCreateSchedule.isPending
	const isEnclosureInactive = !isBatch && enclosure?.is_active === false
	const isCreateDisabled = disabled || isEnclosureInactive

	// ── Helpers ──────────────────────────────────────────────────────────────

	const toggleDay = (dayIndex: number) =>
		setFixedSelectedDays((prev) => (prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex]))

	const buildRruleString = (): string => {
		const byweekday = fixedSelectedDays.map((i) => WEEKDAYS[i].value)
		const opts: ConstructorParameters<typeof RRule>[0] = { freq: RRule.WEEKLY, byweekday }
		if (fixedEnds === 'on-date' && fixedEndDate) opts.until = fixedEndDate
		else if (fixedEnds === 'after-x' && fixedEndCount) opts.count = parseInt(fixedEndCount, 10)
		return new RRule(opts).toString()
	}

	const buildFlexScheduleRule = (): string => `${parseInt(flexInterval, 10)} ${flexUnit}`

	const reset = () => {
		setTaskType('template')
		setSelectedTemplateId('')
		setCustomName('')
		setCustomDescription('')
		setAssignedTo('')
		setPriority('medium')
		setScheduleType('one-time')
		setDueDate(new Date())
		setTimeWindow('Any')
		setFlexInterval('')
		setFlexUnit('days')
		setFlexStartDate(new Date())
		setFlexEnds('never')
		setFlexEndDate(undefined)
		setFlexEndCount('')
		setAdvanceTaskCount('')
		setFixedSelectedDays([])
		setFixedEnds('never')
		setFixedEndDate(undefined)
		setFixedEndCount('')
	}

	const handleOpenChange = (isOpen: boolean) => {
		if (isOpen && isEnclosureInactive) {
			toast.error('Tasks cannot be created for inactive enclosures.')
			return
		}
		if (!isOpen) {
			reset()
		} else {
			// Refresh to actual current time each time the dialog opens,
			// since the component may have been mounted hours ago (page load time).
			setDueDate(new Date())
			setFlexStartDate(new Date())
		}
		setOpen(isOpen)
	}

	// ── Submit ────────────────────────────────────────────────────────────────

	const handleSubmit = async () => {
		if (isEnclosureInactive) {
			toast.error('Tasks cannot be created for inactive enclosures.')
			return
		}

		const isTemplate = taskType === 'template'
		const selectedTemplate = isTemplate ? templates?.find((t) => t.id === selectedTemplateId) : null
		const templateId = isTemplate && selectedTemplateId ? (selectedTemplateId as UUID) : null
		const name = isTemplate ? (selectedTemplate?.type ?? null) : customName.trim() || null
		const description = isTemplate ? (selectedTemplate?.description ?? null) : customDescription.trim() || null
		const assignedToVal = (assignedTo || null) as UUID | null

		if (isTemplate && !selectedTemplateId) {
			toast.error('Please select a task template.')
			return
		}
		if (!isTemplate && !customName.trim()) {
			toast.error('Task name is required for custom tasks.')
			return
		}

		const onSuccess = () => {
			setOpen(false)
			reset()
			onTaskCreated?.()
		}

		if (scheduleType === 'one-time') {
			if (!dueDate) {
				toast.error('Please pick a due date.')
				return
			}
			const oneTimePayload = {
				template_id: templateId,
				name,
				description,
				assigned_to: assignedToVal,
				priority,
				due_date: dueDate.toISOString(),
				time_window: timeWindow
			}
			if (isBatch) {
				batchCreateTask.mutate({ enclosure_ids: batchEnclosureIds!, ...oneTimePayload }, { onSuccess })
			} else {
				createTask.mutate({ enclosure_id: enclosureId!, ...oneTimePayload }, { onSuccess })
			}
		} else if (scheduleType === 'flexible') {
			if (!flexStartDate) {
				toast.error('Please pick a start date.')
				return
			}
			const parsedFlexInterval = parseInt(flexInterval, 10)
			if (!parsedFlexInterval || parsedFlexInterval < 1) {
				toast.error('Repeat every must be at least 1.')
				return
			}
			if (flexEnds === 'on-date' && !flexEndDate) {
				toast.error('Please pick an end date.')
				return
			}
			if (flexEnds === 'after-x') {
				const parsedFlexEndCount = parseInt(flexEndCount, 10)
				if (!parsedFlexEndCount || parsedFlexEndCount < 1) {
					toast.error('Occurrences must be at least 1.')
					return
				}
			}
			const parsedAdvanceCount = parseInt(advanceTaskCount, 10)
			if (!parsedAdvanceCount || parsedAdvanceCount < 1) {
				toast.error('Advance task count must be at least 1.')
				return
			}
			const flexSchedulePayload = {
				template_id: templateId,
				schedule_type: 'relative_interval' as const,
				schedule_rule: buildFlexScheduleRule(),
				task_name: name,
				task_description: description,
				assigned_to: assignedToVal,
				priority,
				time_window: timeWindow,
				start_date: flexStartDate.toISOString(),
				end_date: flexEnds === 'on-date' && flexEndDate ? flexEndDate.toISOString() : null,
				max_occurrences: flexEnds === 'after-x' ? parseInt(flexEndCount, 10) || null : null,
				advance_task_count: parsedAdvanceCount
			}
			if (isBatch) {
				batchCreateSchedule.mutate({ enclosure_ids: batchEnclosureIds!, ...flexSchedulePayload }, { onSuccess })
			} else {
				createSchedule.mutate({ enclosure_id: enclosureId!, ...flexSchedulePayload }, { onSuccess })
			}
		} else if (scheduleType === 'fixed') {
			if (fixedSelectedDays.length === 0) {
				toast.error('Please select at least one weekday.')
				return
			}
			const parsedAdvanceCount = parseInt(advanceTaskCount, 10)
			if (!parsedAdvanceCount || parsedAdvanceCount < 1) {
				toast.error('Advance task count must be at least 1.')
				return
			}
			if (fixedEnds === 'on-date' && !fixedEndDate) {
				toast.error('Please pick an end date.')
				return
			}
			if (fixedEnds === 'after-x') {
				const parsedFixedEndCount = parseInt(fixedEndCount, 10)
				if (!parsedFixedEndCount || parsedFixedEndCount < 1) {
					toast.error('Occurrences must be at least 1.')
					return
				}
			}
			const fixedSchedulePayload = {
				template_id: templateId,
				schedule_type: 'fixed_calendar' as const,
				schedule_rule: buildRruleString(),
				task_name: name,
				task_description: description,
				assigned_to: assignedToVal,
				priority,
				time_window: timeWindow,
				start_date: new Date().toISOString(),
				end_date: fixedEnds === 'on-date' && fixedEndDate ? fixedEndDate.toISOString() : null,
				max_occurrences: fixedEnds === 'after-x' ? parseInt(fixedEndCount, 10) || null : null,
				advance_task_count: parsedAdvanceCount
			}
			if (isBatch) {
				batchCreateSchedule.mutate({ enclosure_ids: batchEnclosureIds!, ...fixedSchedulePayload }, { onSuccess })
			} else {
				createSchedule.mutate({ enclosure_id: enclosureId!, ...fixedSchedulePayload }, { onSuccess })
			}
		}
	}

	// ── Render ────────────────────────────────────────────────────────────────

	return (
		<ResponsiveDialogDrawer
			title='Create New Task'
			description='Set up a new task for your facility. Choose from a template or create a custom task.'
			className='sm:max-w-5xl'
			trigger={
				<Button disabled={isCreateDisabled}>
					<PlusIcon className='h-4 w-4' />
					Create Task
				</Button>
			}
			open={open}
			onOpenChange={handleOpenChange}
			footer={
				<div className='flex gap-2 w-full'>
					<Button type='button' className='flex-1' disabled={isPending || isEnclosureInactive} onClick={handleSubmit}>
						{isPending ? (
							<LoaderCircle className='h-4 w-4 animate-spin' />
						) : isBatch ? (
							`Create Tasks for ${batchEnclosureIds!.length} Enclosure${batchEnclosureIds!.length === 1 ? '' : 's'}`
						) : (
							'Create Task'
						)}
					</Button>
				</div>
			}
		>
			<div data-vaul-no-drag className='overflow-y-auto flex-1 min-h-0 space-y-5 pl-0.5 pr-5 pb-4'>
				{/* ── Task Type ── */}
				<div className='space-y-2'>
					<Label className='text-sm font-semibold'>Task Type</Label>
					<RadioGroup value={taskType} onValueChange={(v) => setTaskType(v as TaskType)} className='space-y-1'>
						{(
							[
								{
									value: 'template',
									label: 'Use Template',
									desc: 'Choose from predefined task templates'
								},
								{
									value: 'custom',
									label: 'Custom Task',
									desc: 'Create a task with a custom name and description'
								}
							] as const
						).map(({ value, label, desc }) => (
							<label
								key={value}
								htmlFor={`tasktype-${value}`}
								className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-2 transition-colors ${
									taskType === value ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
								}`}
							>
								<RadioGroupItem value={value} id={`tasktype-${value}`} />
								<div className='min-w-0'>
									<p className='text-sm font-medium'>{label}</p>
									<p className='text-xs text-muted-foreground'>{desc}</p>
								</div>
							</label>
						))}
					</RadioGroup>
				</div>

				{/* ── Template / Custom fields ── */}
				{taskType === 'template' ? (
					<div className='space-y-1'>
						<Label className='text-sm'>
							Task Template <span className='text-destructive'>*</span>
						</Label>
						{!orgSpeciesId ? (
							<p className='text-xs text-muted-foreground'>Loading templates…</p>
						) : !templates?.length ? (
							<p className='text-xs text-muted-foreground'>No templates for this enclosure&apos;s species.</p>
						) : (
							<div className='flex items-center gap-2'>
								<Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
									<SelectTrigger className='flex-1 min-w-0 cursor-pointer'>
										<SelectValue placeholder='Select a template…' />
									</SelectTrigger>
									<SelectContent>
										{templates.map((t) => (
											<SelectItem key={t.id} value={t.id} className='cursor-pointer'>
												<span className='capitalize'>{t.type}</span>
												{t.description && <span className='ml-2 text-muted-foreground text-xs'>— {t.description}</span>}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{selectedTemplateId && (
									<ViewScheduleTemplateButton
										templateId={selectedTemplateId as UUID}
										taskName={templates.find((t) => t.id === selectedTemplateId)?.type ?? null}
									/>
								)}
							</div>
						)}
					</div>
				) : (
					<div className='space-y-3'>
						<div className='space-y-1'>
							<div className='flex items-center justify-between'>
								<Label className='text-sm'>
									Task Name <span className='text-destructive'>*</span>
								</Label>
								<span className={`text-xs ${customName.length >= 30 ? 'text-destructive' : 'text-muted-foreground'}`}>
									{customName.length}/30
								</span>
							</div>
							<Input
								placeholder='e.g. Clean glass, Morning feeding'
								value={customName}
								maxLength={30}
								onChange={(e) => setCustomName(e.target.value)}
							/>
						</div>
						<div className='space-y-1'>
							<Label className='text-sm'>
								Description <span className='text-muted-foreground font-normal text-xs'>(optional)</span>
							</Label>
							<Textarea
								placeholder='Brief description of this task…'
								value={customDescription}
								onChange={(e) => setCustomDescription(e.target.value)}
								rows={2}
								className='text-sm resize-none'
							/>
						</div>
					</div>
				)}

				{/* ── Assign to Employee ── */}
				<div className='space-y-1'>
					<Label className='text-sm'>
						Assign to Employee <span className='text-muted-foreground font-normal text-xs'>(Optional)</span>
					</Label>
					<Select value={assignedTo} onValueChange={setAssignedTo}>
						<SelectTrigger>
							<SelectValue placeholder='Select an employee…' />
						</SelectTrigger>
						<SelectContent>
							{(members ?? []).map((m) => (
								<SelectItem key={m.id} value={m.id}>
									{m.full_name || `${m.first_name} ${m.last_name}`}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* ── Priority ── */}
				<div className='space-y-1'>
					<Label className='text-sm'>Priority</Label>
					<Select value={priority} onValueChange={setPriority}>
						<SelectTrigger className='w-36'>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value='low'>Low</SelectItem>
							<SelectItem value='medium'>Medium</SelectItem>
							<SelectItem value='high'>High</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<Separator />

				{/* ── Schedule ── */}
				<div className='space-y-2'>
					<Label className='text-sm font-semibold'>Schedule</Label>
					<TaskScheduleSection
						scheduleType={scheduleType}
						onScheduleTypeChange={setScheduleType}
						timeWindow={timeWindow}
						onTimeWindowChange={setTimeWindow}
						dueDate={dueDate}
						onDueDateChange={setDueDate}
						flexInterval={flexInterval}
						onFlexIntervalChange={setFlexInterval}
						flexUnit={flexUnit}
						onFlexUnitChange={setFlexUnit}
						flexStartDate={flexStartDate}
						onFlexStartDateChange={setFlexStartDate}
						flexEnds={flexEnds}
						onFlexEndsChange={setFlexEnds}
						flexEndDate={flexEndDate}
						onFlexEndDateChange={setFlexEndDate}
						flexEndCount={flexEndCount}
						onFlexEndCountChange={setFlexEndCount}
						fixedSelectedDays={fixedSelectedDays}
						onToggleDay={toggleDay}
						fixedEnds={fixedEnds}
						onFixedEndsChange={setFixedEnds}
						fixedEndDate={fixedEndDate}
						onFixedEndDateChange={setFixedEndDate}
						fixedEndCount={fixedEndCount}
						onFixedEndCountChange={setFixedEndCount}
						advanceTaskCount={advanceTaskCount}
						onAdvanceTaskCountChange={setAdvanceTaskCount}
					/>
				</div>
			</div>
		</ResponsiveDialogDrawer>
	)
}
