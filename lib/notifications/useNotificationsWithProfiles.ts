import { useMemo } from 'react'
import { useMemberProfiles } from '@/lib/react-query/queries'
import type { Notification } from '@/lib/react-query/queries'

export type NotificationWithProfile = Notification & {
	senderProfile: { id: string; full_name: string }
}

export function useNotificationsWithProfiles(notifications: Notification[]) {
	const involvedUserIds = useMemo(() => {
		const ids = new Set<string>()
		notifications.forEach((n) => {
			if (n.sender_id) ids.add(n.sender_id)
			if (n.recipient_id) ids.add(n.recipient_id)
		})
		return Array.from(ids)
	}, [notifications])

	const { data: profiles } = useMemberProfiles(involvedUserIds)

	const profileMap = useMemo(() => {
		const map = new Map<string, { id: string; full_name: string }>()
		profiles?.forEach((p) => map.set(p.id, p))
		return map
	}, [profiles])

	const notificationsWithProfiles = useMemo(() => {
		return notifications.map((n) => ({
			...n,
			senderProfile: profileMap.get(n.sender_id) ?? {
				id: 'system',
				full_name: 'System'
			}
		}))
	}, [notifications, profileMap])

	return notificationsWithProfiles
}
