'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

import { QrScannerPage } from '@/components/qr/qr-scanner-page'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type QrScannerModalContextValue = {
	isOpen: boolean
	openScanner: () => void
	closeScanner: () => void
}

const QrScannerModalContext = createContext<QrScannerModalContextValue | null>(null)

export function QrScannerModalProvider({ children }: { children: ReactNode }) {
	const [isOpen, setIsOpen] = useState(false)

	const openScanner = useCallback(() => {
		setIsOpen(true)
	}, [])

	const closeScanner = useCallback(() => {
		setIsOpen(false)
	}, [])

	return (
		<QrScannerModalContext.Provider
			value={{
				isOpen,
				openScanner,
				closeScanner
			}}
		>
			{children}
			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogContent className='top-3 max-h-[calc(100dvh-1.5rem)] translate-y-0 overflow-y-auto border-0 bg-transparent p-0 shadow-none sm:top-[50%] sm:max-h-[85dvh] sm:max-w-3xl sm:translate-y-[-50%]'>
					<DialogHeader className='sr-only'>
						<DialogTitle>Scan QR Code</DialogTitle>
						<DialogDescription>Open the camera and scan an enclosure QR code.</DialogDescription>
					</DialogHeader>
					<QrScannerPage onRequestClose={closeScanner} />
				</DialogContent>
			</Dialog>
		</QrScannerModalContext.Provider>
	)
}

export function useQrScannerModal() {
	const context = useContext(QrScannerModalContext)

	if (!context) {
		throw new Error('useQrScannerModal must be used within a QrScannerModalProvider.')
	}

	return context
}
