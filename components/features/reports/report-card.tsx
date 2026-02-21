'use client'

import type { ReportSummary } from './types'

export function ReportCard({
	report,
	selected,
	onClick
}: {
	report: ReportSummary
	selected?: boolean
	onClick?: () => void
}) {
	return (
		<button
			type='button'
			onClick={onClick}
			className={`rounded-xl border-2 bg-muted/50 px-4 py-4 text-left shadow-sm transition hover:bg-muted ${
				selected ? 'border-red-500 ring-2 ring-red-400' : 'border-sky-400'
			}`}
		>
			<div className='text-sm font-semibold'>{report.title}</div>
			<div className='mt-2 text-xs text-muted-foreground space-y-1'>
				<div>Tasks Overdue: {report.overdueTasks}</div>
				<div>Notes Added: {report.notesAdded}</div>
				<div>Species Added: {report.speciesAdded}</div>
				<div>Enclosures Added: {report.enclosuresAdded}</div>
				<div>Critical Alerts: {report.criticalAlerts}</div>
			</div>
		</button>
	)
}
