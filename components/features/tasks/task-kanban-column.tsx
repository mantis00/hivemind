'use client'

import type { Task } from '@/lib/react-query/queries'
import { TaskCard } from '@/components/features/tasks/task-card'

type TaskKanbanColumnProps = {
	title: string
	description: string
	columnClassName: string
	tasks: Task[]
	enclosureNameById: Map<string, string>
}

export function TaskKanbanColumn({
	title,
	description,
	columnClassName,
	tasks,
	enclosureNameById
}: TaskKanbanColumnProps) {
	return (
		<section className='rounded-xl border bg-muted/30'>
			<header className='border-b px-4 py-3'>
				<div className='flex items-center justify-between gap-2'>
					<h2 className='text-base font-semibold'>{title}</h2>
					<span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${columnClassName}`}>{tasks.length}</span>
				</div>
				<p className='mt-1 text-xs text-muted-foreground'>{description}</p>
			</header>

			<div className='max-h-[680px] min-h-[340px] space-y-3 overflow-y-auto p-3 pr-2'>
				{tasks.length === 0 ? (
					<p className='rounded-md border border-dashed bg-background px-3 py-4 text-sm text-muted-foreground'>
						No tasks in this column.
					</p>
				) : (
					tasks.map((task) => (
						<TaskCard
							key={task.id}
							task={task}
							enclosureName={enclosureNameById.get(task.enclosure_id as string) ?? 'Unknown enclosure'}
						/>
					))
				)}
			</div>
		</section>
	)
}
