'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'
import { useCurrentUserProfile } from '@/lib/react-query/queries'
import { useIsMounted } from '@/hooks/use-is-mounted'

export function ThemeSync() {
	const mounted = useIsMounted()
	const { setTheme } = useTheme()
	const { data: profile } = useCurrentUserProfile()
	const initialized = useRef(false)

	useEffect(() => {
		if (mounted && profile?.theme_preference && !initialized.current) {
			setTheme(profile.theme_preference)
			initialized.current = true
		}
	}, [mounted, profile?.theme_preference, setTheme])

	return null
}
