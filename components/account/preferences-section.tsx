'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useUpdateThemePreference } from '@/lib/react-query/mutations'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { useIsMounted } from '@/hooks/use-is-mounted'
import { useAnimatedThemeChange } from '@/components/ui/animated-theme-toggler'

const THEMES = [
	{ value: 'light', label: 'Light', icon: Sun },
	{ value: 'dark', label: 'Dark', icon: Moon },
	{ value: 'system', label: 'System', icon: Monitor }
] as const

export function PreferencesSection() {
	const mounted = useIsMounted()
	const { theme } = useTheme()
	const { data: user } = useCurrentClientUser()
	const updateTheme = useUpdateThemePreference()

	const changeTheme = useAnimatedThemeChange((value) => {
		if (user?.id) {
			updateTheme.mutate({ userId: user.id, theme: value })
		}
	})

	if (!mounted) return null

	return (
		<Card>
			<CardHeader>
				<CardTitle className='flex items-center gap-2 text-base'>
					<Settings className='h-4 w-4' /> Preferences
				</CardTitle>
				<CardDescription>Customize your experience</CardDescription>
			</CardHeader>
			<CardContent className='grid gap-4'>
				<div>
					<p className='text-sm font-medium mb-3'>Theme</p>
					<div className='flex gap-2 flex-wrap'>
						{THEMES.map(({ value, label, icon: Icon }) => (
							<Button
								key={value}
								variant={theme === value ? 'default' : 'outline'}
								size='sm'
								onClick={(e) => changeTheme(value, e.currentTarget)}
								className='flex items-center gap-2'
							>
								<Icon className='h-4 w-4' />
								{label}
							</Button>
						))}
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
