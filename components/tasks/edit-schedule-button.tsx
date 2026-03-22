'use client'

import { useState } from 'react'
import { UUID } from 'crypto'
import { LoaderCircle, Pencil } from 'lucide-react'
import { RRule } from 'rrule'
import { toast } from 'sonner'

import { type EnclosureSchedule } from '@/lib/react-query/queries'
import { useUpdateSchedule } from '@/lib/react-query/mutations'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
	WEEKDAYS,
	EndsSection,
	TimeWindowField,
	type EndsType,
	type TimeWindow
} from '@/components/tasks/task-schedule-section'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_ABBR_TO_INDEX: Record<string, number> = {
	MO: 0,
	TU: 1,
	WE: 2,
	TH: 3,
	FR: 4,
	SA: 5,
	SU: 6
}

function parseRRuleDays(rule: string): number[] {
	const match = rule.match(/BYDAY=([^;]+)/)
	if (!match) return []
	return match[1]
		.split(',')
		.map((d) => DAY_ABBR_TO_INDEX[d.trim()])
		.filter((n) => n !== undefined)
}

function parseFlexRule(rule: string): { interval: string; unit: 'days' | 'weeks' | 'months' } {
	const parts = rule.trim().split(' ')
	const interval = parts[0] ?? '1'
	const rawUnit = (parts[1] ?? 'days').toLowerCase()
	const unit = (['days', 'weeks', 'months'] as const).find((u) => rawUnit.startsWith(u.replace(/s$/, ''))) ?? 'days'
	return { interval, unit }
}

function buildRruleString(selectedDays: number[]): string {
	const byweekday = selectedDays.map((i) => WEEKDAYS[i].value)
	return new RRule({ freq: RRule.WEEKLY, byweekday }).toString()
}

