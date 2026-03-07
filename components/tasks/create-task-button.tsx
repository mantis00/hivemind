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

import { useCreateTask, useCreateSchedule } from '@/lib/react-query/mutations'
import { useTaskTemplatesForOrgSpecies, useEnclosureById, useOrgMemberProfiles } from '@/lib/react-query/queries'

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
	enclosureId: UUID
	orgId: UUID
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateTaskButton({ enclosureId, orgId }: CreateTaskButtonProps) {
	const [open, setOpen] = useState(false)

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
	const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
	const [timeWindow, setTimeWindow] = useState<TimeWindow>('Any')

	// Flexible recurring
	const [flexInterval, setFlexInterval] = useState('1')
	const [flexUnit, setFlexUnit] = useState<'days' | 'weeks' | 'months'>('days')
	const [flexEnds, setFlexEnds] = useState<EndsType>('never')
	const [flexEndDate, setFlexEndDate] = useState<Date | undefined>(undefined)
	const [flexEndCount, setFlexEndCount] = useState('10')

	// Fixed recurring
	const [fixedSelectedDays, setFixedSelectedDays] = useState<number[]>([])
	const [fixedEnds, setFixedEnds] = useState<EndsType>('never')
	const [fixedEndDate, setFixedEndDate] = useState<Date | undefined>(undefined)
	const [fixedEndCount, setFixedEndCount] = useState('10')

	// Data
	const { data: enclosure } = useEnclosureById(enclosureId, orgId)
	const orgSpeciesId = enclosure?.species_id as UUID | undefined
	const { data: templates } = useTaskTemplatesForOrgSpecies(orgSpeciesId as UUID)
	const { data: members } = useOrgMemberProfiles(orgId)

	const createTask = useCreateTask()
	const createSchedule = useCreateSchedule()

	const isPending = createTask.isPending || createSchedule.isPending

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

	const buildFlexScheduleRule = (): string => `${parseInt(flexInterval, 10) || 1} ${flexUnit}`

	const reset = () => {
		setTaskType('template')
		setSelectedTemplateId('')
		setCustomName('')
		setCustomDescription('')
		setAssignedTo('')
		setPriority('medium')
		setScheduleType('one-time')
		setDueDate(undefined)
		setTimeWindow('Any')
		setFlexInterval('1')
		setFlexUnit('days')
		setFlexEnds('never')
		setFlexEndDate(undefined)
		setFlexEndCount('10')
		setFixedSelectedDays([])
		setFixedEnds('never')
		setFixedEndDate(undefined)
		setFixedEndCount('10')
	}

	const handleOpenChange = (isOpen: boolean) => {
		if (!isOpen) reset()
		setOpen(isOpen)
	}

	// ── Submit ────────────────────────────────────────────────────────────────

	const handleSubmit = async () => {
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
		}

		if (scheduleType === 'one-time') {
			if (!dueDate) {
				toast.error('Please pick a due date.')
				return
			}
			createTask.mutate(
				{
					enclosure_id: enclosureId,
					template_id: templateId,
					name,
					description,
					assigned_to: assignedToVal,
					priority,
					due_date: dueDate.toISOString(),
					time_window: timeWindow
				},
				{ onSuccess }
			)
		} else if (scheduleType === 'flexible') {
			createSchedule.mutate(
				{
					enclosure_id: enclosureId,
					template_id: templateId,
					schedule_type: 'relative_interval',
					schedule_rule: buildFlexScheduleRule(),
					task_name: name,
					task_description: description,
					assigned_to: assignedToVal,
					priority,
					time_window: timeWindow,
					end_date: flexEnds === 'on-date' && flexEndDate ? flexEndDate.toISOString() : null,
					max_occurrences: flexEnds === 'after-x' ? parseInt(flexEndCount, 10) || null : null
				},
				{ onSuccess }
			)
		} else if (scheduleType === 'fixed') {
			if (fixedSelectedDays.length === 0) {
				toast.error('Please select at least one weekday.')
				return
			}
			createSchedule.mutate(
				{
					enclosure_id: enclosureId,
					template_id: templateId,
					schedule_type: 'fixed_calendar',
					schedule_rule: buildRruleString(),
					task_name: name,
					task_description: description,
					assigned_to: assignedToVal,
					priority,
					time_window: timeWindow,
					end_date: fixedEnds === 'on-date' && fixedEndDate ? fixedEndDate.toISOString() : null,
					max_occurrences: fixedEnds === 'after-x' ? parseInt(fixedEndCount, 10) || null : null
				},
				{ onSuccess }
			)
		}
	}

	// ── Render ────────────────────────────────────────────────────────────────

	return (
		<ResponsiveDialogDrawer
			title='Create New Task'
			description='Set up a new task for your facility. Choose from a template or create a custom task.'
			className='sm:max-w-5xl'
			trigger={
				<Button>
					<PlusIcon className='h-4 w-4' />
					Create Task
				</Button>
			}
			open={open}
			onOpenChange={handleOpenChange}
			footer={
				<div className='flex gap-2 w-full'>
					<Button
						type='button'
						variant='outline'
						className='flex-1'
						onClick={() => setOpen(false)}
						disabled={isPending}
					>
						Cancel
					</Button>
					<Button type='button' className='flex-1' disabled={isPending} onClick={handleSubmit}>
						{isPending ? <LoaderCircle className='h-4 w-4 animate-spin' /> : 'Create Task'}
					</Button>
				</div>
			}
		>
			<div data-vaul-no-drag className='overflow-y-auto flex-1 min-h-0 space-y-5 pr-1'>
				{/* ── Task Type ── */}
				<div className='space-y-2'>
					<Label className='text-sm font-semibold'>Task Type</Label>
					<RadioGroup value={taskType} onValueChange={(v) => setTaskType(v as TaskType)} className='space-y-2'>
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
								className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
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
							<Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
								<SelectTrigger>
									<SelectValue placeholder='Select a template…' />
								</SelectTrigger>
								<SelectContent>
									{templates.map((t) => (
										<SelectItem key={t.id} value={t.id}>
											<span className='capitalize'>{t.type}</span>
											{t.description && <span className='ml-2 text-muted-foreground text-xs'>— {t.description}</span>}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					</div>
				) : (
					<div className='space-y-3'>
						<div className='space-y-1'>
							<Label className='text-sm'>
								Task Name <span className='text-destructive'>*</span>
							</Label>
							<Input
								placeholder='e.g. Clean glass, Morning feeding'
								value={customName}
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
					/>
				</div>
			</div>
		</ResponsiveDialogDrawer>
	)
}
