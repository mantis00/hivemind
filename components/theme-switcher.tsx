'use client'

import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler'

const ThemeSwitcher = () => {
	return (
		<AnimatedThemeToggler className='flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground' />
	)
}

export { ThemeSwitcher }
