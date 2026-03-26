'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, LoaderCircle, RotateCcw, ScanLine, ShieldAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { useCurrentClientUser } from '@/lib/react-query/auth'
import { useUserOrgs } from '@/lib/react-query/queries'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type CameraState = 'idle' | 'starting' | 'running' | 'unsupported' | 'error'
type ScanState = 'idle' | 'scanning' | 'detected' | 'unsupported' | 'error'
type DecoderMode = 'unknown' | 'native' | 'fallback'

type DetectedCode = { rawValue?: string | null }
type BarcodeDetectorInstance = {
	detect: (source: unknown) => Promise<DetectedCode[]>
}
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance
type JsQrDecodeResult = { data: string } | null
type JsQrDecode = (
	data: Uint8ClampedArray,
	width: number,
	height: number,
	options?: { inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth' | 'invertFirst' }
) => JsQrDecodeResult

type ScanValidationResult = { ok: true; orgId: string; href: string } | { ok: false; message: string }

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

	if (parsed.origin !== window.location.origin) {
		return { ok: false, message: 'QR code points to a different environment/domain.' }
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

export function QrScannerPage() {
	const router = useRouter()
	const { data: currentUser, isLoading: isUserLoading } = useCurrentClientUser()
	const { data: userOrgs, isLoading: isOrgsLoading, error: userOrgsError } = useUserOrgs(currentUser?.id ?? '')
	const videoRef = useRef<HTMLVideoElement | null>(null)
	const streamRef = useRef<MediaStream | null>(null)
	const fallbackCanvasRef = useRef<HTMLCanvasElement | null>(null)
	const fallbackDecoderRef = useRef<JsQrDecode | null>(null)
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

	const loadFallbackDecoder = useCallback(async (): Promise<JsQrDecode> => {
		if (fallbackDecoderRef.current) {
			return fallbackDecoderRef.current
		}

		const jsQrModule = await import('jsqr')
		const decoder = (jsQrModule.default ?? jsQrModule) as unknown as JsQrDecode
		fallbackDecoderRef.current = decoder
		return decoder
	}, [])

	const decodeWithFallback = useCallback(async (): Promise<string | null> => {
		const videoEl = videoRef.current
		if (!videoEl || videoEl.readyState < 2 || videoEl.videoWidth === 0 || videoEl.videoHeight === 0) {
			return null
		}

		let canvas = fallbackCanvasRef.current
		if (!canvas) {
			canvas = document.createElement('canvas')
			fallbackCanvasRef.current = canvas
		}

		if (canvas.width !== videoEl.videoWidth || canvas.height !== videoEl.videoHeight) {
			canvas.width = videoEl.videoWidth
			canvas.height = videoEl.videoHeight
		}

		const context = canvas.getContext('2d', { willReadFrequently: true })
		if (!context) {
			throw new Error('Could not create canvas context for QR fallback decoding.')
		}

		context.drawImage(videoEl, 0, 0, canvas.width, canvas.height)
		const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
		const decode = await loadFallbackDecoder()
		const decoded = decode(imageData.data, imageData.width, imageData.height, {
			inversionAttempts: 'attemptBoth'
		})
		const value = decoded?.data?.trim()
		return value ? value : null
	}, [loadFallbackDecoder])

	const startQrDetection = useCallback(() => {
		stopScanningLoop()

		const BarcodeDetector = (window as Window & { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
		const detector = BarcodeDetector ? new BarcodeDetector({ formats: ['qr_code'] }) : null
		let activeDecoderMode: DecoderMode = detector ? 'native' : 'fallback'
		let nativeFailureCount = 0

		setDecoderMode(activeDecoderMode)
		setScanState('scanning')
		setScanError(null)

		const handleDetectedValue = (value: string) => {
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
			streamRef.current?.getTracks().forEach((track) => track.stop())
			streamRef.current = null
			if (videoRef.current) {
				videoRef.current.pause()
				videoRef.current.srcObject = null
			}
			setCameraState('idle')
			router.push(validation.href)
			return true
		}

		const detectFrame = async () => {
			if (detectorBusyRef.current) return
			const videoEl = videoRef.current
			if (!videoEl || videoEl.readyState < 2) return

			detectorBusyRef.current = true
			try {
				if (activeDecoderMode === 'native' && detector) {
					try {
						const codes = await detector.detect(videoEl)
						const value = codes.find(
							(code) => typeof code.rawValue === 'string' && code.rawValue.trim().length > 0
						)?.rawValue
						if (value) {
							const shouldStop = handleDetectedValue(value)
							if (shouldStop) {
								return
							}
						}
						nativeFailureCount = 0
						return
					} catch {
						nativeFailureCount += 1
						if (nativeFailureCount >= 2) {
							activeDecoderMode = 'fallback'
							setDecoderMode('fallback')
							setScanError('Switched to compatibility QR decoder for this browser session.')
						} else {
							return
						}
					}
				}

				const fallbackValue = await decodeWithFallback()
				if (fallbackValue) {
					const shouldStop = handleDetectedValue(fallbackValue)
					if (shouldStop) {
						return
					}
				}
			} catch {
				stopScanningLoop()
				setScanState('error')
				setScanError('Unable to decode QR with compatibility mode. Try reloading or changing browser/device.')
			} finally {
				detectorBusyRef.current = false
			}
		}

		scanIntervalRef.current = window.setInterval(() => {
			void detectFrame()
		}, 350)
	}, [currentUser, decodeWithFallback, isOrgsLoading, isUserLoading, router, stopScanningLoop, userOrgs, userOrgsError])

	const stopCamera = useCallback(() => {
		stopScanningLoop()
		streamRef.current?.getTracks().forEach((track) => track.stop())
		streamRef.current = null
		if (videoRef.current) {
			videoRef.current.pause()
			videoRef.current.srcObject = null
		}
		setCameraState('idle')
		setScanState('idle')
		setIsNavigating(false)
		setDecoderMode('unknown')
		hasNavigatedRef.current = false
	}, [stopScanningLoop])

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
	}, [startQrDetection, stopCamera])

	useEffect(() => {
		return () => {
			stopScanningLoop()
			streamRef.current?.getTracks().forEach((track) => track.stop())
			fallbackCanvasRef.current = null
		}
	}, [stopScanningLoop])

	const isStarting = cameraState === 'starting'
	const isRunning = cameraState === 'running'

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
						Scan an enclosure QR code. You can open any org enclosure where you are a member.
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='relative w-full overflow-hidden rounded-lg border bg-muted/30 aspect-video'>
						<video ref={videoRef} className='h-full w-full object-cover' autoPlay muted playsInline />
						{!isRunning && (
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
						<Button variant='outline' onClick={stopCamera} disabled={isStarting || !isRunning}>
							<CameraOff className='size-4' />
							Stop camera
						</Button>
						<Button variant='ghost' onClick={() => void startCamera()} disabled={isStarting}>
							<RotateCcw className='size-4' />
							Retry
						</Button>
					</div>

					{isRunning && scanState === 'scanning' && (
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
