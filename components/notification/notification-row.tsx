import { typeIcons, typeBadgeColors, typeLabels, NotificationType, typeColors } from '@/context/notification-config'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Bell } from 'lucide-react'
import { NotificationWithProfile } from '@/context/notifications-with-profiles'
import { getInitials } from '@/context/get-initials'
import { formatRelativeTime } from '@/context/format-date-time'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export function NotificationRow({
	notification,
	isSelected = false,
	onSelect,
	onDelete,
	onView,
	showCheckbox = true,
	showDelete = true,
	compact = false
}: {
	notification: NotificationWithProfile
	isSelected?: boolean
	onSelect?: (id: string, checked: boolean) => void
	onDelete?: (notification: NotificationWithProfile) => void
	onView: (id: string) => void
	showCheckbox?: boolean
	showDelete?: boolean
	compact?: boolean
}) {
	const Icon = typeIcons[notification.type as NotificationType] ?? Bell
	const senderName = notification.senderProfile?.full_name ?? 'Unknown'
	const initials = getInitials(notification.senderProfile?.full_name)
	const typeBadge = typeBadgeColors[notification.type as NotificationType]
	const typeLabel = typeLabels[notification.type as NotificationType] ?? notification.type

	const handleRowClick = () => {
		if (!notification.viewed) {
			onView(notification.id as string)
		}
	}

	return (
		<div
			onClick={handleRowClick}
			className={cn(
				'group flex items-center gap-4 rounded-lg px-4 py-3 transition-colors cursor-pointer',
				compact && 'px-3 py-2 gap-3',
				!notification.viewed && 'bg-accent/50',
				isSelected && 'bg-accent',
				notification.viewed && !isSelected && 'hover:bg-accent/30'
			)}
		>
			{showCheckbox && onSelect && (
				<Checkbox
					checked={!!isSelected}
					onCheckedChange={(checked) => onSelect(notification.id as string, !!checked)}
					onClick={(e) => e.stopPropagation()}
					aria-label={`Select notification from ${senderName}`}
				/>
			)}

			<div className='relative shrink-0'>
				<Avatar className={cn(compact ? 'size-8' : 'size-9')}>
					<AvatarFallback className='bg-muted text-muted-foreground text-xs font-medium'>{initials}</AvatarFallback>
				</Avatar>
				<div className='absolute -bottom-0.5 -right-0.5 flex size-4.5 items-center justify-center rounded-full bg-background border'>
					<Icon
						className={cn('size-3', typeColors[notification.type as NotificationType] ?? 'text-muted-foreground')}
					/>
				</div>
			</div>

			<div className='min-w-0 flex-1'>
				<div className='flex items-center gap-2'>
					<span className={cn('truncate font-medium text-foreground', compact ? 'text-sm' : 'text-sm')}>
						{senderName}
					</span>
					<Badge variant='outline' className={cn('text-[10px] px-1.5 py-0 shrink-0', typeBadge)}>
						{typeLabel}
					</Badge>
					{!notification.viewed && <span className='size-2 shrink-0 rounded-full bg-primary' />}
				</div>
				{notification.href ? (
					<Link href={notification.href} className='hover:underline' onClick={(e) => e.stopPropagation()}>
						<p className='mt-0.5 truncate text-sm leading-snug text-muted-foreground'>{notification.title}</p>
					</Link>
				) : (
					<p className='mt-0.5 truncate text-sm leading-snug text-muted-foreground'>{notification.title}</p>
				)}
				<p className='mt-0.5 truncate text-xs leading-snug text-muted-foreground/70'>{notification.description}</p>
			</div>

			<div className='flex shrink-0 items-center gap-2'>
				<span className='text-xs text-muted-foreground whitespace-nowrap'>
					{formatRelativeTime(notification.created_at)}
				</span>
				{showDelete && onDelete && (
					<TooltipProvider delayDuration={300}>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant='ghost'
									size='icon'
									className='size-8 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive'
									onClick={(e) => {
										e.stopPropagation()
										onDelete(notification)
									}}
									aria-label='Delete notification'
								>
									<Trash2 className='size-4' />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Delete notification</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				)}
			</div>
		</div>
	)
}