function deriveEndsType(schedule: EnclosureSchedule): EndsType {
	if (schedule.max_occurrences != null) return 'after-x'
	if (schedule.end_date) return 'on-date'
	return 'never'
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EditScheduleButton({ schedule }: { schedule: EnclosureSchedule }) {
	const [open, setOpen] = useState(false)

	const isTemplateSchedule = !!schedule.template_id
	const isFixed = schedule.schedule_type === 'fixed_calendar'
	const isFlexible = schedule.schedule_type === 'relative_interval'

	// ── Common ───────────────────────────────────────────────────────────────
	const [taskName, setTaskName] = useState(schedule.task_name ?? '')
	const [taskDescription, setTaskDescription] = useState(schedule.task_description ?? '')
	const [timeWindow, setTimeWindow] = useState<TimeWindow>((schedule.time_window as TimeWindow) ?? 'Any')
	const [priority, setPriority] = useState<string>(schedule.priority ?? 'medium')

	// ── Ends ─────────────────────────────────────────────────────────────────
	const [endsType, setEndsType] = useState<EndsType>(() => deriveEndsType(schedule))
	const [endDate, setEndDate] = useState<Date | undefined>(schedule.end_date ? new Date(schedule.end_date) : undefined)
	const [endCount, setEndCount] = useState<string>(
		schedule.max_occurrences != null ? String(schedule.max_occurrences) : ''
	)

	// ── Fixed calendar ────────────────────────────────────────────────────────
	const [selectedDays, setSelectedDays] = useState<number[]>(() =>
		isFixed ? parseRRuleDays(schedule.schedule_rule) : []
	)
	const [advanceTaskCount, setAdvanceTaskCount] = useState<string>(String(schedule.advance_task_count ?? 7))

	// ── Flexible recurring ────────────────────────────────────────────────────
	const initialFlex = isFlexible ? parseFlexRule(schedule.schedule_rule) : { interval: '1', unit: 'days' as const }
	const [flexInterval, setFlexInterval] = useState<string>(initialFlex.interval)
	const [flexUnit, setFlexUnit] = useState<'days' | 'weeks' | 'months'>(initialFlex.unit)

	const updateSchedule = useUpdateSchedule()

	const resetForm = () => {
		setTaskName(schedule.task_name ?? '')
		setTaskDescription(schedule.task_description ?? '')
		setTimeWindow((schedule.time_window as TimeWindow) ?? 'Any')
		setPriority(schedule.priority ?? 'medium')
		setEndsType(deriveEndsType(schedule))
		setEndDate(schedule.end_date ? new Date(schedule.end_date) : undefined)
		setEndCount(schedule.max_occurrences != null ? String(schedule.max_occurrences) : '')
		if (isFixed) {
			setSelectedDays(parseRRuleDays(schedule.schedule_rule))
			setAdvanceTaskCount(String(schedule.advance_task_count ?? 7))
		}
		if (isFlexible) {
			const p = parseFlexRule(schedule.schedule_rule)
			setFlexInterval(p.interval)
			setFlexUnit(p.unit)
		}
	}

	const handleOpenChange = (isOpen: boolean) => {
		if (isOpen) resetForm()
		setOpen(isOpen)
	}

	const toggleDay = (i: number) =>
		setSelectedDays((prev) => (prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i]))

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()

		if (isFixed && selectedDays.length === 0) {
			toast.error('Please select at least one day of the week.')
			return
		}
		if (isFlexible) {
			const parsed = parseInt(flexInterval, 10)
			if (!parsed || parsed < 1) {
				toast.error('Repeat every must be at least 1.')
				return
			}
		}
		if (endsType === 'on-date' && !endDate) {
			toast.error('Please pick an end date.')
			return
		}
		if (endsType === 'after-x') {
			const parsed = parseInt(endCount, 10)
			if (!parsed || parsed < 1) {
				toast.error('Occurrences must be at least 1.')
				return
			}
		}
		if (isFixed) {
			const parsed = parseInt(advanceTaskCount, 10)
			if (!parsed || parsed < 1) {
				toast.error('Advance task count must be at least 1.')
				return
			}
		}

		const newScheduleRule = isFixed ? buildRruleString(selectedDays) : `${parseInt(flexInterval, 10)} ${flexUnit}`

		updateSchedule.mutate(
			{
				scheduleId: schedule.id as UUID,
				task_name: isTemplateSchedule ? schedule.task_name : taskName.trim() || null,
				task_description: isTemplateSchedule ? schedule.task_description : taskDescription.trim() || null,
				time_window: timeWindow,
				priority,
				max_occurrences: endsType === 'after-x' ? parseInt(endCount, 10) : null,
				end_date: endsType === 'on-date' && endDate ? endDate.toISOString() : null,
				schedule_rule: newScheduleRule,
				advance_task_count: isFixed ? parseInt(advanceTaskCount, 10) : (schedule.advance_task_count ?? 7)
			},
			{ onSuccess: () => setOpen(false) }
		)
	}

	return (
		<>
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant='ghost'
							size='icon'
							className='h-5 w-5 text-muted-foreground hover:text-foreground'
							onClick={(e) => {
								e.stopPropagation()
								handleOpenChange(true)
							}}
						>
							<Pencil className='h-3 w-3' />
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p>Edit schedule</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>

			<ResponsiveDialogDrawer
				title={`Edit Schedule${schedule.task_name ? `: ${schedule.task_name}` : ''}`}
				description='Update schedule attributes. Changes take effect on the next run.'
				trigger={null}
				open={open}
				onOpenChange={handleOpenChange}
				className='sm:max-w-lg'
				footer={
					<div className='flex gap-2 w-full'>
						<Button
							type='button'
							variant='outline'
							className='flex-1'
							onClick={() => handleOpenChange(false)}
							disabled={updateSchedule.isPending}
						>
							Cancel
						</Button>
						<Button type='submit' form='edit-schedule-form' className='flex-1' disabled={updateSchedule.isPending}>
							{updateSchedule.isPending ? <LoaderCircle className='h-4 w-4 animate-spin' /> : 'Save Changes'}
						</Button>
					</div>
				}
			>
				<form
					id='edit-schedule-form'
					onSubmit={handleSubmit}
					className='overflow-y-auto flex-1 min-h-0 space-y-5 px-1 pb-1 pr-2'
					data-vaul-no-drag
				>
					{' '}
					{/* absorbs initial dialog auto-focus so inputs aren't highlighted on open */}
					<span tabIndex={0} className='sr-only' aria-hidden /> {/* ── Name / Description ── */}
					<div className='space-y-3'>
						<div className='space-y-1'>
							<div className='flex items-center justify-between'>
								<Label htmlFor='edit_task_name' className='text-sm'>
									Task Name
								</Label>
								{isTemplateSchedule && <span className='text-xs text-muted-foreground'>Set by template</span>}
							</div>
							<div className={isTemplateSchedule ? 'cursor-not-allowed' : ''}>
								<Input
									id='edit_task_name'
									value={taskName}
									onChange={(e) => setTaskName(e.target.value)}
									disabled={updateSchedule.isPending}
									placeholder='e.g. Daily feeding'
									readOnly={isTemplateSchedule}
									className={isTemplateSchedule ? 'opacity-60 pointer-events-none' : ''}
								/>
							</div>
						</div>
						<div className='space-y-1'>
							<div className='flex items-center justify-between'>
								<Label htmlFor='edit_task_description' className='text-sm'>
									Description
								</Label>
								{isTemplateSchedule && <span className='text-xs text-muted-foreground'>Set by template</span>}
							</div>
							<div className={isTemplateSchedule ? 'cursor-not-allowed' : ''}>
								<Textarea
									id='edit_task_description'
									value={taskDescription}
									onChange={(e) => setTaskDescription(e.target.value)}
									disabled={updateSchedule.isPending}
									rows={2}
									placeholder='Optional description…'
									readOnly={isTemplateSchedule}
									className={isTemplateSchedule ? 'opacity-60 pointer-events-none resize-none' : 'resize-none'}
								/>
							</div>
						</div>
					</div>
					<Separator />
					{/* ── Priority ── */}
					<div className='space-y-1'>
						<Label className='text-sm'>Priority</Label>
						<Select value={priority} onValueChange={setPriority} disabled={updateSchedule.isPending}>
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
					{/* ── Fixed calendar fields ── */}
					{isFixed && (
						<div className='rounded-lg border p-4 space-y-4'>
							<div className='space-y-2'>
								<Label className='text-sm'>Days of the week</Label>
								<div className='flex gap-2 flex-wrap'>
									{WEEKDAYS.map((day, i) => (
										<button
											key={day.label}
											type='button'
											onClick={() => toggleDay(i)}
											disabled={updateSchedule.isPending}
											className={`h-9 w-9 rounded-full text-xs font-medium border transition-colors ${
												selectedDays.includes(i)
													? 'bg-primary text-primary-foreground border-primary'
													: 'border-border hover:bg-muted'
											}`}
										>
											{day.label}
										</button>
									))}
								</div>
								{selectedDays.length > 0 && (
									<div className='flex gap-1 flex-wrap'>
										{selectedDays
											.slice()
											.sort((a, b) => a - b)
											.map((i) => (
												<Badge key={i} variant='secondary' className='text-xs'>
													{WEEKDAYS[i].label}
												</Badge>
											))}
									</div>
								)}
							</div>

							<EndsSection
								id='edit-fixed'
								value={endsType}
								onChange={setEndsType}
								endDate={endDate}
								onEndDateChange={setEndDate}
								endCount={endCount}
								onEndCountChange={setEndCount}
							/>

							<div className='space-y-1'>
								<Label className='text-sm'>
									Advance Task Count <span className='text-destructive'>*</span>
								</Label>
								<Input
									type='number'
									min={1}
									placeholder='e.g. 7'
									value={advanceTaskCount}
									onChange={(e) => setAdvanceTaskCount(e.target.value)}
									disabled={updateSchedule.isPending}
									className='w-32'
								/>
								<p className='text-xs text-muted-foreground'>
									How many future tasks to generate at a time for this schedule.
								</p>
							</div>

							<TimeWindowField value={timeWindow} onChange={setTimeWindow} />
						</div>
					)}
					{/* ── Flexible recurring fields ── */}
					{isFlexible && (
						<div className='rounded-lg border p-4 space-y-4'>
							<div className='flex gap-3 items-end'>
								<div className='space-y-1'>
									<Label className='text-sm'>
										Repeat every <span className='text-destructive'>*</span>
									</Label>
									<Input
										type='number'
										min='1'
										placeholder='e.g. 1'
										value={flexInterval}
										onChange={(e) => setFlexInterval(e.target.value)}
										disabled={updateSchedule.isPending}
										className='w-20'
									/>
								</div>
								<div className='space-y-1 flex-1'>
									<Label className='text-sm'>&nbsp;</Label>
									<Select
										value={flexUnit}
										onValueChange={(v) => setFlexUnit(v as typeof flexUnit)}
										disabled={updateSchedule.isPending}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value='days'>Days</SelectItem>
											<SelectItem value='weeks'>Weeks</SelectItem>
											<SelectItem value='months'>Months</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>

							<EndsSection
								id='edit-flex'
								value={endsType}
								onChange={setEndsType}
								endDate={endDate}
								onEndDateChange={setEndDate}
								endCount={endCount}
								onEndCountChange={setEndCount}
							/>

							<TimeWindowField value={timeWindow} onChange={setTimeWindow} />
						</div>
					)}
				</form>
			</ResponsiveDialogDrawer>
		</>
	)
}
