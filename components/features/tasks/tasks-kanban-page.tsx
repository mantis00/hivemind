'use client'

import { useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import type { UUID } from 'crypto'

import type { Task } from '@/lib/react-query/queries'
import {
	useMemberProfiles,
	useOrgEnclosures,
	useOrgMembers,
	useSpecies,
	useTasksForEnclosures
} from '@/lib/react-query/queries'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { TaskKanbanColumn } from '@/components/features/tasks/task-kanban-column'
import { TaskFilterList, type TaskFilterOption } from '@/components/features/tasks/task-filter-list'

type KanbanColumns = {
	todo: Task[]
	overdue: Task[]
	urgent: Task[]
	done: Task[]
}

function toLocalDateKey(date: Date) {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

function getTaskDateKey(value: string | null) {
	if (!value) {
		return null
	}

	const parsed = new Date(value)
	if (Number.isNaN(parsed.getTime())) {
		return null
	}

	return toLocalDateKey(parsed)
}

function normalizeStatus(status: string | null) {
	return (status ?? 'pending').trim().toLowerCase()
}

function normalizePriority(priority: string | null) {
	return (priority ?? '').trim().toLowerCase()
}

function getTimeValue(value: string | null) {
	if (!value) {
		return Number.POSITIVE_INFINITY
	}

	const parsed = new Date(value).getTime()
	return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed
}

function sortByDueDateAsc(a: Task, b: Task) {
	return getTimeValue(a.due_date) - getTimeValue(b.due_date)
}

function sortDoneByCompletedDesc(a: Task, b: Task) {
	const aCompleted = a.completed_time ? new Date(a.completed_time).getTime() : 0
	const bCompleted = b.completed_time ? new Date(b.completed_time).getTime() : 0
	return bCompleted - aCompleted
}

function getAssignedUserId(task: Task) {
	return (task.assigned_to as string | null) ?? null
}

function toSortedFilterOptions(optionMap: Map<string, TaskFilterOption>) {
	return Array.from(optionMap.values()).sort((a, b) => a.label.localeCompare(b.label))
}

function splitTasks(tasks: Task[], selectedDateKey: string, todayDateKey: string): KanbanColumns {
	const columns: KanbanColumns = {
		todo: [],
		overdue: [],
		urgent: [],
		done: []
	}

	for (const task of tasks) {
		const status = normalizeStatus(task.status)
		const priority = normalizePriority(task.priority)
		const dueDateKey = getTaskDateKey(task.due_date)
		const completedDateKey = getTaskDateKey(task.completed_time)

		const isDone = status === 'completed'
		const isUrgent = !isDone && priority === 'high'
		const isOverdue = !isDone && !!dueDateKey && dueDateKey < todayDateKey

		if (isDone) {
			if (completedDateKey === selectedDateKey) {
				columns.done.push(task)
			}
			continue
		}

		if (isUrgent) {
			columns.urgent.push(task)
			continue
		}

		if (isOverdue) {
			columns.overdue.push(task)
			continue
		}

		if (dueDateKey === selectedDateKey) {
			columns.todo.push(task)
		}
	}

	columns.todo.sort(sortByDueDateAsc)
	columns.overdue.sort(sortByDueDateAsc)
	columns.urgent.sort(sortByDueDateAsc)
	columns.done.sort(sortDoneByCompletedDesc)

	return columns
}

export function TasksKanbanPage() {
	const params = useParams()
	const orgId = params?.orgId as UUID | undefined
	const { data: enclosures, isLoading: enclosuresLoading, error: enclosuresError } = useOrgEnclosures(orgId as UUID)
	const { data: orgSpeciesRows, isLoading: speciesLoading, error: speciesError } = useSpecies(orgId as UUID)
	const { data: orgMembers, isLoading: orgMembersLoading } = useOrgMembers(orgId as UUID)

	const memberIds = useMemo(
		() => Array.from(new Set((orgMembers ?? []).map((member) => member.user_id as string))),
		[orgMembers]
	)
	const { data: memberProfiles, isLoading: memberProfilesLoading } = useMemberProfiles(memberIds)

	const [selectedDate, setSelectedDate] = useState(() => toLocalDateKey(new Date()))
	const [selectedSpeciesIds, setSelectedSpeciesIds] = useState<string[]>([])
	const [selectedEnclosureIds, setSelectedEnclosureIds] = useState<string[]>([])
	const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([])
	const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])

	const todayDateKey = toLocalDateKey(new Date())

	const speciesNameById = useMemo(() => {
		const nameById = new Map<string, string>()

		for (const species of orgSpeciesRows ?? []) {
			const scientificName = species.species?.scientific_name?.trim()
			const fallbackName = species.custom_common_name?.trim()
			const label = scientificName || fallbackName || `Species ${(species.id as string).slice(0, 8)}`
			nameById.set(species.id as string, label)
			if (species.master_species_id) {
				nameById.set(species.master_species_id as string, label)
			}
		}

		return nameById
	}, [orgSpeciesRows])

	const userNameById = useMemo(() => {
		const profileNameById = new Map<string, string>()
		for (const profile of memberProfiles ?? []) {
			const displayName =
				profile.full_name ||
				`${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() ||
				profile.email ||
				(profile.id as string)
			profileNameById.set(profile.id as string, displayName)
		}

		for (const memberId of memberIds) {
			if (!profileNameById.has(memberId)) {
				profileNameById.set(memberId, `User ${memberId.slice(0, 8)}`)
			}
		}

		return profileNameById
	}, [memberProfiles, memberIds])

	const speciesOptions = useMemo(() => {
		const optionMap = new Map<string, TaskFilterOption>()
		for (const enclosure of enclosures ?? []) {
			const speciesId = enclosure.species_id as string
			const current = optionMap.get(speciesId)
			const label = speciesNameById.get(speciesId) ?? `Species ${speciesId.slice(0, 8)}`
			optionMap.set(speciesId, {
				id: speciesId,
				label,
				count: (current?.count ?? 0) + 1
			})
		}

		return toSortedFilterOptions(optionMap)
	}, [enclosures, speciesNameById])

	const enclosureOptions = useMemo(() => {
		const optionMap = new Map<string, TaskFilterOption>()
		for (const enclosure of enclosures ?? []) {
			const enclosureId = enclosure.id as string
			optionMap.set(enclosureId, {
				id: enclosureId,
				label: enclosure.name ?? `Enclosure ${enclosureId.slice(0, 8)}`,
				count: enclosure.current_count ?? 0
			})
		}

		return toSortedFilterOptions(optionMap)
	}, [enclosures])

	const locationOptions = useMemo(() => {
		const optionMap = new Map<string, TaskFilterOption>()
		for (const enclosure of enclosures ?? []) {
			const locationId = enclosure.location ?? 'unknown'
			const locationLabel = enclosure.locations?.name ?? enclosure.location ?? 'Unknown location'
			const current = optionMap.get(locationId)
			optionMap.set(locationId, {
				id: locationId,
				label: locationLabel,
				count: (current?.count ?? 0) + 1
			})
		}

		return toSortedFilterOptions(optionMap)
	}, [enclosures])

	const userOptions = useMemo(() => {
		const optionMap = new Map<string, TaskFilterOption>()
		for (const memberId of memberIds) {
			optionMap.set(memberId, {
				id: memberId,
				label: userNameById.get(memberId) ?? `User ${memberId.slice(0, 8)}`,
				count: 0
			})
		}

		return toSortedFilterOptions(optionMap)
	}, [memberIds, userNameById])

	const filteredEnclosures = useMemo(() => {
		return (enclosures ?? []).filter((enclosure) => {
			const enclosureId = enclosure.id as string
			const speciesId = enclosure.species_id as string
			const locationId = enclosure.location ?? 'unknown'

			const matchesSpecies = selectedSpeciesIds.length === 0 || selectedSpeciesIds.includes(speciesId)
			const matchesEnclosure = selectedEnclosureIds.length === 0 || selectedEnclosureIds.includes(enclosureId)
			const matchesLocation = selectedLocationIds.length === 0 || selectedLocationIds.includes(locationId)

			return matchesSpecies && matchesEnclosure && matchesLocation
		})
	}, [enclosures, selectedSpeciesIds, selectedEnclosureIds, selectedLocationIds])

	const enclosureIds = useMemo(() => filteredEnclosures.map((enclosure) => enclosure.id as UUID), [filteredEnclosures])
	const enclosureNameById = useMemo(
		() =>
			new Map(filteredEnclosures.map((enclosure) => [enclosure.id as string, enclosure.name ?? 'Unknown enclosure'])),
		[filteredEnclosures]
	)

	const { data: tasks, isLoading: tasksLoading, error: tasksError } = useTasksForEnclosures(enclosureIds)

	const filteredTasks = useMemo(() => {
		const selectedUsers = new Set(selectedUserIds)
		return (tasks ?? []).filter((task) => {
			if (selectedUsers.size === 0) {
				return true
			}

			const assignedUserId = getAssignedUserId(task)
			return assignedUserId ? selectedUsers.has(assignedUserId) : false
		})
	}, [tasks, selectedUserIds])

	const columns = useMemo(
		() => splitTasks(filteredTasks, selectedDate, todayDateKey),
		[filteredTasks, selectedDate, todayDateKey]
	)
	const visibleTaskCount = columns.todo.length + columns.overdue.length + columns.urgent.length + columns.done.length

	const isLoading = enclosuresLoading || tasksLoading || speciesLoading || orgMembersLoading || memberProfilesLoading
	const loadErrorMessage =
		(enclosuresError as Error | null)?.message ??
		(tasksError as Error | null)?.message ??
		(speciesError as Error | null)?.message ??
		null

	const toggleSelection = (current: string[], id: string) => {
		return current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
	}

	if (loadErrorMessage) {
		return (
			<Card className='mx-auto w-full max-w-7xl border-destructive/30'>
				<CardHeader>
					<CardTitle>Tasks Could Not Load</CardTitle>
					<CardDescription>
						There was a problem loading task data for this organization. Try refreshing the page.
					</CardDescription>
				</CardHeader>
				<CardContent className='text-sm text-muted-foreground'>{loadErrorMessage}</CardContent>
			</Card>
		)
	}

	if (isLoading) {
		return (
			<div className='mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 xl:grid-cols-4'>
				{['To Do', 'Overdue', 'Urgent', 'Done'].map((title) => (
					<section key={title} className='min-h-[420px] animate-pulse rounded-xl border bg-muted/20' />
				))}
			</div>
		)
	}

	if (!enclosures || enclosures.length === 0) {
		return (
			<Card className='mx-auto w-full max-w-7xl'>
				<CardHeader>
					<CardTitle>No Enclosures Found</CardTitle>
					<CardDescription>Add enclosures first so tasks can be grouped and displayed.</CardDescription>
				</CardHeader>
			</Card>
		)
	}

	return (
		<div className='mx-auto w-full max-w-7xl space-y-4'>
			<section>
				<h1 className='text-2xl font-semibold'>Tasks</h1>
				<p className='text-sm text-muted-foreground'>
					Kanban view grouped into To Do, Overdue, Urgent, and Done with date + entity filters.
				</p>
			</section>

			<Card>
				<CardHeader className='pb-2'>
					<CardTitle className='text-base'>Focus Date</CardTitle>
					<CardDescription>
						To Do and Done follow this date. Overdue and Urgent stay visible regardless of selected date.
					</CardDescription>
				</CardHeader>
				<CardContent className='flex flex-wrap items-end gap-3'>
					<div className='w-full max-w-xs space-y-1'>
						<label htmlFor='tasks-focus-date' className='text-sm font-medium'>
							Focus day
						</label>
						<Input
							id='tasks-focus-date'
							type='date'
							value={selectedDate}
							min={todayDateKey}
							onChange={(event) => setSelectedDate(event.target.value)}
						/>
					</div>
					{selectedDate !== todayDateKey ? (
						<Button variant='outline' onClick={() => setSelectedDate(todayDateKey)}>
							Reset to Today
						</Button>
					) : null}
				</CardContent>
			</Card>

			<section className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4'>
				<TaskFilterList
					title='Species'
					description='Filter by species represented in selected enclosures.'
					options={speciesOptions}
					selectedIds={selectedSpeciesIds}
					onToggle={(id) => setSelectedSpeciesIds((current) => toggleSelection(current, id))}
					onClear={() => setSelectedSpeciesIds([])}
				/>
				<TaskFilterList
					title='Enclosures'
					description='Filter to specific enclosures.'
					options={enclosureOptions}
					selectedIds={selectedEnclosureIds}
					onToggle={(id) => setSelectedEnclosureIds((current) => toggleSelection(current, id))}
					onClear={() => setSelectedEnclosureIds([])}
				/>
				<TaskFilterList
					title='Locations'
					description='Filter by enclosure location.'
					options={locationOptions}
					selectedIds={selectedLocationIds}
					onToggle={(id) => setSelectedLocationIds((current) => toggleSelection(current, id))}
					onClear={() => setSelectedLocationIds([])}
				/>
				<TaskFilterList
					title='Assigned Caretaker'
					description='Filter by the assigned caretaker on each task.'
					options={userOptions}
					selectedIds={selectedUserIds}
					onToggle={(id) => setSelectedUserIds((current) => toggleSelection(current, id))}
					onClear={() => setSelectedUserIds([])}
				/>
			</section>

			{filteredEnclosures.length === 0 ? (
				<Card>
					<CardHeader>
						<CardTitle>No Enclosures Match Current Filters</CardTitle>
						<CardDescription>Adjust species, enclosure, or location filters to continue.</CardDescription>
					</CardHeader>
				</Card>
			) : null}

			{filteredEnclosures.length > 0 && visibleTaskCount === 0 ? (
				<Card>
					<CardHeader>
						<CardTitle>No Tasks Match Current Filters</CardTitle>
						<CardDescription>Try a different date or widen your selected filter options.</CardDescription>
					</CardHeader>
				</Card>
			) : null}

			{filteredEnclosures.length > 0 && visibleTaskCount > 0 ? (
				<section className='grid grid-cols-1 gap-4 xl:grid-cols-4'>
					<TaskKanbanColumn
						title='To Do'
						description='Pending and in-progress tasks due on the selected date.'
						columnClassName='bg-sky-100 text-sky-800'
						tasks={columns.todo}
						enclosureNameById={enclosureNameById}
					/>
					<TaskKanbanColumn
						title='Overdue'
						description='Open non-urgent tasks that are overdue as of today.'
						columnClassName='bg-rose-100 text-rose-800'
						tasks={columns.overdue}
						enclosureNameById={enclosureNameById}
					/>
					<TaskKanbanColumn
						title='Urgent'
						description='All high-priority open tasks, regardless of due date.'
						columnClassName='bg-amber-100 text-amber-800'
						tasks={columns.urgent}
						enclosureNameById={enclosureNameById}
					/>
					<TaskKanbanColumn
						title='Done'
						description='Tasks completed on the selected date.'
						columnClassName='bg-emerald-100 text-emerald-800'
						tasks={columns.done}
						enclosureNameById={enclosureNameById}
					/>
				</section>
			) : null}
		</div>
	)
}
