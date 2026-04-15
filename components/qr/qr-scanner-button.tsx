'use client'

import { useState } from 'react'
import { ScanLine } from 'lucide-react'

import { QrScannerContent } from '@/components/qr/qr-scanner-content'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type QrScannerButtonProps = {
	buttonClassName?: string
}

export function QrScannerButton({ buttonClassName }: QrScannerButtonProps) {
	const [isScannerOpen, setIsScannerOpen] = useState(false)

	return (
		<ResponsiveDialogDrawer
			title='Scan QR Code'
			description='Open your camera and point it at an enclosure QR code.'
			open={isScannerOpen}
			onOpenChange={setIsScannerOpen}
			trigger={
				<Button variant='ghost' size='icon' className={cn('size-9', buttonClassName)} aria-label='Open QR scanner'>
					<ScanLine className='size-5' />
				</Button>
			}
			className='max-h-[92dvh] px-3 pb-4 sm:max-h-[85vh] sm:max-w-3xl sm:p-6'
		>
			<QrScannerContent onRequestClose={() => setIsScannerOpen(false)} />
		</ResponsiveDialogDrawer>
	)
}
