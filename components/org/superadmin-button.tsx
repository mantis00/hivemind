'use client'

import { useCurrentClientUser } from '@/lib/react-query/auth'
import { useMemberProfiles } from '@/lib/react-query/queries'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { ShieldUser } from 'lucide-react'

export default function SuperadminButton() {
	const { data: user } = useCurrentClientUser()
	const { data: userProfile } = useMemberProfiles(user?.id ? [user.id] : [])
	const router = useRouter()
	const isSuperadmin = userProfile?.some((profile) => profile.is_superadmin === true)

	if (!isSuperadmin) return null

	return (
		<Button className='mb-2' onClick={() => router.push('/protected/superadmin')}>
			Superadmin Page <ShieldUser className='w-4 h-4' />
		</Button>
	)
}
