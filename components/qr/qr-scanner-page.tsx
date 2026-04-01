'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CameraOff, LoaderCircle, RotateCcw, ScanLine, ShieldAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { useCurrentClientUser } from '@/lib/react-query/auth'
import { useUserOrgs } from '@/lib/react-query/queries'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Html5Qrcode } from 'html5-qrcode'

type CameraState = 'idle' | 'starting' | 'running' | 'unsupported' | 'error'
type ScanState = 'idle' | 'scanning' | 'detected' | 'unsupported' | 'error'

type ScanValidationResult = { ok: true; orgId: string; href: string } | { ok: false; message: string }

const HTML5_SCANNER_REGION_ID = 'qr-scanner-html5'

function validateEnclosureQrValue(rawValue: string): ScanValidationResult {
	const normalized = rawValue.trim()
	if (!normalized) {
		return { ok: false, message: 'QR code is empty.' }
	}

	let parsed: URL
	try {
		parsed = new URL(normalized, window.location.origin)
	} catch {
		return { ok: false, message: 'QR code is not a valid URL.' }
	}

	const match = parsed.pathname.match(/^\/protected\/orgs\/([^/]+)\/enclosures\/([^/]+)\/?$/)
	if (!match) {
		return { ok: false, message: 'QR code is not an enclosure page URL.' }
	}

	const [, scannedOrgId, enclosureId] = match

	return {
		ok: true,
		orgId: scannedOrgId,
		href: `/protected/orgs/${scannedOrgId}/enclosures/${enclosureId}`
	}
}

function getReadableError(error: unknown) {
	if (error instanceof DOMException) {
		if (error.name === 'NotAllowedError') return 'Camera access was denied. Allow camera permissions to scan QR codes.'
		if (error.name === 'NotFoundError') return 'No camera was found on this device.'
		if (error.name === 'NotReadableError') return 'Camera is already in use by another app.'
		return error.message || 'Unable to access camera.'
	}
	if (error instanceof Error) return error.message
	return 'Unable to access camera.'
}

function nextAnimationFrame() {
	return new Promise<void>((resolve) => {
		window.requestAnimationFrame(() => resolve())
	})
}

