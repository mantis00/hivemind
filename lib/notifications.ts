export type NotificationType = 'mention' | 'comment' | 'invite' | 'update' | 'alert'

export interface Notification {
	id: string
	type: NotificationType
	title: string
	description: string
	timestamp: Date
	read: boolean
	sender: {
		name: string
		avatar?: string
		initials: string
	}
	href?: string
}

// Mock data representing notifications for the current user
export const mockNotifications: Notification[] = [
	{
		id: '1',
		type: 'mention',
		title: 'Mentioned you in a comment',
		description: 'Hey, can you take a look at the latest design revisions?',
		timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 min ago
		read: false,
		sender: {
			name: 'Amara Chen',
			initials: 'AC'
		},
		href: '#'
	},
	{
		id: '2',
		type: 'invite',
		title: 'Invited you to a project',
		description: "You've been added to the Horizon Dashboard project.",
		timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
		read: false,
		sender: {
			name: 'Jordan West',
			initials: 'JW'
		},
		href: '#'
	},
	{
		id: '3',
		type: 'comment',
		title: 'Replied to your thread',
		description: "I agree with the proposed timeline, let's move forward.",
		timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
		read: false,
		sender: {
			name: 'Priya Nakamura',
			initials: 'PN'
		},
		href: '#'
	},
	{
		id: '4',
		type: 'update',
		title: 'Updated the project status',
		description: 'Sprint 4 has been marked as complete.',
		timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
		read: true,
		sender: {
			name: 'Marcus Hale',
			initials: 'MH'
		},
		href: '#'
	},
	{
		id: '5',
		type: 'alert',
		title: 'Deployment succeeded',
		description: 'Your latest push to main has been deployed to production.',
		timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
		read: true,
		sender: {
			name: 'System',
			initials: 'SY'
		},
		href: '#'
	},
	{
		id: '6',
		type: 'comment',
		title: 'Left a comment on your file',
		description: 'The color palette looks great, just one small tweak needed.',
		timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
		read: true,
		sender: {
			name: 'Sofia Reyes',
			initials: 'SR'
		},
		href: '#'
	}
]

export function formatRelativeTime(date: Date): string {
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
