// hooks/use-install-prompt.ts
import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function useInstallPrompt() {
	const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
	const [isInstallable, setIsInstallable] = useState(false)
	const [isIOS, setIsIOS] = useState(false)
	const [isInstalled, setIsInstalled] = useState(false)

	useEffect(() => {
		const handleBeforeInstallPrompt = (e: Event) => {
			e.preventDefault()
			setDeferredPrompt(e as BeforeInstallPromptEvent)
			setIsInstallable(true)
		}

		window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

		return () => {
			window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
		}
	}, [])

	// Detect iOS and whether the app is already running in standalone mode
	useEffect(() => {
		const ua = navigator.userAgent || ''
		const apple = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && 'ontouchend' in document)
		setIsIOS(apple)

		const iosStandalone = apple && (window.navigator as Navigator & { standalone?: boolean }).standalone
		const displayStandalone =
			typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches
		setIsInstalled(!!(iosStandalone || displayStandalone))
	}, [])

	const handleInstall = async () => {
		const promptEvent = deferredPrompt
		if (!promptEvent) return

		try {
			const { outcome } = await deferredPrompt.prompt()
			if (outcome === 'accepted') {
				setIsInstallable(false)
			}
		} finally {
			setDeferredPrompt((prev) => (prev === promptEvent ? null : prev))
		}
	}

	return { isInstallable, handleInstall, isIOS, isInstalled }
}
