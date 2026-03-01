'use client'

import { useCurrentClientUser } from '@/lib/react-query/auth'
import { useMemberProfiles } from '@/lib/react-query/queries'
import { RequestOrgButton } from './request-org-button'
import { CreateOrgButton } from './create-org-button'

export function OrgCreationButtons() {
	const { data: user } = useCurrentClientUser()
	const { data: userProfile } = useMemberProfiles(user?.id ? [user.id] : [])
	const isSuperadmin = userProfile?.some((profile) => profile.is_superadmin === true)

	if (!userProfile) return null

	return isSuperadmin ? <CreateOrgButton /> : <RequestOrgButton />
}
