'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export function NavProgressBar() {
	const pathname = usePathname()
	const pathnameRef = useRef(pathname)
	const [width, setWidth] = useState(0)
	const [visible, setVisible] = useState(false)
	const [fading, setFading] = useState(false)
	const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
	const fadeRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const startedRef = useRef(false)

	// Keep ref in sync so the click handler always reads the latest pathname
	useEffect(() => {
		pathnameRef.current = pathname
	}, [pathname])

	const clearTimers = () => {
		if (tickRef.current) clearInterval(tickRef.current)
		if (fadeRef.current) clearTimeout(fadeRef.current)
	}

	const start = () => {
		clearTimers()
		startedRef.current = true
		setFading(false)
		setVisible(true)
		setWidth(12)

		// Creep from 12 → ~82%, randomly slowing near the top to fake pending work
		tickRef.current = setInterval(() => {
			setWidth((w) => {
				if (w >= 82) {
					clearInterval(tickRef.current!)
					return 82
				}
				const step = Math.random() * 10 * (1 - w / 100) // slows down as it approaches 82
				return Math.min(w + Math.max(step, 1.5), 82)
			})
		}, 350)
	}

	const complete = () => {
		if (!startedRef.current) return
		clearTimers()
		setWidth(100)
		setFading(true)
		fadeRef.current = setTimeout(() => {
			setVisible(false)
			setFading(false)
			setWidth(0)
			startedRef.current = false
		}, 450)
	}

	// Complete whenever the pathname actually changes (normal navigation)
	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(() => {
		complete()
	}, [pathname])

	// Intercept link clicks across the whole document
	useEffect(() => {
		const handleClick = (e: MouseEvent) => {
			const anchor = (e.target as HTMLElement).closest('a')
			if (!anchor) return
			const href = anchor.getAttribute('href')
			if (!href) return
			// Skip external links, hash-only links, mailto, tel
			if (
				href.startsWith('http') ||
				href.startsWith('//') ||
				href.startsWith('#') ||
				href.startsWith('mailto:') ||
				href.startsWith('tel:')
			)
				return

			// Strip query/hash to compare path only
			const hrefPath = href.split('?')[0].split('#')[0]
			const isSamePage = hrefPath === pathnameRef.current

			if (isSamePage) {
				// Pathname won't change so the effect won't fire — flash complete instantly
				start()
				fadeRef.current = setTimeout(() => complete(), 60)
			} else {
				start()
			}
		}

		document.addEventListener('click', handleClick, true)
		return () => document.removeEventListener('click', handleClick, true)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	if (!visible) return null

	return (
		<div
			aria-hidden
			className='absolute bottom-0 left-0 h-0.5 bg-blue-500 pointer-events-none'
			style={{
				width: `${width}%`,
				transition: fading
					? 'width 200ms ease-out, opacity 350ms ease-out 100ms'
					: width <= 15
						? 'width 120ms ease-out'
						: 'width 350ms ease-in-out',
				opacity: fading ? 0 : 1,
				boxShadow: '0 0 8px 1px rgba(59,130,246,0.6)'
			}}
		/>
	)
}
