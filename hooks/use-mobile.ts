import * as React from 'react'

const MOBILE_BREAKPOINT = 768
// Sidebar switches to overlay (sheet) mode at a wider breakpoint so it
// doesn't squeeze the main content on medium-sized windows.
const SIDEBAR_MOBILE_BREAKPOINT = 1024

export function useIsMobile() {
	const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

	React.useEffect(() => {
		const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
		const onChange = () => {
			setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
		}
		mql.addEventListener('change', onChange)
		setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
		return () => mql.removeEventListener('change', onChange)
	}, [])

	return !!isMobile
}

export function useIsSidebarMobile() {
	const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

	React.useEffect(() => {
		const mql = window.matchMedia(`(max-width: ${SIDEBAR_MOBILE_BREAKPOINT - 1}px)`)
		const onChange = () => {
			setIsMobile(window.innerWidth < SIDEBAR_MOBILE_BREAKPOINT)
		}
		mql.addEventListener('change', onChange)
		setIsMobile(window.innerWidth < SIDEBAR_MOBILE_BREAKPOINT)
		return () => mql.removeEventListener('change', onChange)
	}, [])

	return !!isMobile
}
