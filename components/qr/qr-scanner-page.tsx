'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, LoaderCircle, RotateCcw, ScanLine, ShieldAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { useCurrentClientUser } from '@/lib/react-query/auth'
import { useUserOrgs } from '@/lib/react-query/queries'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Html5Qrcode } from 'html5-qrcode'

type CameraState = 'idle' | 'starting' | 'running' | 'unsupported' | 'error'
type ScanState = 'idle' | 'scanning' | 'detected' | 'unsupported' | 'error'
type DecoderMode = 'unknown' | 'native' | 'fallback'

type DetectedCode = { rawValue?: string | null }
type BarcodeDetectorInstance = {
	detect: (source: unknown) => Promise<DetectedCode[]>
}
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance

type ScanValidationResult = { ok: true; orgId: string; href: string } | { ok: false; message: string }

const HTML5_FALLBACK_REGION_ID = 'qr-scanner-html5-fallback'

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

	const videoRef = useRef<HTMLVideoElement | null>(null)
	const streamRef = useRef<MediaStream | null>(null)
	const fallbackRegionRef = useRef<HTMLDivElement | null>(null)
	const html5QrcodeRef = useRef<Html5Qrcode | null>(null)
	const html5StartingRef = useRef(false)
	const scanIntervalRef = useRef<number | null>(null)
	const detectorBusyRef = useRef(false)
	const lastRejectedValueRef = useRef<string | null>(null)
	const hasNavigatedRef = useRef(false)

	const [cameraState, setCameraState] = useState<CameraState>('idle')
	const [cameraError, setCameraError] = useState<string | null>(null)
	const [scanState, setScanState] = useState<ScanState>('idle')
	const [scanError, setScanError] = useState<string | null>(null)
	const [scanResult, setScanResult] = useState<string | null>(null)
	const [isNavigating, setIsNavigating] = useState(false)
	const [decoderMode, setDecoderMode] = useState<DecoderMode>('unknown')

	const stopScanningLoop = useCallback(() => {
		if (scanIntervalRef.current !== null) {
			window.clearInterval(scanIntervalRef.current)
			scanIntervalRef.current = null
		}
		detectorBusyRef.current = false
	}, [])

	const stopNativeCamera = useCallback(() => {
		streamRef.current?.getTracks().forEach((track) => track.stop())
		streamRef.current = null
		if (videoRef.current) {
			videoRef.current.pause()
			videoRef.current.srcObject = null
		}
	}, [])

	const stopHtml5Fallback = useCallback(async () => {
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
			stopScanningLoop()
			stopNativeCamera()
			void stopHtml5Fallback()
			setCameraState('idle')
			setDecoderMode('unknown')
			router.push(validation.href)
			return true
		},
		[
			currentUser,
			isOrgsLoading,
			isUserLoading,
			router,
			stopHtml5Fallback,
			stopNativeCamera,
			stopScanningLoop,
			userOrgs,
			userOrgsError
		]
	)

	const startHtml5Fallback = useCallback(
		async (statusMessage: string | null = null) => {
			if (html5QrcodeRef.current || html5StartingRef.current) {
				return
			}

			const fallbackRegion = fallbackRegionRef.current
			if (!fallbackRegion) {
				throw new Error('Compatibility scanner region is not ready.')
			}

			html5StartingRef.current = true
			try {
				fallbackRegion.innerHTML = ''

				const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')
				const scanner = new Html5Qrcode(HTML5_FALLBACK_REGION_ID, {
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
				setScanError(statusMessage)
			} finally {
				html5StartingRef.current = false
			}
		},
		[handleDecodedValue]
	)

	const startQrDetection = useCallback(() => {
		stopScanningLoop()

		const BarcodeDetector = (window as Window & { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
		const detector = BarcodeDetector ? new BarcodeDetector({ formats: ['qr_code'] }) : null
		let nativeFailureCount = 0

		if (!detector) {
			setDecoderMode('fallback')
			setScanState('scanning')
			void (async () => {
				try {
					await nextAnimationFrame()
					await startHtml5Fallback()
				} catch (error) {
					setScanState('error')
					setScanError(`Unable to start compatibility scanner (${getReadableError(error)}).`)
					setCameraState('error')
					setDecoderMode('unknown')
					await stopHtml5Fallback()
				}
			})()
			return
		}

		setDecoderMode('native')
		setScanState('scanning')
		setScanError(null)

		const detectFrame = async () => {
			if (detectorBusyRef.current) return
			const videoEl = videoRef.current
			if (!videoEl || videoEl.readyState < 2) return

			detectorBusyRef.current = true
			try {
				const codes = await detector.detect(videoEl)
				const value = codes.find(
					(code) => typeof code.rawValue === 'string' && code.rawValue.trim().length > 0
				)?.rawValue
				if (value) {
					const shouldStop = handleDecodedValue(value)
					if (shouldStop) {
						return
					}
				}
				nativeFailureCount = 0
			} catch {
				nativeFailureCount += 1
				if (nativeFailureCount >= 2) {
					stopScanningLoop()
					stopNativeCamera()
					setDecoderMode('fallback')
					setScanState('scanning')
					void (async () => {
						try {
							await nextAnimationFrame()
							await startHtml5Fallback('Switched to compatibility scanner for this browser session.')
						} catch (error) {
							setScanState('error')
							setScanError(`Unable to start compatibility scanner (${getReadableError(error)}).`)
							setCameraState('error')
							setDecoderMode('unknown')
							await stopHtml5Fallback()
						}
					})()
				}
			} finally {
				detectorBusyRef.current = false
			}
		}

		scanIntervalRef.current = window.setInterval(() => {
			void detectFrame()
		}, 350)
	}, [handleDecodedValue, startHtml5Fallback, stopHtml5Fallback, stopNativeCamera, stopScanningLoop])

	const stopCamera = useCallback(() => {
		stopScanningLoop()
		stopNativeCamera()
		void stopHtml5Fallback()
		setCameraState('idle')
		setScanState('idle')
		setScanError(null)
		setIsNavigating(false)
		setDecoderMode('unknown')
		hasNavigatedRef.current = false
	}, [stopHtml5Fallback, stopNativeCamera, stopScanningLoop])

	const startCamera = useCallback(async () => {
		if (!navigator.mediaDevices?.getUserMedia) {
			setCameraError('This browser does not support camera access.')
			setCameraState('unsupported')
			return
		}

		stopCamera()
		setCameraError(null)
		setScanError(null)
		setScanResult(null)
		setIsNavigating(false)
		setDecoderMode('unknown')
		hasNavigatedRef.current = false
		lastRejectedValueRef.current = null
		setCameraState('starting')

		const hasNativeDetector = Boolean((window as Window & { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector)
		if (!hasNativeDetector) {
			try {
				setCameraState('running')
				setDecoderMode('fallback')
				setScanState('scanning')
				await nextAnimationFrame()
				await startHtml5Fallback()
				return
			} catch (error) {
				setCameraError(getReadableError(error))
				setScanState('error')
				setCameraState('error')
				setDecoderMode('unknown')
				await stopHtml5Fallback()
				return
			}
		}

		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: false,
				video: {
					facingMode: { ideal: 'environment' }
				}
			})

			streamRef.current = stream
			if (videoRef.current) {
				videoRef.current.srcObject = stream
				await videoRef.current.play()
			}

			setCameraState('running')
			setScanState('scanning')
			startQrDetection()
		} catch (error) {
			setCameraError(getReadableError(error))
			setCameraState('error')
		}
	}, [startHtml5Fallback, startQrDetection, stopCamera, stopHtml5Fallback])

	useEffect(() => {
		return () => {
			stopScanningLoop()
			stopNativeCamera()
			void stopHtml5Fallback()
		}
	}, [stopHtml5Fallback, stopNativeCamera, stopScanningLoop])

	const isStarting = cameraState === 'starting'
	const isRunning = cameraState === 'running'
	const isFallbackMode = decoderMode === 'fallback'
	const isActivePreview = isRunning || isFallbackMode

	return (
		<div className='space-y-4'>
			<div className='pb-1'>
				<h1 className='text-2xl font-semibold'>Scan QR Code</h1>
				<p className='text-sm text-muted-foreground'>Open your camera and point it at an enclosure QR code.</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className='text-base sm:text-lg'>Camera</CardTitle>
					<CardDescription>
						Scan an enclosure QR code. Uses native scanning first, then switches to compatibility mode when needed.
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='relative w-full overflow-hidden rounded-lg border bg-muted/30 aspect-square sm:aspect-video'>
						{isFallbackMode ? (
							<div id={HTML5_FALLBACK_REGION_ID} ref={fallbackRegionRef} className='h-full w-full' />
						) : (
							<video ref={videoRef} className='h-full w-full object-cover' autoPlay muted playsInline />
						)}

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

					<div className='flex flex-wrap items-center gap-2'>
						<Button onClick={() => void startCamera()} disabled={isStarting}>
							{isStarting ? <LoaderCircle className='size-4 animate-spin' /> : <Camera className='size-4' />}
							Start camera
						</Button>
						<Button variant='outline' onClick={stopCamera} disabled={isStarting || !isActivePreview}>
							<CameraOff className='size-4' />
							Stop camera
						</Button>
						<Button variant='ghost' onClick={() => void startCamera()} disabled={isStarting}>
							<RotateCcw className='size-4' />
							Retry
						</Button>
					</div>

					{isActivePreview && scanState === 'scanning' && (
						<div className='flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 p-3 text-sm text-primary'>
							<ScanLine className='size-4 shrink-0' />
							<span>
								Scanning camera feed for QR codes. Mode:{' '}
								{decoderMode === 'native' ? 'Native' : decoderMode === 'fallback' ? 'Compatibility' : 'Preparing'}
							</span>
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

					{scanResult && (
						<div className='rounded-md border bg-muted/30 p-3'>
							<p className='text-sm font-medium'>Detected QR content</p>
							<p className='mt-2 break-all rounded bg-background p-2 font-mono text-xs'>{scanResult}</p>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
