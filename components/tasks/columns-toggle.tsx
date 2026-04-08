'use client'

import { Columns3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { DEFAULT_COLUMN_LABELS } from '@/context/task-config'
import { useIsMobile } from '@/hooks/use-mobile'

interface ColumnsToggleProps {
	defaultColumnIds: string[]
	extraColumnIds: string[]
	onExtraColumnsChange: (cols: string[]) => void
	toggleableColumns: { id: string; label: string }[]
}

export function ColumnsToggle({
	defaultColumnIds,
	extraColumnIds,
	onExtraColumnsChange,
	toggleableColumns
}: ColumnsToggleProps) {
	const isMobile = useIsMobile()
	const trigger = isMobile ? (
		<Button variant='outline' size='sm' className='h-8 gap-1.5'>
			<Columns3 className='h-3.5 w-3.5' />
			Columns
			{extraColumnIds.length > 0 && (
				<span className='ml-0.5 rounded-full bg-primary text-primary-foreground text-[10px] leading-none px-1.5 py-0.5'>
					+{extraColumnIds.length}
				</span>
			)}
		</Button>
	) : (
		<Button variant='outline' className='gap-2'>
			<Columns3 className='h-4 w-4' />
			Columns
			{extraColumnIds.length > 0 && (
				<span className='ml-0.5 rounded-full bg-primary text-primary-foreground text-[10px] leading-none px-1.5 py-0.5'>
					+{extraColumnIds.length}
				</span>
			)}
		</Button>
	)

	const allSelected = toggleableColumns.length > 0 && toggleableColumns.every((col) => extraColumnIds.includes(col.id))

	return (
		<ResponsiveDialogDrawer
			title='Columns'
			description='Choose which columns to display. Default columns cannot be removed.'
			trigger={trigger}
			footer={
				toggleableColumns.length > 0 ? (
					<Button
						className='w-full'
						onClick={() => onExtraColumnsChange(allSelected ? [] : toggleableColumns.map((c) => c.id))}
					>
						{allSelected ? 'Deselect all' : 'Select all'}
					</Button>
				) : undefined
			}
		>
			<div className='flex flex-col gap-5 py-1'>
				<div className='flex flex-col gap-2.5'>
					<p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>Default (locked)</p>
					{defaultColumnIds.map((id) => (
						<div key={id} className='flex items-center gap-2.5 opacity-50 cursor-not-allowed select-none'>
							<Checkbox id={`col-default-${id}`} checked disabled />
							<Label htmlFor={`col-default-${id}`} className='cursor-not-allowed font-normal'>
								{DEFAULT_COLUMN_LABELS[id] ?? id}
							</Label>
						</div>
					))}
				</div>

				{toggleableColumns.length > 0 && (
					<div className='flex flex-col gap-2.5'>
						<p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>Optional</p>
						{toggleableColumns.map((col) => {
							const checked = extraColumnIds.includes(col.id)
							return (
								<div key={col.id} className='flex items-center gap-2.5'>
									<Checkbox
										id={`col-opt-${col.id}`}
										checked={checked}
										onCheckedChange={(value) => {
											if (value) {
												onExtraColumnsChange([...extraColumnIds, col.id])
											} else {
												onExtraColumnsChange(extraColumnIds.filter((c) => c !== col.id))
											}
										}}
									/>
									<Label htmlFor={`col-opt-${col.id}`} className='cursor-pointer font-normal'>
										{col.label}
									</Label>
								</div>
							)
						})}
					</div>
				)}
			</div>
		</ResponsiveDialogDrawer>
	)
}
