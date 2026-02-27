'use client'

import { useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bell, ArrowRight, AtSign, MessageSquare, UserPlus, RefreshCw, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'

// ─── Types ───────────────────────────────────────────────

export type NotificationType = 'mention' | 'comment' | 'invite' | 'update' | 'alert'

export interface Notification {
	id: string
	type: NotificationType
	title: string
	description: string
	timestamp: Date
	viewed: boolean
	sender: {
		name: string
		avatar?: string
		initials: string
	}
	href?: string
}

// ─── Mock data ───────────────────────────────────────────

const mockNotifications: Notification[] = [
	{
		id: '1',
		type: 'mention',
		title: 'Mentioned you in a comment',
		description: 'Hey, can you take a look at the latest design revisions?',
		timestamp: new Date(Date.now() - 1000 * 60 * 5),
		viewed: false,
		sender: { name: 'Amara Chen', initials: 'AC' },
		href: '#'
	},
	{
		id: '2',
		type: 'invite',
		title: 'Invited you to a project',
		description: "You've been added to the Horizon Dashboard project.",
		timestamp: new Date(Date.now() - 1000 * 60 * 30),
		viewed: false,
		sender: { name: 'Jordan West', initials: 'JW' },
		href: '#'
	},
	{
		id: '3',
		type: 'comment',
		title: 'Replied to your thread',
		description: "I agree with the proposed timeline, let's move forward.",
		timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
		viewed: false,
		sender: { name: 'Priya Nakamura', initials: 'PN' },
		href: '#'
	},
	{
		id: '4',
		type: 'update',
		title: 'Updated the project status',
		description: 'Sprint 4 has been marked as complete.',
		timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
		viewed: true,
		sender: { name: 'Marcus Hale', initials: 'MH' },
		href: '#'
	},
	{
		id: '5',
		type: 'alert',
		title: 'Deployment succeeded',
		description: 'Your latest push to main has been deployed to production.',
		timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
		viewed: true,
		sender: { name: 'System', initials: 'SY' },
		href: '#'
	},
	{
		id: '6',
		type: 'comment',
		title: 'Left a comment on your file',
		description: 'The color palette looks great, just one small tweak needed.',
		timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
		viewed: true,
		sender: { name: 'Sofia Reyes', initials: 'SR' },
		href: '#'
	}
]

// ─── Helpers ─────────────────────────────────────────────

function formatRelativeTime(date: Date): string {
	const now = new Date()
	const diffMs = now.getTime() - date.getTime()
	const diffSec = Math.floor(diffMs / 1000)
	const diffMin = Math.floor(diffSec / 60)
	const diffHour = Math.floor(diffMin / 60)
	const diffDay = Math.floor(diffHour / 24)

	if (diffMin < 1) return 'Just now'
	if (diffMin < 60) return `${diffMin}m ago`
	if (diffHour < 24) return `${diffHour}h ago`
	if (diffDay < 7) return `${diffDay}d ago`
	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const typeIcons: Record<NotificationType, React.ElementType> = {
	mention: AtSign,
	comment: MessageSquare,
	invite: UserPlus,
	update: RefreshCw,
	alert: AlertCircle
}

const typeColors: Record<NotificationType, string> = {
	mention: 'text-chart-1',
	comment: 'text-chart-2',
	invite: 'text-chart-3',
	update: 'text-chart-4',
	alert: 'text-destructive'
}

// ─── NotificationItem ────────────────────────────────────

function NotificationItem({ notification }: { notification: Notification }) {
	const Icon = typeIcons[notification.type]

	return (
		<div
			className={cn(
				'flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent',
				!notification.viewed && 'bg-accent/50'
			)}
		>
			<div className='relative shrink-0'>
				<Avatar className='size-8'>
					<AvatarFallback className='bg-muted text-muted-foreground text-[10px] font-medium'>
						{notification.sender.initials}
					</AvatarFallback>
				</Avatar>
				<div className='absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-background'>
					<Icon className={cn('size-3', typeColors[notification.type])} />
				</div>
			</div>

			<div className='min-w-0 flex-1'>
				<div className='flex items-center gap-2'>
					<span className='truncate text-sm font-medium text-foreground'>{notification.sender.name}</span>
					<span className='shrink-0 text-xs text-muted-foreground'>{formatRelativeTime(notification.timestamp)}</span>
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
}

// ─── NotificationsDropdown ───────────────────────────────

interface NotificationsDropdownProps {
	notifications?: Notification[]
}

export function NotificationsDropdown({ notifications = mockNotifications }: NotificationsDropdownProps) {
	const pathname = usePathname()
	const orgId = useMemo(() => {
		// Match UUIDs (8-4-4-4-12 hex)
		const match = pathname?.match(
			/^\/protected\/orgs\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/
		)
		return match?.[1] ?? null
	}, [pathname])
	const [open, setOpen] = useState(false)
	const unviewedCount = notifications.filter((n) => !n.viewed).length

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant='ghost'
					size='icon'
					className='relative'
					aria-label={`Notifications${unviewedCount > 0 ? `, ${unviewedCount} unread` : ''}`}
				>
					<Bell className='size-5' />
					{unviewedCount > 0 && (
						<span className='absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold leading-none text-primary-foreground'>
							{unviewedCount > 9 ? '9+' : unviewedCount}
						</span>
					)}
				</Button>
			</PopoverTrigger>

			<PopoverContent
				align='end'
				sideOffset={8}
				className='flex max-h-[min(480px,var(--radix-popover-content-available-height))] w-95 flex-col overflow-hidden p-0'
			>
				{/* Header */}
				<div className='flex shrink-0 items-center justify-between px-4 py-3'>
					<div className='flex items-center gap-2'>
						<h3 className='text-sm font-semibold text-foreground'>Notifications</h3>
						{unviewedCount > 0 && (
							<span className='flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground'>
								{unviewedCount}
							</span>
						)}
					</div>
				</div>

				<Separator />

				{/* Notification list */}
				<div className='min-h-0 flex-1 overflow-y-auto'>
					<div className='p-1'>
						{notifications.length > 0 ? (
							notifications.map((notification) => (
								<NotificationItem key={notification.id} notification={notification} />
							))
						) : (
							<div className='flex flex-col items-center justify-center py-8 text-center'>
								<Bell className='mb-2 size-8 text-muted-foreground/40' />
								<p className='text-sm text-muted-foreground'>No notifications yet</p>
								<p className='mt-1 text-xs text-muted-foreground/60'>{"We'll let you know when something arrives"}</p>
							</div>
						)}
					</div>
				</div>

				<Separator />

				{/* Footer with See All */}
				<div className='relative z-10 shrink-0 bg-popover p-2'>
					<Button
						variant='ghost'
						asChild
						className='w-full justify-center text-sm text-muted-foreground hover:text-foreground'
						onClick={() => setOpen(false)}
					>
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
