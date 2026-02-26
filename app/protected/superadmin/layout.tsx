import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

type OrgLayoutProps = {
	children: React.ReactNode
}

export default async function OrgLayout({ children }: OrgLayoutProps) {
	const supabase = await createClient()

	const {
		data: { user },
		error: userError
	} = await supabase.auth.getUser()

	if (userError || !user) {
		redirect('/auth/login')
	}

	// Query for is_superadmin
	const { data: profile, error: profileError } = await supabase
		.from('profiles')
		.select('is_superadmin')
		.eq('id', user.id)
		.maybeSingle()

	if (profileError || !profile || !profile.is_superadmin) {
		throw new Error('You do not have superadmin access')
	}

	return children
}
