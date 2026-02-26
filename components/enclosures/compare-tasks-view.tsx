'use client'

import { useSearchParams, useParams, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { UUID } from 'crypto'

import { useTasksForEnclosures, useOrgEnclosures, type Task, type Enclosure } from '@/lib/react-query/queries'
import { createClient } from '@/lib/supabase/client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table'
import { ArrowLeft, CheckCircle2, ClipboardCheck, LoaderCircle } from 'lucide-react'

type CommonTask = {
	name: string
	enclosureTasks: { enclosure: Enclosure; task: Task }[]
}

export default function CompareTasksView() {
	const searchParams = useSearchParams()
	const params = useParams()
	const router = useRouter()
	const orgId = params?.orgId as UUID | undefined

	const enclosureIds = useMemo(() => {
		const raw = searchParams.get('ids') ?? ''
		return raw.split(',').filter(Boolean) as UUID[]
	}, [searchParams])

	const { data: allEnclosures } = useOrgEnclosures(orgId as UUID)
	const { data: tasks, isLoading } = useTasksForEnclosures(enclosureIds)

	const queryClient = useQueryClient()
	const [selectedTaskIds, setSelectedTaskIds] = useState<Set<UUID>>(new Set())

	// Resolve enclosure objects from IDs
	const enclosures = useMemo(() => {
		if (!allEnclosures) return []
		return enclosureIds.map((id) => allEnclosures.find((e) => e.id === id)).filter(Boolean) as Enclosure[]
	}, [allEnclosures, enclosureIds])

	// Group tasks by name and find common ones (present in 2+ enclosures)
	const { commonTasks, uniqueTasks } = useMemo(() => {
		if (!tasks || !enclosures.length) return { commonTasks: [], uniqueTasks: [] }

		const byName = new Map<string, { enclosure: Enclosure; task: Task }[]>()

		for (const task of tasks) {
			const key = (task.name ?? '').toLowerCase().trim()
			if (!key) continue

			const enclosure = enclosures.find((e) => e.id === task.enclosure_id)
			if (!enclosure) continue

			if (!byName.has(key)) byName.set(key, [])
			byName.get(key)!.push({ enclosure, task })
		}

		const common: CommonTask[] = []
		const unique: CommonTask[] = []

		for (const [, entries] of byName) {
			const uniqueEnclosureIds = new Set(entries.map((e) => e.enclosure.id))
			const group: CommonTask = {
				name: entries[0].task.name ?? '',
				enclosureTasks: entries
			}
			if (uniqueEnclosureIds.size >= 2) {
				common.push(group)
			} else {
				unique.push(group)
			}
		}

		return { commonTasks: common, uniqueTasks: unique }
	}, [tasks, enclosures])

	// Mutation to bulk-complete selected tasks
	const bulkComplete = useMutation({
		mutationFn: async (taskIds: UUID[]) => {
			const supabase = createClient()
			const { error } = await supabase
				.from('tasks')
				.update({ status: 'completed', completed_time: new Date().toISOString() })
				.in('id', taskIds)
			if (error) throw error
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['tasksForEnclosures'] })
			setSelectedTaskIds(new Set())
		}
	})

	const handleToggleTask = (taskId: UUID) => {
		setSelectedTaskIds((prev) => {
			const next = new Set(prev)
			if (next.has(taskId)) {
				next.delete(taskId)
			} else {
				next.add(taskId)
			}
			return next
		})
	}

	const handleSelectAllCommon = () => {
		const allCommonIds = commonTasks.flatMap((ct) => ct.enclosureTasks.map((et) => et.task.id))
		const allSelected = allCommonIds.every((id) => selectedTaskIds.has(id))
		if (allSelected) {
			setSelectedTaskIds(new Set())
		} else {
			setSelectedTaskIds(new Set(allCommonIds))
		}
	}

	const handleCompleteSelected = () => {
		const ids = Array.from(selectedTaskIds)
		if (ids.length > 0) {
			bulkComplete.mutate(ids)
		}
	}

	const priorityColor: Record<string, string> = {
		low: 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300',
		medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
		high: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
		critical: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
	}

	if (enclosureIds.length < 2) {
		return (
			<div className='rounded-lg border border-dashed p-8 text-center'>
				<p className='text-muted-foreground text-sm'>Select at least 2 enclosures to compare tasks.</p>
				<Button variant='outline' className='mt-4' onClick={() => router.back()}>
					<ArrowLeft className='h-4 w-4 mr-2' />
					Go Back
				</Button>
			</div>
		)
	}

	return (
		<div className='space-y-6'>
			{/* Back button + enclosure summary */}
			<div className='flex items-center gap-3 flex-wrap'>
				<Button variant='outline' size='sm' onClick={() => router.back()}>
					<ArrowLeft className='h-4 w-4 mr-1' />
					Back
				</Button>
				<span className='text-sm text-muted-foreground'>Comparing:</span>
				{enclosures.map((enc) => (
					<Badge key={enc.id} variant='secondary'>
						{enc.name}
					</Badge>
				))}
			</div>

			{isLoading ? (
				<div className='space-y-3'>
					{[...Array(5)].map((_, i) => (
						<Skeleton key={i} className='h-12 w-full' />
					))}
				</div>
			) : (
				<>
					{/* Common Tasks Section */}
					<Card>
						<CardContent className='pt-6'>
							<div className='flex items-center justify-between mb-4'>
								<div className='flex items-center gap-2'>
									<ClipboardCheck className='h-5 w-5 text-primary' />
									<h2 className='text-lg font-semibold'>Common Tasks</h2>
									<Badge variant='secondary'>{commonTasks.length}</Badge>
								</div>
								<div className='flex items-center gap-2'>
									{commonTasks.length > 0 && (
										<Button variant='outline' size='sm' onClick={handleSelectAllCommon}>
											Select All Common
										</Button>
									)}
									{selectedTaskIds.size > 0 && (
										<Button
											size='sm'
											className='gap-1.5'
											onClick={handleCompleteSelected}
											disabled={bulkComplete.isPending}
										>
											{bulkComplete.isPending ? (
												<LoaderCircle className='h-4 w-4 animate-spin' />
											) : (
												<CheckCircle2 className='h-4 w-4' />
											)}
											Complete Selected ({selectedTaskIds.size})
										</Button>
									)}
								</div>
							</div>

							{commonTasks.length > 0 ? (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className='w-10'></TableHead>
											<TableHead>Task</TableHead>
											<TableHead>Priority</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Enclosures</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{commonTasks.map((ct) => {
											const allIds = ct.enclosureTasks.map((et) => et.task.id)
											const allChecked = allIds.every((id) => selectedTaskIds.has(id))
											const firstTask = ct.enclosureTasks[0].task

											return (
												<TableRow key={ct.name}>
													<TableCell>
														<Checkbox
															checked={allChecked}
															onCheckedChange={() => {
																setSelectedTaskIds((prev) => {
																	const next = new Set(prev)
																	if (allChecked) {
																		allIds.forEach((id) => next.delete(id))
																	} else {
																		allIds.forEach((id) => next.add(id))
																	}
																	return next
																})
															}}
														/>
													</TableCell>
													<TableCell className='font-medium'>{ct.name}</TableCell>
													<TableCell>
														{firstTask.priority && (
															<Badge variant='outline' className={priorityColor[firstTask.priority] ?? ''}>
																{firstTask.priority}
															</Badge>
														)}
													</TableCell>
													<TableCell>
														<Badge variant='outline'>{firstTask.status ?? 'pending'}</Badge>
													</TableCell>
													<TableCell>
														<div className='flex gap-1 flex-wrap'>
															{ct.enclosureTasks.map((et) => (
																<Badge key={et.task.id} variant='secondary' className='text-xs'>
																	{et.enclosure.name}
																</Badge>
															))}
														</div>
													</TableCell>
												</TableRow>
											)
										})}
									</TableBody>
								</Table>
							) : (
								<div className='rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground'>
									No common tasks found between the selected enclosures.
								</div>
							)}
						</CardContent>
					</Card>

					<Separator />

					{/* Unique Tasks Section */}
					<Card>
						<CardContent className='pt-6'>
							<div className='flex items-center gap-2 mb-4'>
								<h2 className='text-lg font-semibold'>Unique Tasks</h2>
								<Badge variant='secondary'>{uniqueTasks.length}</Badge>
							</div>

							{uniqueTasks.length > 0 ? (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className='w-10'></TableHead>
											<TableHead>Task</TableHead>
											<TableHead>Priority</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Enclosure</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{uniqueTasks.map((ct) => {
											const task = ct.enclosureTasks[0].task
											const enc = ct.enclosureTasks[0].enclosure
											return (
												<TableRow key={task.id}>
													<TableCell>
														<Checkbox
															checked={selectedTaskIds.has(task.id)}
															onCheckedChange={() => handleToggleTask(task.id)}
														/>
													</TableCell>
													<TableCell className='font-medium'>{ct.name}</TableCell>
													<TableCell>
														{task.priority && (
															<Badge variant='outline' className={priorityColor[task.priority] ?? ''}>
																{task.priority}
															</Badge>
														)}
													</TableCell>
													<TableCell>
														<Badge variant='outline'>{task.status ?? 'pending'}</Badge>
													</TableCell>
													<TableCell>
														<Badge variant='secondary' className='text-xs'>
															{enc.name}
														</Badge>
													</TableCell>
												</TableRow>
											)
										})}
									</TableBody>
								</Table>
							) : (
								<div className='rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground'>
									All tasks are shared across the selected enclosures.
								</div>
							)}
						</CardContent>
					</Card>
				</>
			)}
		</div>
	)
}
