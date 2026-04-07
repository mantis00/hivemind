'use client'

import { useEffect } from 'react'

export function ServiceWorkerProvider() {
	useEffect(() => {
		if (!('serviceWorker' in navigator)) return

		navigator.serviceWorker.getRegistration().then((existing) => {
			if (existing) {
				return
			}

			navigator.serviceWorker.register('/sw.js').catch((err) => {
				if (process.env.NODE_ENV !== 'production') {
					console.error('Service Worker registration failed:', err)
				}
			})
		})
	}, [])

	return null
}
