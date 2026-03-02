'use client'

import { useMemo, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Bell, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { useNotifications } from '@/lib/react-query/queries'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import type { Notification } from '@/lib/react-query/queries'
import type { NotificationWithProfile } from '@/context/useNotificationsWithProfiles'
import { useNotificationsWithProfiles } from '@/context/useNotificationsWithProfiles'
import { typeIcons, typeColors, typeBadgeColors, typeLabels, NotificationType } from '@/lib/notificationConfig'
import { getInitials } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/utils'
import { useMarkNotificationAsViewed, useMarkAllNotificationsAsViewed } from '@/lib/react-query/mutations'

// ─── NotificationItem ────────────────────────────────────

function NotificationItem({
	notification,
	onView
}: {
	notification: NotificationWithProfile
	onView: (id: string) => void
}) {
	const Icon = typeIcons[notification.type as NotificationType] ?? Bell
	const senderName = notification.senderProfile?.full_name ?? 'Unknown'
	const initials = getInitials(notification.senderProfile?.full_name)
	const isSystem = notification.senderProfile?.id === 'system'

	const handleClick = () => {
		if (!notification.viewed) {
			onView(notification.id as string)
		}
	}

	const content = (
		<div
			onClick={handleClick}
			className={cn(
				'flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent cursor-pointer',
				!notification.viewed && 'bg-accent/50'
			)}
		>
			<div className='relative shrink-0'>
				<Avatar className='size-8'>
					<AvatarFallback className='bg-muted text-muted-foreground text-[10px] font-medium'>{initials}</AvatarFallback>
				</Avatar>
				<div className='absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-background'>
					<Icon
						className={cn('size-3', typeColors[notification.type as NotificationType] ?? 'text-muted-foreground')}
					/>
				</div>
			</div>

			<div className='min-w-0 flex-1'>
				<div className='flex items-center gap-2'>
					<span className='truncate text-sm font-medium text-foreground'>{senderName}</span>
					<span className='shrink-0 text-xs text-muted-foreground'>{formatRelativeTime(notification.created_at)}</span>
				</div>
				<p className='mt-0.5 truncate text-sm leading-snug text-muted-foreground'>{notification.title}</p>
				<p className='mt-0.5 truncate text-xs leading-snug text-muted-foreground/70'>{notification.description}</p>
			</div>

			{!notification.viewed && (
				<div className='mt-2 shrink-0'>
					<div className='size-2 rounded-full bg-primary' />
				</div>
			)}
		</div>
	)

	if (notification.href) {
		return (
			<Link href={notification.href} className='block' onClick={handleClick}>
				{content}
			</Link>
		)
	}

	return content
}

// ─── NotificationsDropdown ───────────────────────────────

export function NotificationsDropdown() {
	const { data: user } = useCurrentClientUser()
	const { data } = useNotifications(user?.id ?? '')
	const notifications: Notification[] = data ?? []

	const notificationsWithProfiles = useNotificationsWithProfiles(notifications)

	const pathname = usePathname()

	const orgId = useMemo(() => {
		const match = pathname?.match(/^\/protected\/orgs\/([0-9a-fA-F-]{36})/)
		return match?.[1] ?? null
	}, [pathname])

	const [open, setOpen] = useState(false)

	const unviewedCount = notificationsWithProfiles.filter((n) => !n.viewed).length

	const markAsViewedMutation = useMarkNotificationAsViewed(user?.id)
	const markAllMutation = useMarkAllNotificationsAsViewed(user?.id)

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button variant='ghost' size='icon' className='relative'>
					<Bell className='size-5' />
					{unviewedCount > 0 && (
						<span className='absolute top-0 right-0 translate-x-1/2 -translate-y-1/3 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground'>
							{unviewedCount > 9 ? '9+' : unviewedCount}
						</span>
					)}
				</Button>
			</PopoverTrigger>

			<PopoverContent align='end' sideOffset={8} className='flex max-h-120 w-95 flex-col overflow-hidden p-0'>
				<div className='flex shrink-0 items-center justify-between px-4 py-3'>
					<h3 className='text-sm font-semibold'>Notifications</h3>
					{unviewedCount > 0 && (
						<Button
							variant='ghost'
							size='sm'
							className='text-xs text-muted-foreground'
							onClick={() => markAllMutation.mutate()}
						>
							Mark all read
						</Button>
					)}
				</div>

				<Separator />

				<div className='flex-1 overflow-y-auto p-1'>
					{notificationsWithProfiles.length > 0 ? (
						notificationsWithProfiles.map((notification) => (
							<NotificationItem
								key={notification.id}
								notification={notification}
								onView={(id) => markAsViewedMutation.mutate(id)}
							/>
						))
					) : (
						<div className='flex flex-col items-center justify-center py-8 text-center'>
							<Bell className='mb-2 size-8 text-muted-foreground/40' />
							<p className='text-sm text-muted-foreground'>No notifications yet</p>
						</div>
					)}
				</div>

				<Separator />

				<div className='p-2'>
					<Button variant='ghost' asChild className='w-full justify-center text-sm' onClick={() => setOpen(false)}>
						<Link href={orgId ? `/protected/orgs/${orgId}/inbox` : '/protected/inbox'}>
							See all notifications
							<ArrowRight className='ml-1 size-4' />
						</Link>
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	)
}
