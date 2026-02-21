export type DashboardTask = {
	id: string
	title: string
	tank: string
	caretaker: string
	status: 'todo' | 'in_progress'
	dueLabel: string
	priority?: boolean
}

export type ActivityItem = {
	id: string
	timestamp: string
	name: string
	event: string
}
