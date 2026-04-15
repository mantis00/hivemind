import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

type OrgLayoutProps = {
	children: React.ReactNode
	params: Promise<{ orgId: string }>
}

export default async function OrgLayout({ children, params }: OrgLayoutProps) {
	const { orgId } = await params

	const supabase = await createClient()

	const {
		data: { user },
		error: userError
	} = await supabase.auth.getUser()

	if (userError || !user) {
		redirect('/auth/login')
	}

	const { data: membership, error: membershipError } = await supabase
		.from('user_org_role')
		.select('user_id')
		.eq('user_id', user.id)
		.eq('org_id', orgId)
		.maybeSingle()

	// Allow access if user is a superadmin, even without org membership
	const { data: profile } = await supabase.from('profiles').select('is_superadmin').eq('id', user.id).maybeSingle()

	if ((membershipError || !membership) && !profile?.is_superadmin) {
		throw new Error('You do not have access to this organization') // thrown and caught by protected/error.tsx
	}

	return children
}
