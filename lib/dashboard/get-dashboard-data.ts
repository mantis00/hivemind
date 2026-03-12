import { createClient } from '@/lib/supabase/server'
import type { DashboardData, DashboardWarning, RecentActivityItem } from '@/lib/dashboard/types'
import type { PostgrestError } from '@supabase/supabase-js'

type EnclosureRow = {
	id: string
	name: string | null
	created_at: string | null
}

type TaskRow = {
	id: string
	enclosure_id: string | null
	created_at: string | null
	due_date: string | null
	priority: string | number | null
	status: string | null
	name: string | null
	description: string | null
	completed_time: string | null
}

const OPEN_TASK_STATUSES = new Set(['pending', 'in_progress'])
const CLOSED_TASK_STATUS = 'completed'
const DEFAULT_TIME_ZONE = 'UTC'
const ENCLOSURE_FILTER_CHUNK_SIZE = 100
const MAX_RECENT_ACTIVITY_ITEMS = 10
type DashboardClient = Awaited<ReturnType<typeof createClient>>

function isTaskOpen(task: TaskRow) {
	if (task.completed_time) {
		return false
	}

	if (!task.status) {
		return true
	}

	const normalized = task.status.trim().toLowerCase()
	if (normalized === CLOSED_TASK_STATUS) {
		return false
	}

	if (OPEN_TASK_STATUSES.has(normalized)) {
		return true
	}

	// Keep unknown statuses visible so old/test rows do not disappear silently.
	return true
}

function isHighPriority(priority: TaskRow['priority']) {
	if (typeof priority !== 'string') {
		return false
	}

	const normalized = priority.trim().toLowerCase()
	return normalized === 'high'
}

function isValidDate(value: string | null) {
	if (!value) {
		return false
	}

	return !Number.isNaN(new Date(value).getTime())
}

function createEmptyDashboardData(): DashboardData {
	return {
		generatedAt: new Date().toISOString(),
		timeZone: DEFAULT_TIME_ZONE,
		kpis: {
			activeEnclosures: 0,
			tasksDueToday: 0,
			upcomingTasks: 0,
			alerts: 0
		},
		atRiskEnclosures: [],
		upcomingSchedule: [],
		recentActivity: [],
		warnings: []
	}
}

function isValidTimeZone(timeZone: string) {
	try {
		new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date())
		return true
	} catch {
		return false
	}
}

function getServerTimeZone() {
	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
	if (typeof timeZone === 'string' && timeZone.length > 0 && isValidTimeZone(timeZone)) {
		return timeZone
	}

	return DEFAULT_TIME_ZONE
}

function getDateKeyInTimeZone(date: Date, timeZone: string) {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(date)
}

function compareNullableIsoDatesAsc(a: string | null, b: string | null) {
	if (!a && !b) {
		return 0
	}

	if (!a) {
		return 1
	}

	if (!b) {
		return -1
	}

	return new Date(a).getTime() - new Date(b).getTime()
}

function createDashboardQueryError(
	stage: string,
	error: PostgrestError,
	context?: Record<string, string | number | boolean | null>
) {
	const errorPayload = {
		stage,
		code: error.code ?? null,
		message: error.message ?? 'Unknown Supabase error',
		details: error.details ?? null,
		hint: error.hint ?? null,
		context: context ?? null
	}

	return new Error(`Dashboard query failed: ${JSON.stringify(errorPayload)}`)
}

function addWarning(warnings: DashboardWarning[], stage: string, message: string) {
	warnings.push({ stage, message })
}

function compareIsoDatesDesc(a: string, b: string) {
	return new Date(b).getTime() - new Date(a).getTime()
}

function getTaskTitle(task: TaskRow) {
	if (task.name && task.name.trim().length > 0) {
		return task.name.trim()
	}

	if (task.description && task.description.trim().length > 0) {
		return task.description.trim()
	}

	return 'Task'
}

function wasTaskOverdueWhenCompleted(task: TaskRow) {
	if (!isValidDate(task.completed_time) || !isValidDate(task.due_date)) {
		return false
	}

	return new Date(task.completed_time!).getTime() > new Date(task.due_date!).getTime()
}

function getCompletionStateLabels(task: TaskRow) {
	const labels: string[] = []

	if (wasTaskOverdueWhenCompleted(task)) {
		labels.push('overdue when completed')
	}

	if (isHighPriority(task.priority)) {
		labels.push('urgent when completed')
	}

	return labels
}

