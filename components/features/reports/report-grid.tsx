'use client'

import { cn } from '@/lib/utils'
import type { ReportSummary } from './types'
import { ReportCard } from './report-card'

export function ReportGrid({
	items,
	selectedId,
	onSelect,
	className
}: {
	items: ReportSummary[]
	selectedId?: string
	onSelect: (id: string) => void
	className?: string
}) {
	return (
		<div className={cn('rounded-xl border bg-muted/20', className)}>
			<div className='h-full overflow-y-auto p-4'>
				<div className='grid grid-cols-2 gap-4'>
					{items.map((report) => (
						<ReportCard
							key={report.id}
							report={report}
							selected={report.id === selectedId}
							onClick={() => onSelect(report.id)}
						/>
					))}
				</div>
			</div>
		</div>
	)
}
