'use client'

import { useCurrentClientUser } from '@/lib/react-query/auth'
import { useLiveNotificationsRealtime } from '@/lib/react-query/queries'

export function NotificationsRealtimeListener() {
	const { data: user } = useCurrentClientUser()

	useLiveNotificationsRealtime(user?.id)

	return null
}