export function QrScannerPage() {
	const router = useRouter()
	const { data: currentUser, isLoading: isUserLoading } = useCurrentClientUser()
	const { data: userOrgs, isLoading: isOrgsLoading, error: userOrgsError } = useUserOrgs(currentUser?.id ?? '')

	const scannerRegionRef = useRef<HTMLDivElement | null>(null)
	const html5QrcodeRef = useRef<Html5Qrcode | null>(null)
	const html5StartingRef = useRef(false)
	const lastRejectedValueRef = useRef<string | null>(null)
	const hasNavigatedRef = useRef(false)
	const hasAutoStartedRef = useRef(false)

	const [cameraState, setCameraState] = useState<CameraState>('idle')
	const [cameraError, setCameraError] = useState<string | null>(null)
	const [scanState, setScanState] = useState<ScanState>('idle')
	const [scanError, setScanError] = useState<string | null>(null)
	const [scanResult, setScanResult] = useState<string | null>(null)
	const [isNavigating, setIsNavigating] = useState(false)

	const stopHtml5Scanner = useCallback(async () => {
		const scanner = html5QrcodeRef.current
		if (!scanner) {
			return
		}

		try {
			await scanner.stop()
		} catch {
			// stop() can throw when scanner is not actively running
		}

		try {
			scanner.clear()
		} catch {
			// clear() can throw when DOM is already gone
		}

		html5QrcodeRef.current = null
	}, [])

	const handleDecodedValue = useCallback(
		(value: string) => {
			setScanResult(value)

			const validation = validateEnclosureQrValue(value)
			if (!validation.ok) {
				if (lastRejectedValueRef.current !== value) {
					setScanError(validation.message)
				}
				lastRejectedValueRef.current = value
				return false
			}

			if (isUserLoading || (currentUser?.id && isOrgsLoading)) {
				if (lastRejectedValueRef.current !== value) {
					setScanError('Checking your organization access. Hold steady and keep the code in view.')
				}
				lastRejectedValueRef.current = value
				return false
			}

			if (!currentUser || userOrgsError) {
				if (lastRejectedValueRef.current !== value) {
					setScanError('Unable to verify organization access right now. Please retry in a moment.')
				}
				lastRejectedValueRef.current = value
				return false
			}

			const hasMembership = (userOrgs ?? []).some((org) => String(org.org_id) === validation.orgId)
			if (!hasMembership) {
				if (lastRejectedValueRef.current !== value) {
					setScanError('You do not belong to this organization, so this enclosure cannot be opened.')
				}
				lastRejectedValueRef.current = value
				return false
			}

			if (hasNavigatedRef.current) {
				return true
			}

			hasNavigatedRef.current = true
			setIsNavigating(true)
			setScanError(null)
			setScanState('detected')
			void stopHtml5Scanner()
			setCameraState('idle')
			router.push(validation.href)
			return true
		},
		[currentUser, isOrgsLoading, isUserLoading, router, stopHtml5Scanner, userOrgs, userOrgsError]
	)

	const startHtml5Scanner = useCallback(async () => {
		if (html5QrcodeRef.current || html5StartingRef.current) {
			return
		}

		const scannerRegion = scannerRegionRef.current
		if (!scannerRegion) {
			throw new Error('Scanner region is not ready.')
		}

		html5StartingRef.current = true
		try {
			scannerRegion.innerHTML = ''

			const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')
			const scanner = new Html5Qrcode(HTML5_SCANNER_REGION_ID, {
				verbose: false,
				formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
			})
			html5QrcodeRef.current = scanner

			await scanner.start(
				{ facingMode: 'environment' },
				{
					fps: 5,
					qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
						const edge = Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.75)
						return { width: edge, height: edge }
					}
				},
				(decodedText) => {
					handleDecodedValue(decodedText)
				},
				() => {
					// Ignore "not found" callback noise.
				}
			)

			setCameraState('running')
			setScanState('scanning')
			setScanError(null)
		} finally {
			html5StartingRef.current = false
		}
	}, [handleDecodedValue])

	const startCamera = useCallback(async () => {
		if (!navigator.mediaDevices?.getUserMedia) {
			setCameraError('This browser does not support camera access.')
			setScanState('unsupported')
			setCameraState('unsupported')
			return
		}

		await stopHtml5Scanner()
		setCameraState('idle')
		setScanState('idle')
		setScanError(null)
		setIsNavigating(false)
		hasNavigatedRef.current = false
		setCameraError(null)
		setScanError(null)
		setScanResult(null)
		setIsNavigating(false)
		hasNavigatedRef.current = false
		lastRejectedValueRef.current = null
		setCameraState('starting')

		try {
			await nextAnimationFrame()
			await startHtml5Scanner()
		} catch (error) {
			setCameraError(getReadableError(error))
			setScanState('error')
			setCameraState('error')
			await stopHtml5Scanner()
		}
	}, [startHtml5Scanner, stopHtml5Scanner])

	useEffect(() => {
		return () => {
			void stopHtml5Scanner()
		}
	}, [stopHtml5Scanner])

	useEffect(() => {
		if (hasAutoStartedRef.current) {
			return
		}

		hasAutoStartedRef.current = true
		void startCamera()
	}, [startCamera])

	const isStarting = cameraState === 'starting'
	const isRunning = cameraState === 'running'
	const isActivePreview = isRunning

	return (
		<div className='space-y-4'>
			<div className='pb-1'>
				<h1 className='text-2xl font-semibold'>Scan QR Code</h1>
				<p className='text-sm text-muted-foreground'>Open your camera and point it at an enclosure QR code.</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className='text-base sm:text-lg'>Camera</CardTitle>
					<CardDescription>Scan an enclosure QR code using a single compatibility scanner flow.</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='relative w-full overflow-hidden rounded-lg border bg-muted/30 aspect-square sm:aspect-video'>
						<div id={HTML5_SCANNER_REGION_ID} ref={scannerRegionRef} className='h-full w-full' />

						{!isActivePreview && (
							<div className='absolute inset-0 grid place-items-center bg-background/75'>
								<div className='flex flex-col items-center gap-2 text-center px-4'>
									{isStarting ? (
										<LoaderCircle className='size-6 animate-spin text-muted-foreground' />
									) : (
										<CameraOff className='size-6 text-muted-foreground' />
									)}
									<p className='text-sm text-muted-foreground'>
										{isStarting ? 'Starting camera...' : 'Camera preview is not active.'}
									</p>
								</div>
							</div>
						)}
					</div>

					{(cameraError || scanState === 'error' || cameraState === 'error' || cameraState === 'unsupported') && (
						<button
							type='button'
							onClick={() => void startCamera()}
							disabled={isStarting}
							className='inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60'
						>
							{isStarting ? <LoaderCircle className='size-4 animate-spin' /> : <RotateCcw className='size-4' />}
							Retry camera
						</button>
					)}

					{isActivePreview && scanState === 'scanning' && (
						<div className='flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 p-3 text-sm text-primary'>
							<ScanLine className='size-4 shrink-0' />
							<span>Scanning camera feed for QR codes.</span>
						</div>
					)}

					{isNavigating && (
						<div className='flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 p-3 text-sm text-primary'>
							<LoaderCircle className='size-4 shrink-0 animate-spin' />
							<span>Valid enclosure QR detected. Opening enclosure page...</span>
						</div>
					)}

					{cameraError && (
						<div className='flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive'>
							<ShieldAlert className='size-4 shrink-0 mt-0.5' />
							<span>{cameraError}</span>
						</div>
					)}

					{scanError && (
						<div className='flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive'>
							<ShieldAlert className='size-4 shrink-0 mt-0.5' />
							<span>{scanError}</span>
						</div>
					)}

					<div className='rounded-md border bg-muted/30 p-3'>
						<p className='text-sm font-medium'>Detected QR content</p>
						<p className='mt-2 break-all rounded bg-background p-2 font-mono text-xs'>
							{scanResult ?? 'No QR code detected yet.'}
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
