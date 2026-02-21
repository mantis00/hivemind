'use client'

export function DashboardSummary() {
	return (
		<div className='grid gap-2 rounded-lg border bg-muted/30 p-2 text-sm sm:grid-cols-2 lg:grid-cols-4'>
			<div className='flex items-center justify-between rounded-md bg-background px-3 py-2'>
				<span>## Active Enclosures</span>
				<span className='text-muted-foreground'>—</span>
			</div>
			<div className='flex items-center justify-between rounded-md bg-background px-3 py-2'>
				<span>## Tasks Due Today</span>
				<span className='text-muted-foreground'>—</span>
			</div>
			<div className='flex items-center justify-between rounded-md bg-background px-3 py-2'>
				<span>## Upcoming Tasks</span>
				<span className='text-muted-foreground'>—</span>
			</div>
			<div className='flex items-center justify-between rounded-md bg-background px-3 py-2'>
				<span>## Alerts</span>
				<span className='text-muted-foreground'>—</span>
			</div>
		</div>
	)
}