function createChunks(values: string[], chunkSize: number) {
	const chunks: string[][] = []

	for (let index = 0; index < values.length; index += chunkSize) {
		chunks.push(values.slice(index, index + chunkSize))
	}

	return chunks
}

async function getOrgEnclosureSnapshot(supabase: DashboardClient, orgId: string) {
	// Keep this in lockstep with active org-enclosure query behavior used in react-query hooks.
	const { count, error: enclosureCountError } = await supabase
		.from('enclosures')
		.select('*', { count: 'exact', head: true })
		.eq('org_id', orgId)

	if (enclosureCountError) {
		throw createDashboardQueryError('enclosures.count', enclosureCountError, { orgId })
	}

	const activeEnclosureCount = count ?? 0
	if (activeEnclosureCount === 0) {
		return { activeEnclosureCount, enclosureRows: [] as EnclosureRow[] }
	}

	const { data: enclosureRows, error: enclosuresError } = (await supabase
		.from('enclosures')
		.select('id, name, created_at')
		.eq('org_id', orgId)
		.order('current_count', { ascending: true })) as {
		data: EnclosureRow[] | null
		error: PostgrestError | null
	}

	if (enclosuresError) {
		throw createDashboardQueryError('enclosures.select', enclosuresError, { orgId })
	}

	return {
		activeEnclosureCount,
		enclosureRows: enclosureRows ?? []
	}
}

