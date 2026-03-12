'use client'

import { useCurrentClientUser } from '@/lib/react-query/auth'
import { useMemberProfiles } from '@/lib/react-query/queries'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { ShieldUser, LoaderCircle } from 'lucide-react'
import { useState } from 'react'

export default function SuperadminButton() {
	const { data: user } = useCurrentClientUser()
	const { data: userProfile } = useMemberProfiles(user?.id ? [user.id] : [])
	const router = useRouter()
	const [loading, setLoading] = useState(false)
	const isSuperadmin = userProfile?.some((profile) => profile.is_superadmin === true)

	if (!isSuperadmin) return null

	const handleClick = () => {
		setLoading(true)
		router.push('/protected/superadmin')
	}

	return (
		<Button className='mb-2' onClick={handleClick} disabled={loading}>
			Superadmin Page
			{loading ? <LoaderCircle className='w-4 h-4 animate-spin' /> : <ShieldUser className='w-4 h-4' />}
		</Button>
	)
}
