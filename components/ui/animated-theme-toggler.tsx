'use client'

import { useCallback, useRef } from 'react'
import { Moon, Sun } from 'lucide-react'
import { flushSync } from 'react-dom'
import { useTheme } from 'next-themes'

import { cn } from '@/lib/utils'
import { useIsMounted } from '@/hooks/use-is-mounted'

/**
 * Reusable hook that wraps any theme change with the ripple view-transition animation.
 * `onThemeChange` fires after the theme is applied — use it for side-effects like DB mutations.
 */
export function useAnimatedThemeChange(onThemeChange?: (theme: string) => void, duration = 400) {
	const { setTheme } = useTheme()

	return useCallback(
		(newTheme: string, fromElement?: HTMLElement | null) => {
			const rect = fromElement?.getBoundingClientRect()
			const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2
			const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2
			const vw = window.visualViewport?.width ?? window.innerWidth
			const vh = window.visualViewport?.height ?? window.innerHeight
			const maxRadius = Math.hypot(Math.max(x, vw - x), Math.max(y, vh - y))

			const applyTheme = () => {
				setTheme(newTheme)
				onThemeChange?.(newTheme)
			}

			if (typeof document.startViewTransition !== 'function') {
				applyTheme()
				return
			}

			const transition = document.startViewTransition(() => {
				flushSync(applyTheme)
			})

			transition?.ready?.then(() => {
				document.documentElement.animate(
					{ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${maxRadius}px at ${x}px ${y}px)`] },
					{ duration, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' }
				)
			})
		},
		[setTheme, onThemeChange, duration]
	)
}

interface AnimatedThemeTogglerProps extends React.ComponentPropsWithoutRef<'button'> {
	duration?: number
	onThemeToggle?: (theme: string) => void
}

export const AnimatedThemeToggler = ({
	className,
	duration = 400,
	onThemeToggle,
	...props
}: AnimatedThemeTogglerProps) => {
	const { resolvedTheme } = useTheme()
	const mounted = useIsMounted()
	const buttonRef = useRef<HTMLButtonElement>(null)
	const changeTheme = useAnimatedThemeChange(onThemeToggle, duration)

	const toggle = useCallback(() => {
		const next = resolvedTheme === 'dark' ? 'light' : 'dark'
		changeTheme(next, buttonRef.current)
	}, [resolvedTheme, changeTheme])

	const isDark = mounted && resolvedTheme === 'dark'

	return (
		<button type='button' ref={buttonRef} onClick={toggle} className={cn(className)} {...props}>
			{isDark ? <Sun /> : <Moon />}
			<span className='sr-only'>Toggle theme</span>
		</button>
	)
}
