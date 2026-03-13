import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export function useLogout() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async () => {
			const supabase = createClient()
			await supabase.auth.signOut()
		},
		onSuccess: async () => {
			// Clear all cached queries
			await queryClient.clear()

			// Hard reload to fully wipe all client state, memory, and cookies
			// so a subsequent login with a different account starts completely fresh
			window.location.replace('/auth/login')
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

export function useLogin() {
	const router = useRouter()

	return useMutation({
		mutationFn: async ({ email, password }: { email: string; password: string }) => {
			const supabase = createClient()
			const { error } = await supabase.auth.signInWithPassword({ email, password })
			if (error) throw error
			return { redirectTo: '/protected' }
		},
		onSuccess: (data) => {
			if (data?.redirectTo) {
				router.push(data.redirectTo)
			}
		}
	})
}

export function useForgotPassword() {
	return useMutation({
		mutationFn: async ({ email }: { email: string }) => {
			const supabase = createClient()
			const { error } = await supabase.auth.resetPasswordForEmail(email, {
				redirectTo: `${window.location.origin}/auth/update-password`
			})
			if (error) throw error
		}
	})
}

export function useSignUp() {
	const router = useRouter()

	return useMutation({
		mutationFn: async ({
			email,
			password,
			firstName,
			lastName
		}: {
			email: string
			password: string
			firstName: string
			lastName: string
		}) => {
			const supabase = createClient()
			const { error } = await supabase.auth.signUp({
				email,
				password,
				options: {
					emailRedirectTo: `${window.location.origin}/protected`,
					data: {
						first_name: firstName.trim(),
						last_name: lastName.trim()
					}
				}
			})
			if (error) throw error
		},
		onSuccess: () => {
			router.push('/auth/sign-up-success')
		}
	})
}

export function useUpdateEmail() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({ email }: { email: string }) => {
			const supabase = createClient()
			const { error } = await supabase.auth.updateUser(
				{ email: email.trim().toLowerCase() },
				{ emailRedirectTo: `${window.location.origin}/auth/confirm?next=/protected/account` }
			)
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
