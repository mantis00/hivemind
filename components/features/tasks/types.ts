export type TaskStatus = 'todo' | 'in_progress' | 'completed'

export type TaskItem = {
	id: string
	title: string
	caretaker: string
	tank: string
	status: TaskStatus
}
