// 'use client'
// import { ListIcon } from 'lucide-react'
// import { useParams } from 'next/navigation'
// import { CreateTaskButton } from './create-form'
// import { Badge } from '../ui/badge'
// import { TasksDataTable } from './tasks-table'

// export default function TasksGrid() {
// 	const params = useParams()
// 	const orgId = params?.orgId as number | undefined
// 	const enclosureId = params?.enclosureId as number | undefined

// 	return (
// 		<div className='bg-background full min-h-screen'>
// 			<div className='mx-auto max-w-3xl px-4 py-8'>
// 				{/* Header */}
// 				<div className='mb-2'>
// 					<div className='flex items-center gap-3 mb-2'>
// 						<ListIcon className='h-7 w-7 text-foreground' />
// 						<h1 className='text-2xl font-bold tracking-tight text-balance'>Tasks</h1>
// 						<div className='ml-auto'>
// 							<CreateTaskButton
// 								open={false}
// 								setOpen={function (open: boolean): void {
// 									throw new Error('Function not implemented.')
// 								}}
// 							/>
// 						</div>
// 					</div>
// 					<p className='text-sm text-muted-foreground'>Browse tasks, create tasks, and mark tasks as complete.</p>
// 					<div className='flex items-center gap-3 mt-3'>
// 						<Badge variant='secondary'># Tasks</Badge>
// 						{/* <Badge variant="outline">{totalEnclosures} enclosures</Badge> */}
// 					</div>
// 				</div>
// 			</div>

// 			{enclosureId && <TasksDataTable enclosureId={enclosureId} />}
// 		</div>
// 	)
// }