export async function getDashboardData(orgId: string): Promise<DashboardData> {
	const supabase = await createClient()
	const dashboardData = createEmptyDashboardData()
	const warnings = dashboardData.warnings
	// TODO: switch this to org-local timezone once org timezone is stored in the database.
	const serverTimeZone = getServerTimeZone()
	dashboardData.timeZone = serverTimeZone

	const { activeEnclosureCount, enclosureRows } = await getOrgEnclosureSnapshot(supabase, orgId)
	dashboardData.kpis.activeEnclosures = activeEnclosureCount

	if (dashboardData.kpis.activeEnclosures === 0) {
		return dashboardData
	}

	const enclosureIds = (enclosureRows ?? []).map((enclosure) => enclosure.id)
	const enclosureNameById = new Map(
		(enclosureRows ?? []).map((enclosure) => [enclosure.id, enclosure.name ?? enclosure.id])
	)

	if (enclosureIds.length === 0) {
		return dashboardData
	}

	const enclosureIdChunks = createChunks(enclosureIds, ENCLOSURE_FILTER_CHUNK_SIZE)
	const taskRows: TaskRow[] = []

	for (let chunkIndex = 0; chunkIndex < enclosureIdChunks.length; chunkIndex += 1) {
		const enclosureChunk = enclosureIdChunks[chunkIndex]
		const { data: chunkTaskRows, error: tasksError } = (await supabase
			.from('tasks')
			.select('id, enclosure_id, created_at, due_date, priority, status, name, description, completed_time')
			.in('enclosure_id', enclosureChunk)) as {
			data: TaskRow[] | null
			error: PostgrestError | null
		}

		if (tasksError) {
			addWarning(
				warnings,
				'tasks.select',
				`Task metrics may be incomplete (${tasksError.message ?? 'Unknown query error'}).`
			)
			break
		}

		if (chunkTaskRows) {
			taskRows.push(...chunkTaskRows)
		}
	}

	const openTaskRows = taskRows.filter(isTaskOpen)
	const now = new Date()
	const todayKey = getDateKeyInTimeZone(now, serverTimeZone)
	const upcomingDateKeys = new Set<string>()
	for (let dayOffset = 1; dayOffset <= 7; dayOffset += 1) {
		const futureDate = new Date(now)
		futureDate.setDate(futureDate.getDate() + dayOffset)
		upcomingDateKeys.add(getDateKeyInTimeZone(futureDate, serverTimeZone))
	}

	const highPrioritySoonThreshold = new Date(now.getTime() + 24 * 60 * 60 * 1000)
	const alertTaskIds = new Set<string>()
	const riskByEnclosure = new Map<string, { overdueCount: number; highPriorityCount: number }>()
	const nextDueByEnclosure = new Map<string, string>()

	for (const task of openTaskRows) {
		if (!task.enclosure_id || !isValidDate(task.due_date)) {
			continue
		}

		const dueDate = new Date(task.due_date!)
		const dueDateKey = getDateKeyInTimeZone(dueDate, serverTimeZone)
		const dueDateIso = dueDate.toISOString()
		const previousNextDue = nextDueByEnclosure.get(task.enclosure_id)
		if (!previousNextDue || compareNullableIsoDatesAsc(dueDateIso, previousNextDue) < 0) {
			nextDueByEnclosure.set(task.enclosure_id, dueDateIso)
		}

		if (dueDateKey === todayKey) {
			dashboardData.kpis.tasksDueToday += 1
		}

		if (upcomingDateKeys.has(dueDateKey)) {
			dashboardData.kpis.upcomingTasks += 1
		}

		const isOverdue = dueDate < now
		const hasHighPriority = isHighPriority(task.priority)
		const isHighPrioritySoon = hasHighPriority && dueDate <= highPrioritySoonThreshold

		if (isOverdue || isHighPrioritySoon) {
			alertTaskIds.add(task.id)
		}

		if (isOverdue || hasHighPriority) {
			const currentStats = riskByEnclosure.get(task.enclosure_id) ?? { overdueCount: 0, highPriorityCount: 0 }
			if (isOverdue) {
				currentStats.overdueCount += 1
			}
			if (hasHighPriority) {
				currentStats.highPriorityCount += 1
			}
			riskByEnclosure.set(task.enclosure_id, currentStats)
		}
	}

	dashboardData.kpis.alerts = alertTaskIds.size
	dashboardData.atRiskEnclosures = Array.from(riskByEnclosure.entries())
		.map(([enclosureId, stats]) => ({
			enclosureId,
			enclosureName: enclosureNameById.get(enclosureId) ?? enclosureId,
			overdueCount: stats.overdueCount,
			highPriorityCount: stats.highPriorityCount,
			nextDueAt: nextDueByEnclosure.get(enclosureId) ?? null
		}))
		.sort((a, b) => {
			if (b.overdueCount !== a.overdueCount) {
				return b.overdueCount - a.overdueCount
			}

			if (b.highPriorityCount !== a.highPriorityCount) {
				return b.highPriorityCount - a.highPriorityCount
			}

			return compareNullableIsoDatesAsc(a.nextDueAt, b.nextDueAt)
		})
		.slice(0, 5)

	dashboardData.upcomingSchedule = openTaskRows
		.filter((task) => {
			if (!task.enclosure_id || !isValidDate(task.due_date)) {
				return false
			}

			const dueDateKey = getDateKeyInTimeZone(new Date(task.due_date!), serverTimeZone)
			return dueDateKey === todayKey
		})
		.sort((a, b) => {
			const aUrgentSortOrder = isHighPriority(a.priority) ? 0 : 1
			const bUrgentSortOrder = isHighPriority(b.priority) ? 0 : 1
			if (aUrgentSortOrder !== bUrgentSortOrder) {
				return aUrgentSortOrder - bUrgentSortOrder
			}

			return compareNullableIsoDatesAsc(a.due_date, b.due_date)
		})
		.map((task) => {
			const enclosureId = task.enclosure_id as string
			return {
				taskId: task.id,
				enclosureId,
				enclosureName: enclosureNameById.get(enclosureId) ?? enclosureId,
				taskTitle: getTaskTitle(task),
				dueAt: task.due_date,
				priority: typeof task.priority === 'string' ? task.priority : null
			}
		})

	const recentActivityCandidates: RecentActivityItem[] = []

	for (const task of taskRows) {
		const enclosureName = task.enclosure_id ? (enclosureNameById.get(task.enclosure_id) ?? 'Enclosure') : 'Enclosure'
		const taskTitle = getTaskTitle(task)
		const href = task.enclosure_id
			? `/protected/orgs/${orgId}/enclosures/${task.enclosure_id}`
			: `/protected/orgs/${orgId}`

		if (isValidDate(task.completed_time)) {
			const completedAt = task.completed_time!
			const completedDateKey = getDateKeyInTimeZone(new Date(completedAt), serverTimeZone)
			if (completedDateKey !== todayKey) {
				continue
			}

			const completionStateLabels = getCompletionStateLabels(task)
			const completionStateSuffix = completionStateLabels.length > 0 ? ` (${completionStateLabels.join(', ')})` : ''

			recentActivityCandidates.push({
				id: `task-completed-${task.id}`,
				type: 'task_completed',
				label: `${taskTitle} completed in ${enclosureName}${completionStateSuffix}`,
				occurredAt: completedAt,
				href
			})
		}
	}

	dashboardData.recentActivity = recentActivityCandidates
		.sort((a, b) => compareIsoDatesDesc(a.occurredAt, b.occurredAt))
		.slice(0, MAX_RECENT_ACTIVITY_ITEMS)

	dashboardData.generatedAt = now.toISOString()

	return dashboardData
}
