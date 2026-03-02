import { Bell, AtSign, UserPlus, RefreshCw, AlertCircle } from 'lucide-react'

export type NotificationType = 'mention' | 'invite' | 'update' | 'alert'

export const typeIcons: Record<NotificationType, React.ElementType> = {
	mention: AtSign,
	invite: UserPlus,
	update: RefreshCw,
	alert: AlertCircle
}

export const typeColors: Record<NotificationType, string> = {
	mention: 'text-chart-1',
	invite: 'text-chart-3',
	update: 'text-chart-4',
	alert: 'text-destructive'
}

export const typeBadgeColors: Record<NotificationType, string> = {
	mention: 'bg-chart-1/10 text-chart-1 border-chart-1/20',
	invite: 'bg-chart-3/10 text-chart-3 border-chart-3/20',
	update: 'bg-chart-4/10 text-chart-4 border-chart-4/20',
	alert: 'bg-destructive/10 text-destructive border-destructive/20'
}

export const typeLabels: Record<NotificationType, string> = {
	mention: 'Mention',
	invite: 'Invite',
	update: 'Update',
	alert: 'Alert'
}
