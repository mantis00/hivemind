'use client'

import { useState } from 'react'
import { ReportFilters } from './report-filters'
import { ReportGrid } from './report-grid'
import { ReportDetailPanel } from './report-detail'
import type { ReportDetail, ReportSummary } from './types'
import { PageSplit } from '@/components/layout/page-split'

const mockReports: ReportSummary[] = [
	{
		id: 'r1',
		title: 'Daily Report - Nov 14, 2025',
		overdueTasks: 4,
		notesAdded: 3,
		speciesAdded: 0,
		enclosuresAdded: 1,
		criticalAlerts: 2
	},
	{
		id: 'r2',
		title: 'Weekly Report - Nov 9-15, 2025',
		overdueTasks: 5,
		notesAdded: 1,
		speciesAdded: 1,
		enclosuresAdded: 3,
		criticalAlerts: 2
	},
	{
		id: 'r3',
		title: 'Report',
		overdueTasks: 0,
		notesAdded: 0,
		speciesAdded: 0,
		enclosuresAdded: 0,
		criticalAlerts: 0
	},
	{
		id: 'r4',
		title: 'Report',
		overdueTasks: 0,
		notesAdded: 0,
		speciesAdded: 0,
		enclosuresAdded: 0,
		criticalAlerts: 0
	}
]

const mockDetail: ReportDetail = {
	id: 'r1',
	title: 'Daily Report – Nov 14, 2025',
	subtitle: 'Generated automatically at 7:00 AM',
	sections: [
		{
			title: 'Overdue Tasks',
			items: ['Tank 7 – Clean Bedding – 2 days overdue', 'Tank 12 – Feed – 1 day overdue']
		},
		{
			title: 'Notes Added (3)',
			items: ['10:04 AM – Jane added note to Tank 4', '12:14 PM – John added species-level note']
		},
		{
			title: 'Enclosures Added (1)',
			items: ['Tank 22 created by Admin']
		},
		{
			title: 'System Alerts Triggered (3)',
			items: ['Humidity low in Tank 12', 'Substrate change overdue (Mantises)', 'High temp alert in Tank 3']
		}
	]
}

export function ReportsPage() {
	const [selectedId, setSelectedId] = useState<string>(mockReports[0].id)
	const selected = mockDetail

	return (
		<div className='space-y-4 flex flex-col min-h-0'>
			<ReportFilters />
			<PageSplit
				rightWidth='460px'
				left={<ReportGrid items={mockReports} selectedId={selectedId} onSelect={setSelectedId} className='h-full' />}
				right={<ReportDetailPanel report={selected} />}
			/>
		</div>
	)
}
