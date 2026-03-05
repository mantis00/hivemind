'use client'

import { useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Bell, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { useNotifications } from '@/lib/react-query/queries'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import type { Notification } from '@/lib/react-query/queries'
import { useNotificationsWithProfiles } from '@/context/notifications-with-profiles'
import { useMarkNotificationAsViewed, useMarkAllNotificationsAsViewed } from '@/lib/react-query/mutations'
import { NotificationRow } from '@/components/notification/notification-row'

// ─── NotificationsDropdown ───────────────────────────────

export function NotificationDropdown() {
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

	const unreadNotifications = notificationsWithProfiles.filter((n) => !n.viewed)
	const unviewedCount = unreadNotifications.length

	const [visibleIds, setVisibleIds] = useState<string[]>([])
	const visibleNotifications = notificationsWithProfiles.filter((n) => visibleIds.includes(n.id))

	const markAsViewedMutation = useMarkNotificationAsViewed(user?.id)
	const markAllMutation = useMarkAllNotificationsAsViewed(user?.id)

	const handleOpenChange = (isOpen: boolean) => {
		setOpen(isOpen)

		if (isOpen) {
			setVisibleIds(unreadNotifications.map((n) => n.id))
		}
	}

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger asChild>
				<Button variant='ghost' size='icon' className='relative'>
					<Bell className='size-5' />
					{unviewedCount > 0 && (
						<span className='absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground'>
							{unviewedCount > 9 ? '9+' : unviewedCount}
						</span>
					)}
				</Button>
			</PopoverTrigger>

			<PopoverContent
				align='center'
				sideOffset={8}
				className='flex flex-col overflow-hidden p-0 max-h-[70vh] w-[calc(100vw-1rem)] sm:w-95 mx-2 sm:mx-0'
			>
				<div className='flex shrink-0 items-center justify-between px-4 py-3'>
					<h3 className='text-sm font-semibold'>Unread Notifications</h3>
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
					{visibleNotifications.length > 0 ? (
						visibleNotifications.map((notification) => (
							<NotificationRow
								key={notification.id}
								notification={notification}
								onView={(id: string) => markAsViewedMutation.mutate(id)}
								showCheckbox={false}
								showDelete={false}
								compact
							/>
						))
					) : (
						<div className='flex flex-col items-center justify-center py-8 text-center'>
							<Bell className='mb-2 size-8 text-muted-foreground/40' />
							<p className='text-sm text-muted-foreground'>No unread notifications</p>
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
