export type DashboardKpis = {
	activeEnclosures: number
	tasksDueToday: number
	upcomingTasks: number
	alerts: number
}

export type AtRiskEnclosureSummary = {
	enclosureId: string
	enclosureName: string
	overdueCount: number
	highPriorityCount: number
	nextDueAt: string | null
}

export type UpcomingScheduleItem = {
	scheduleId: string
	enclosureId: string
	enclosureName: string
	scheduleType: string
	timeWindow: string | null
	lastRunAt: string | null
}

export type RecentActivityItem = {
	id: string
	type: 'task_completed' | 'task_created' | 'note_added' | 'enclosure_created' | 'invite_sent'
	label: string
	occurredAt: string
	href: string
}

export type DashboardWarning = {
	stage: string
	message: string
}

export type DashboardData = {
	generatedAt: string
	timeZone: string
	kpis: DashboardKpis
	atRiskEnclosures: AtRiskEnclosureSummary[]
	upcomingSchedule: UpcomingScheduleItem[]
	recentActivity: RecentActivityItem[]
	warnings: DashboardWarning[]
}
