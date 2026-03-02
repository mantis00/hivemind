import { useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'

export function useNotificationMutations(userId?: string) {
	const queryClient = useQueryClient()

	const markAsViewed = useCallback(
		async (notificationId: string) => {
			if (!userId) return
			const supabase = createClient()
			const { error } = await supabase
				.from('notifications')
				.update({
					viewed: true,
					viewed_at: new Date().toISOString()
				})
				.eq('id', notificationId)

			if (error) throw error

			await queryClient.invalidateQueries({
				queryKey: ['notifications', userId]
			})
		},
		[userId, queryClient]
	)

	const deleteNotification = useCallback(async (id: string) => {
		const supabase = createClient()
		const { error } = await supabase.from('notifications').delete().eq('id', id)

		if (error) throw error
	}, [])

	return {
		markAsViewed,
		deleteNotification
	}
}
