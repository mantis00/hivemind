'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function useLogout() {
	const router = useRouter()

	return async function logout() {
		const supabase = createClient()
		await supabase.auth.signOut()
		router.replace('/auth/login')
	}
}
