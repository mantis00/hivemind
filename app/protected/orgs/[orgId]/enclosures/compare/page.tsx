import CompareTasksView from '@/components/enclosures/compare-tasks-view'
import { ClipboardCheck } from 'lucide-react'

export default async function ComparePage() {
	return (
		<div className='space-y-4 w-full justify-center items-center'>
			<div className='flex-col mx-auto max-w-5xl flex'>
				<div className='pb-5 flex items-center gap-3'>
					<ClipboardCheck className='h-7 w-7 text-foreground' />
					<h1 className='text-2xl font-semibold'>Compare Enclosure Tasks</h1>
				</div>
				<CompareTasksView />
			</div>
		</div>
	)
}
