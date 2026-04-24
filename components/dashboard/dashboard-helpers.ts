export const DASHBOARD_MAX_AT_RISK_ITEMS = 6
export const DASHBOARD_MAX_RECENT_ACTIVITY_ITEMS = 10

type DashboardEnclosureRelation =
	| {
			id: string
			name: string | null
	  }
	| {
			id: string
			name: string | null
	  }[]
	| null

type DashboardTaskTitleLike = {
	name: string | null
	description: string | null
}

type DashboardTaskCompletionLike = {
	due_date: string | null
	completed_time: string | null
	priority: string | null
}

export function getDashboardTaskEnclosure(task: { enclosures: DashboardEnclosureRelation }) {
	if (!task.enclosures) {
		return null
	}
	return Array.isArray(task.enclosures) ? (task.enclosures[0] ?? null) : task.enclosures
}

export function compareNullableIsoDatesAsc(a: string | null, b: string | null) {
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

export function compareIsoDatesDesc(a: string, b: string) {
	return new Date(b).getTime() - new Date(a).getTime()
}

export function isValidDate(value: string | null) {
	if (!value) {
		return false
	}
	return !Number.isNaN(new Date(value).getTime())
}

export function isHighPriority(priority: string | null) {
	if (typeof priority !== 'string') {
		return false
	}
	return priority.trim().toLowerCase() === 'high'
}

export function getTaskTitle(task: DashboardTaskTitleLike) {
	if (task.name && task.name.trim().length > 0) {
		return task.name.trim()
	}
	if (task.description && task.description.trim().length > 0) {
		return task.description.trim()
	}
	return 'Task'
}

function wasTaskOverdueWhenCompleted(task: DashboardTaskCompletionLike) {
	if (!isValidDate(task.completed_time) || !isValidDate(task.due_date)) {
		return false
	}
	return new Date(task.completed_time!).getTime() > new Date(task.due_date!).getTime()
}

export function getCompletionStateLabels(task: DashboardTaskCompletionLike) {
	const labels: string[] = []
	if (wasTaskOverdueWhenCompleted(task)) {
		labels.push('overdue when completed')
	}
	if (isHighPriority(task.priority)) {
		labels.push('high priority when completed')
	}
	return labels
}
