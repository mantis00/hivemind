'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function ReportFilters() {
	return (
		<div className='flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-2'>
			<Select defaultValue='range'>
				<SelectTrigger className='w-36'>
					<SelectValue placeholder='Time Range' />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value='range'>Time Range</SelectItem>
					<SelectItem value='daily'>Daily</SelectItem>
					<SelectItem value='weekly'>Weekly</SelectItem>
					<SelectItem value='monthly'>Monthly</SelectItem>
				</SelectContent>
			</Select>

			<Select defaultValue='type'>
				<SelectTrigger className='w-36'>
					<SelectValue placeholder='Report Type' />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value='type'>Report Type</SelectItem>
					<SelectItem value='summary'>Summary</SelectItem>
					<SelectItem value='alerts'>Alerts</SelectItem>
				</SelectContent>
			</Select>

			<Select defaultValue='severity'>
				<SelectTrigger className='w-32'>
					<SelectValue placeholder='Severity' />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value='severity'>Severity</SelectItem>
					<SelectItem value='critical'>Critical</SelectItem>
					<SelectItem value='warning'>Warning</SelectItem>
				</SelectContent>
			</Select>

			<Select defaultValue='sort'>
				<SelectTrigger className='w-28'>
					<SelectValue placeholder='Sort' />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value='sort'>Sort</SelectItem>
					<SelectItem value='recent'>Most Recent</SelectItem>
					<SelectItem value='severity'>Severity</SelectItem>
				</SelectContent>
			</Select>
		</div>
	)
}
