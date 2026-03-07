'use client'

import React, { useState, useRef, useLayoutEffect } from 'react'
import { Virtuoso } from 'react-virtuoso'
import { RRule } from 'rrule'
import { useParams } from 'next/navigation'
import { UUID } from 'crypto'

import {
	useOrgEnclosures,
	useSchedulesForEnclosures,
	useOrgMemberProfiles,
	useOrgSpecies,
	type EnclosureSchedule
} from '@/lib/react-query/queries'
import { useToggleScheduleActive } from '@/lib/react-query/mutations'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Calendar, CalendarClock, Clock, LoaderCircle, Power, Repeat } from 'lucide-react'
import { DeleteScheduleButton } from '@/components/tasks/delete-schedule-button'
import { ReassignMemberButton } from '@/components/tasks/reassign-member-button'
import { ScheduledTasksFilters, type ScheduleFilters } from '@/components/tasks/scheduled-tasks-filters'

import getPriorityLevelStatus from '@/context/priority-levels'
import { convertSegmentPathToStaticExportFilename } from 'next/dist/shared/lib/segment-cache/segment-value-encoding'

// ─── Types ────────────────────────────────────────────────────────────────────

type ScheduleRow = EnclosureSchedule & {
	enclosure_name: string | null
	species_name: string | null
	assigned_member_name: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatScheduleRule(type: EnclosureSchedule['schedule_type'], rule: string): string {
	if (type === 'relative_interval') {
		const parts = rule.trim().split(' ')
		const n = parseInt(parts[0], 10)
		const unit = (parts[1] ?? 'days').toLowerCase()
		return `Every ${n} ${n === 1 ? unit.replace(/s$/, '') : unit}`
	}
	try {
		return RRule.fromString(rule).toText()
	} catch {
		return rule
	}
}

const priorityConfig: Record<string, { color: string }> = {
	low: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
	medium: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
	high: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CARD_HEIGHT = 120 // approximate px per card
const MAX_LIST_HEIGHT = 8 * CARD_HEIGHT // ~960px — scrolls after 8 cards

// ─── Truncated Description ───────────────────────────────────────────────────

function TruncatedDescription({ text }: { text: string }) {
	const ref = useRef<HTMLParagraphElement>(null)
	const [isTruncated, setIsTruncated] = useState(false)

	useLayoutEffect(() => {
		const el = ref.current
		if (el) setIsTruncated(el.scrollWidth > el.clientWidth)
	}, [text])

	if (isTruncated) {
		return (
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<p ref={ref} className='text-xs text-muted-foreground truncate cursor-default'>
							{text}
						</p>
					</TooltipTrigger>
					<TooltipContent side='bottom' className='max-w-xs'>
						<p className='text-sm'>{text}</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		)
	}

	return (
		<p ref={ref} className='text-xs text-muted-foreground truncate'>
			{text}
		</p>
	)
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ScheduledTasksTable() {
	const params = useParams()
	const orgId = params?.orgId as UUID | undefined

	const [filters, setFilters] = useState<ScheduleFilters>({
		search: '',
		statusFilter: [],
		typeFilter: [],
		priorityFilter: []
	})
	const { search, statusFilter, typeFilter, priorityFilter } = filters

	const listRef = useRef<HTMLDivElement>(null)

	// ── Data fetching ──────────────────────────────────────────────────────────

	const { data: enclosures, isLoading: enclosuresLoading } = useOrgEnclosures(orgId as UUID)
	const enclosureIds = (enclosures?.map((e) => e.id as UUID) ?? []) as UUID[]

	const { data: schedules, isLoading: schedulesLoading } = useSchedulesForEnclosures(enclosureIds)
	const { data: members } = useOrgMemberProfiles(orgId as UUID)
	const { data: orgSpecies } = useOrgSpecies(orgId as UUID)

	console.log('Schedules:', schedules) // Debugging log
	console.log('Enclosures:', enclosures) // Debugging log
	console.log('Members:', members) // Debugging log
	console.log('Org Species:', orgSpecies) // Debugging log

	const toggleActive = useToggleScheduleActive()
	const isLoading = enclosuresLoading || schedulesLoading

	// ── Build lookup maps ──────────────────────────────────────────────────────

	const enclosureMap = new Map(enclosures?.map((e) => [e.id as string, e]) ?? [])
	const memberMap = new Map(members?.map((m) => [m.id as string, m]) ?? [])

	// ── Enrich schedules with display data ────────────────────────────────────

	const enriched: ScheduleRow[] = (schedules ?? []).map((s) => {
		const enc = enclosureMap.get(s.enclosure_id as string)
		const sp = orgSpecies?.find((os) => os.id === enc?.species_id)
		const member = s.assigned_to ? memberMap.get(s.assigned_to as string) : null
		return {
			...s,
			enclosure_name: enc?.name ?? null,
			species_name: sp?.custom_common_name ?? null,
			assigned_member_name: member ? member.full_name || `${member.first_name} ${member.last_name}` : null
		}
	})

	// ── Apply filters ─────────────────────────────────────────────────────────

	const filtered = enriched.filter((s) => {
		const term = search.toLowerCase()
		const matchesSearch =
			!term ||
			s.task_name?.toLowerCase().includes(term) ||
			s.task_description?.toLowerCase().includes(term) ||
			s.enclosure_name?.toLowerCase().includes(term) ||
			s.species_name?.toLowerCase().includes(term)

		const matchesStatus =
			statusFilter.length === 0 ||
			(statusFilter.includes('active') && s.is_active) ||
			(statusFilter.includes('inactive') && !s.is_active)

		const matchesType = typeFilter.length === 0 || typeFilter.includes(s.schedule_type)
		const matchesPriority = priorityFilter.length === 0 || (s.priority !== null && priorityFilter.includes(s.priority))

		return matchesSearch && matchesStatus && matchesType && matchesPriority
	})

	const count = filtered.length
	const listHeight = isLoading || count === 0 ? 120 : Math.min(count * CARD_HEIGHT, MAX_LIST_HEIGHT)

	const hasActiveFilters = statusFilter.length > 0 || typeFilter.length > 0 || priorityFilter.length > 0

	// ── Render ────────────────────────────────────────────────────────────────

	return (
		<div className='space-y-3'>
			{/* ── Filter bar ── */}
			<ScheduledTasksFilters filters={filters} onChange={setFilters} />

			{/* ── Card list ── */}
			<div className='space-y-0'>
				{isLoading && (
					<div className='rounded-md border flex justify-center items-center gap-2 py-10 text-sm text-muted-foreground'>
						<LoaderCircle className='h-4 w-4 animate-spin' />
						Loading schedules…
					</div>
				)}

				{!isLoading && count === 0 && (
					<div className='rounded-md border py-10 text-center text-sm text-muted-foreground'>
						{search || hasActiveFilters ? 'No schedules match your filters.' : 'No recurring schedules set up yet.'}
					</div>
				)}

				{!isLoading && count > 0 && (
					<Virtuoso
						ref={listRef as React.RefObject<null>}
						style={{ height: listHeight }}
						data={filtered}
						itemContent={(_, schedule) => (
							<div className='pb-2'>
								<Card
									className={`border-l-4 py-0 ${
										schedule.is_active ? 'border-l-green-500' : 'border-l-muted-foreground/30'
									}`}
								>
									<CardContent className='px-4 py-3 space-y-1.5'>
										{/* ── Row 1: name + description (middle) + active + delete ── */}
										<div className='flex items-center gap-2 min-w-0'>
											<p className='font-medium text-sm shrink-0'>
												{schedule.task_name ?? <span className='italic text-muted-foreground'>Untitled</span>}
											</p>
											{/* Description in middle — tooltip only if text is truncated */}
											<div className='flex-1 min-w-0'>
												{schedule.task_description && <TruncatedDescription text={schedule.task_description} />}
											</div>
											{/* Active/Paused toggle */}
											<TooltipProvider>
												<Tooltip>
													<TooltipTrigger asChild>
														<Button
															variant='ghost'
															size='sm'
															className={`gap-1 h-7 px-2 text-xs font-medium shrink-0 ${
																schedule.is_active
																	? 'text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30'
																	: 'text-muted-foreground hover:text-foreground'
															}`}
															onClick={() =>
																toggleActive.mutate({
																	scheduleId: schedule.id as UUID,
																	is_active: !schedule.is_active
																})
															}
															disabled={toggleActive.isPending}
														>
															<Power className='h-3 w-3' />
															{schedule.is_active ? 'Active' : 'Paused'}
														</Button>
													</TooltipTrigger>
													<TooltipContent>
														<p>{schedule.is_active ? 'Click to pause' : 'Click to activate'}</p>
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>
											<DeleteScheduleButton scheduleId={schedule.id as UUID} taskName={schedule.task_name} />
										</div>

										{/* ── Row 2: enclosure / species badges ── */}
										{(schedule.enclosure_name || schedule.species_name) && (
											<div className='flex flex-wrap items-center gap-x-1.5 gap-y-1'>
												{schedule.enclosure_name && (
													<Badge variant='secondary' className='text-xs font-normal py-0 h-5'>
														{schedule.enclosure_name}
													</Badge>
												)}
												{schedule.enclosure_name && schedule.species_name && (
													<span className='text-border text-xs'>/</span>
												)}
												{schedule.species_name && (
													<Badge variant='outline' className='text-xs font-normal py-0 h-5'>
														{schedule.species_name}
													</Badge>
												)}
											</div>
										)}

										{/* ── Row 3: meta items with slashes / assignee far right ── */}
										<div className='flex items-center justify-between gap-2'>
											<div className='flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground min-w-0'>
												{/* Schedule rule */}
												<span className='flex items-center gap-1'>
													{schedule.schedule_type === 'fixed_calendar' ? (
														<Calendar className='h-3 w-3' />
													) : (
														<Repeat className='h-3 w-3' />
													)}
													<span className='capitalize'>
														{formatScheduleRule(schedule.schedule_type, schedule.schedule_rule)}
														{schedule.max_occurrences
															? ` (${schedule.occurrence_count}/${schedule.max_occurrences} occurrences)`
															: ''}
													</span>
												</span>
												<span className='text-border'>/</span>
												{/* Window */}
												<span className='flex items-center gap-1'>
													<Clock className='h-3 w-3' />
													<span>{schedule.time_window ?? 'Any'} window</span>
												</span>
												{/* End date */}
												{schedule.end_date && !schedule.max_occurrences && (
													<>
														<span className='text-border'>/</span>
														<span>
															until{' '}
															{new Date(schedule.end_date).toLocaleDateString(undefined, {
																month: 'short',
																day: 'numeric',
																year: 'numeric'
															})}
														</span>
													</>
												)}
												{/* Priority */}
												{schedule.priority && (
													<>
														<span className='text-border'>/</span>
														<span
															className={`inline-block px-1.5 py-0 rounded-full text-xs font-semibold ${
																priorityConfig[schedule.priority]?.color ?? 'bg-gray-100 text-gray-800'
															}`}
														>
															{getPriorityLevelStatus(schedule.priority)}
														</span>
													</>
												)}
											</div>
											{/* Assignee far right — click to reassign */}
											<ReassignMemberButton
												scheduleId={schedule.id as UUID}
												assignedTo={schedule.assigned_to}
												assignedMemberName={schedule.assigned_member_name}
												members={members ?? []}
											/>
										</div>
									</CardContent>
								</Card>
							</div>
						)}
					/>
				)}
			</div>

			{/* Row count */}
			<div className='text-sm text-muted-foreground'>
				<div className='flex items-center gap-1'>
					<CalendarClock className='h-4 w-4' />
					{count} {count === 1 ? 'schedule' : 'schedules'}
					{schedules && count !== schedules.length && ` (filtered from ${schedules.length})`}
				</div>
			</div>
		</div>
	)
}
