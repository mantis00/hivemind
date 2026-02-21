import { cn } from '@/lib/utils'

export function PageSplit({
	left,
	right,
	rightWidth = '420px',
	className,
	leftClassName,
	rightClassName
}: {
	left: React.ReactNode
	right: React.ReactNode
	rightWidth?: string
	className?: string
	leftClassName?: string
	rightClassName?: string
}) {
	return (
		<div
			className={cn('grid gap-4 flex-1 min-h-0', className)}
			style={{ gridTemplateColumns: `minmax(0, 1fr) ${rightWidth}` }}
		>
			<div className={cn('h-full min-h-0 overflow-y-auto', leftClassName)}>{left}</div>
			<div className={cn('h-full min-h-0 overflow-y-auto', rightClassName)}>{right}</div>
		</div>
	)
}
