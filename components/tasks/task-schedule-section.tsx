'use client'

import * as React from 'react'
import { RRule } from 'rrule'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'

// ─── Shared Types ─────────────────────────────────────────────────────────────

export type ScheduleType = 'one-time' | 'flexible' | 'fixed'
export type EndsType = 'never' | 'on-date' | 'after-x'
export type TimeWindow = 'Morning' | 'Afternoon' | 'Any'

export const WEEKDAYS = [
	{ label: 'Mo', value: RRule.MO },
	{ label: 'Tu', value: RRule.TU },
	{ label: 'We', value: RRule.WE },
	{ label: 'Th', value: RRule.TH },
	{ label: 'Fr', value: RRule.FR },
	{ label: 'Sa', value: RRule.SA },
	{ label: 'Su', value: RRule.SU }
] as const

// ─── Props ────────────────────────────────────────────────────────────────────

export interface TaskScheduleSectionProps {
	scheduleType: ScheduleType
	onScheduleTypeChange: (v: ScheduleType) => void
	timeWindow: TimeWindow
	onTimeWindowChange: (v: TimeWindow) => void
	// One-time
	dueDate: Date | undefined
	onDueDateChange: (v: Date | undefined) => void
	// Flexible
	flexInterval: string
	onFlexIntervalChange: (v: string) => void
	flexUnit: 'days' | 'weeks' | 'months'
	onFlexUnitChange: (v: 'days' | 'weeks' | 'months') => void
	flexStartDate: Date | undefined
	onFlexStartDateChange: (v: Date | undefined) => void
	flexEnds: EndsType
	onFlexEndsChange: (v: EndsType) => void
	flexEndDate: Date | undefined
	onFlexEndDateChange: (v: Date | undefined) => void
	flexEndCount: string
	onFlexEndCountChange: (v: string) => void
	// Fixed
	fixedSelectedDays: number[]
	onToggleDay: (i: number) => void
	fixedEnds: EndsType
	onFixedEndsChange: (v: EndsType) => void
	fixedEndDate: Date | undefined
	onFixedEndDateChange: (v: Date | undefined) => void
	fixedEndCount: string
	onFixedEndCountChange: (v: string) => void
	advanceTaskCount: string
	onAdvanceTaskCountChange: (v: string) => void
}

// ─── TaskScheduleSection ─────────────────────────────────────────────────────

