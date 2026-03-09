import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
export function useLogout() {
	const router = useRouter()
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async () => {
			const supabase = createClient()
			const { error } = await supabase.auth.signOut()
			if (error) throw error
		},
		onSuccess: async () => {
			// Clear all cached queries
			await queryClient.clear()

			// Redirect
			router.replace('/auth/login')
		}
	})
}

// this will fetch from the supabase auth user endpoint
export function useCurrentClientUser() {
	return useQuery({
		queryKey: ['currentUser'],
		queryFn: async (): Promise<User | null> => {
			const supabase = createClient()
			const {
				data: { user },
				error
			} = await supabase.auth.getUser()

			if (error) throw error
			return user
		},
		staleTime: 5 * 60 * 1000,
		retry: false
	})
}

// this will fetch from the client user session token claims
export function useCurrentClientUserClaims() {
	return useQuery({
		queryKey: ['currentUserClaims'],
		queryFn: async (): Promise<Record<string, unknown> | null> => {
			const supabase = createClient()
			const { data, error } = await supabase.auth.getClaims()

			if (error) throw error
			return data?.claims ?? null
		},
		staleTime: 5 * 60 * 1000,
		retry: false
	})
}

export function useResestPassword() {
	return useMutation({
		mutationFn: async ({ password }: { password: string }) => {
			const supabase = createClient()
			const { error } = await supabase.auth.updateUser({ password })
			if (error) throw error
		},
		onSuccess: () => {
			toast.success('Password updated successfully!')
		}
	})
}

export function useUpdateEmail() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ email }: { email: string }) => {
			const supabase = createClient()
			const { error } = await supabase.auth.updateUser({ email: email.trim().toLowerCase() })
			if (error) throw error
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['currentUser'] })
			queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] })
			queryClient.invalidateQueries({ queryKey: ['allProfiles'] })
			toast.success('Confirmation sent — check your inbox to verify the new email.')
		}
	})
}
