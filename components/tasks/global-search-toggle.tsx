'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'

interface GlobalSearchToggleProps {
	globalSearch: boolean
	onGlobalSearchChange: (value: boolean) => void
}

export function GlobalSearchToggle({ globalSearch, onGlobalSearchChange }: GlobalSearchToggleProps) {
	const [confirmOpen, setConfirmOpen] = useState(false)

	const handleToggle = (checked: boolean) => {
		if (checked) {
			setConfirmOpen(true)
		} else {
			onGlobalSearchChange(false)
		}
	}

	return (
		<>
			<div className='flex items-center gap-2'>
				<Switch id='global-search' checked={globalSearch} onCheckedChange={handleToggle} />
				<Label htmlFor='global-search' className='text-xs text-muted-foreground whitespace-nowrap cursor-pointer'>
					All dates
				</Label>
			</div>

			<ResponsiveDialogDrawer
				title='Search all dates?'
				description='This will fetch every task across all dates, which may take a moment with large datasets. Consider using the date range filter for faster results.'
				trigger={null}
				open={confirmOpen}
				onOpenChange={(open) => {
					if (!open) setConfirmOpen(false)
				}}
				footer={
					<div className='flex gap-2 w-full'>
						<Button
							className='flex-1'
							onClick={() => {
								onGlobalSearchChange(true)
								setConfirmOpen(false)
							}}
						>
							Search all
						</Button>
					</div>
				}
			>
				<div className='flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/30 p-3 text-sm text-orange-800 dark:text-orange-300'>
					<AlertTriangle className='h-4 w-4 shrink-0 mt-0.5' />
					<p>
						For large datasets, use the <strong>Date range</strong> filter instead to narrow results without fetching
						everything.
					</p>
				</div>
			</ResponsiveDialogDrawer>
		</>
	)
}