export function TaskScheduleSection({
	scheduleType,
	onScheduleTypeChange,
	timeWindow,
	onTimeWindowChange,
	dueDate,
	onDueDateChange,
	flexInterval,
	onFlexIntervalChange,
	flexUnit,
	onFlexUnitChange,
	flexStartDate,
	onFlexStartDateChange,
	flexEnds,
	onFlexEndsChange,
	flexEndDate,
	onFlexEndDateChange,
	flexEndCount,
	onFlexEndCountChange,
	fixedSelectedDays,
	onToggleDay,
	fixedEnds,
	onFixedEndsChange,
	fixedEndDate,
	onFixedEndDateChange,
	fixedEndCount,
	onFixedEndCountChange,
	advanceTaskCount,
	onAdvanceTaskCountChange
}: TaskScheduleSectionProps) {
	return (
		<div className='space-y-4'>
			{/* ── Schedule type selector ── */}
			<RadioGroup
				value={scheduleType}
				onValueChange={(v) => onScheduleTypeChange(v as ScheduleType)}
				className='space-y-1'
			>
				{(
					[
						{ value: 'one-time', label: 'One-time', desc: 'Task occurs once on a specific date' },
						{
							value: 'flexible',
							label: 'Flexible Recurring',
							desc: 'Repeats X days after completion (relative interval)'
						},
						{
							value: 'fixed',
							label: 'Fixed Recurring',
							desc: 'Repeats on specific weekdays each week (fixed calendar)'
						}
					] as const
				).map(({ value, label, desc }) => (
					<label
						key={value}
						htmlFor={`sched-${value}`}
						className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-2 transition-colors ${
							scheduleType === value ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
						}`}
					>
						<RadioGroupItem value={value} id={`sched-${value}`} />
						<div className='min-w-0'>
							<p className='text-sm font-medium'>{label}</p>
							<p className='text-xs text-muted-foreground'>{desc}</p>
						</div>
					</label>
				))}
			</RadioGroup>

			{/* ── One-time fields ── */}
			{scheduleType === 'one-time' && (
				<div className='rounded-lg border p-4 space-y-4'>
					<div className='space-y-1'>
						<Label className='text-sm'>
							Due Date <span className='text-destructive'>*</span>
						</Label>
						<DatePicker value={dueDate} onChange={onDueDateChange} placeholder='Select a due date' className='w-52' />
					</div>
					<TimeWindowField value={timeWindow} onChange={onTimeWindowChange} />
				</div>
			)}

			{/* ── Flexible recurring fields ── */}
			{scheduleType === 'flexible' && (
				<div className='rounded-lg border p-4 space-y-4'>
					{' '}
					<div className='space-y-1'>
						<Label className='text-sm'>
							Start Date <span className='text-destructive'>*</span>
						</Label>
						<DatePicker
							value={flexStartDate}
							onChange={onFlexStartDateChange}
							placeholder='Select a start date'
							className='w-52'
						/>
					</div>{' '}
					<div className='flex gap-3 items-end'>
						<div className='space-y-1'>
							<Label className='text-sm'>Repeat every</Label>
							<Input
								type='number'
								min='1'
								value={flexInterval}
								onChange={(e) => onFlexIntervalChange(e.target.value)}
								className='w-20'
							/>
						</div>
						<div className='space-y-1 flex-1'>
							<Label className='text-sm'>&nbsp;</Label>
							<Select value={flexUnit} onValueChange={(v) => onFlexUnitChange(v as typeof flexUnit)}>
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
						id='flex'
						value={flexEnds}
						onChange={onFlexEndsChange}
						endDate={flexEndDate}
						onEndDateChange={onFlexEndDateChange}
						endCount={flexEndCount}
						onEndCountChange={onFlexEndCountChange}
					/>
					<TimeWindowField value={timeWindow} onChange={onTimeWindowChange} />
				</div>
			)}

			{/* ── Fixed recurring fields ── */}
			{scheduleType === 'fixed' && (
				<div className='rounded-lg border p-4 space-y-4'>
					<div className='space-y-2'>
						<Label className='text-sm'>Days of the week</Label>
						<div className='flex gap-2 flex-wrap'>
							{WEEKDAYS.map((day, i) => (
								<button
									key={day.label}
									type='button'
									onClick={() => onToggleDay(i)}
									className={`h-9 w-9 rounded-full text-xs font-medium border transition-colors ${
										fixedSelectedDays.includes(i)
											? 'bg-primary text-primary-foreground border-primary'
											: 'border-border hover:bg-muted'
									}`}
								>
									{day.label}
								</button>
							))}
						</div>
						{fixedSelectedDays.length > 0 && (
							<div className='flex gap-1 flex-wrap'>
								{fixedSelectedDays
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
						id='fixed'
						value={fixedEnds}
						onChange={onFixedEndsChange}
						endDate={fixedEndDate}
						onEndDateChange={onFixedEndDateChange}
						endCount={fixedEndCount}
						onEndCountChange={onFixedEndCountChange}
					/>

					<div className='space-y-1'>
						<div className='flex items-center justify-between'>
							<Label className='text-sm'>
								Advance Task Count <span className='text-destructive'>*</span>
							</Label>
						</div>
						<Input
							type='number'
							min={1}
							placeholder='e.g. 7'
							value={advanceTaskCount}
							onChange={(e) => onAdvanceTaskCountChange(e.target.value)}
							className='w-32'
						/>
						<p className='text-xs text-muted-foreground'>
							How many future tasks to generate at a time for this schedule.
						</p>
					</div>

					<TimeWindowField value={timeWindow} onChange={onTimeWindowChange} />
				</div>
			)}
		</div>
	)
}

// ─── TimeWindowField ──────────────────────────────────────────────────────────

function TimeWindowField({ value, onChange }: { value: TimeWindow; onChange: (v: TimeWindow) => void }) {
	return (
		<div className='space-y-1'>
			<Label className='text-sm'>Time Window</Label>
			<Select value={value} onValueChange={(v) => onChange(v as TimeWindow)}>
				<SelectTrigger className='w-44'>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value='Any'>Any Time</SelectItem>
					<SelectItem value='Morning'>Morning</SelectItem>
					<SelectItem value='Afternoon'>Afternoon</SelectItem>
				</SelectContent>
			</Select>
		</div>
	)
}

// ─── EndsSection ─────────────────────────────────────────────────────────────

function EndsSection({
	id,
	value,
	onChange,
	endDate,
	onEndDateChange,
	endCount,
	onEndCountChange
}: {
	id: string
	value: EndsType
	onChange: (v: EndsType) => void
	endDate: Date | undefined
	onEndDateChange: (v: Date | undefined) => void
	endCount: string
	onEndCountChange: (v: string) => void
}) {
	return (
		<div className='space-y-2'>
			<Label className='text-sm'>Ends</Label>
			<RadioGroup value={value} onValueChange={(v) => onChange(v as EndsType)} className='space-y-2'>
				<div className='flex items-center gap-2'>
					<RadioGroupItem value='never' id={`${id}-ends-never`} />
					<Label htmlFor={`${id}-ends-never`} className='text-sm font-normal cursor-pointer'>
						Never
					</Label>
				</div>

				<div className='flex items-center gap-2 flex-wrap'>
					<RadioGroupItem value='on-date' id={`${id}-ends-on-date`} />
					<Label htmlFor={`${id}-ends-on-date`} className='text-sm font-normal cursor-pointer'>
						On date
					</Label>
					{value === 'on-date' && (
						<DatePicker
							value={endDate}
							onChange={onEndDateChange}
							placeholder='Select end date'
							className='h-8 text-sm w-44'
						/>
					)}
				</div>

				<div className='flex items-center gap-2 flex-wrap'>
					<RadioGroupItem value='after-x' id={`${id}-ends-after-x`} />
					<Label htmlFor={`${id}-ends-after-x`} className='text-sm font-normal cursor-pointer'>
						After
					</Label>
					{value === 'after-x' && (
						<>
							<Input
								type='number'
								min='1'
								className='h-8 text-sm w-20'
								value={endCount}
								onChange={(e) => onEndCountChange(e.target.value)}
							/>
							<span className='text-sm text-muted-foreground'>occurrences</span>
						</>
					)}
				</div>
			</RadioGroup>
		</div>
	)
}
