'use client'

import type { ReportDetail } from './types'

export function ReportDetailPanel({ report }: { report: ReportDetail }) {
	return (
		<div className='rounded-xl border bg-muted/20 p-4 space-y-4'>
			<div>
				<h2 className='text-xl font-semibold'>{report.title}</h2>
				<p className='text-xs text-muted-foreground'>{report.subtitle}</p>
				<p className='mt-2 text-xs text-muted-foreground italic'>Report formatting is still being finalized.</p>
			</div>

			<div className='space-y-4 text-sm'>
				{report.sections.map((section) => (
					<div key={section.title}>
						<div className='font-semibold'>{section.title}</div>
						<ul className='list-disc pl-5 text-muted-foreground'>
							{section.items.map((item) => (
								<li key={item}>{item}</li>
							))}
						</ul>
					</div>
				))}
			</div>
		</div>
	)
}
