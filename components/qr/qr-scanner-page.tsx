'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, LoaderCircle, RotateCcw, ScanLine, ShieldAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type CameraState = 'idle' | 'starting' | 'running' | 'unsupported' | 'error'
type ScanState = 'idle' | 'scanning' | 'detected' | 'unsupported' | 'error'

type DetectedCode = { rawValue?: string | null }
type BarcodeDetectorInstance = {
	detect: (source: unknown) => Promise<DetectedCode[]>
}
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance

type ScanValidationResult = { ok: true; href: string } | { ok: false; message: string }

function validateEnclosureQrValue(rawValue: string, currentOrgId: string): ScanValidationResult {
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
	if (scannedOrgId !== currentOrgId) {
		return { ok: false, message: 'QR code belongs to a different organization.' }
	}

	return {
		ok: true,
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

export function QrScannerPage({ orgId }: { orgId: string }) {
	const router = useRouter()
	const videoRef = useRef<HTMLVideoElement | null>(null)
	const streamRef = useRef<MediaStream | null>(null)
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

	const stopScanningLoop = useCallback(() => {
		if (scanIntervalRef.current !== null) {
			window.clearInterval(scanIntervalRef.current)
			scanIntervalRef.current = null
		}
		detectorBusyRef.current = false
	}, [])

	const startQrDetection = useCallback(() => {
		stopScanningLoop()

		const BarcodeDetector = (window as Window & { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
		if (!BarcodeDetector) {
			setScanState('unsupported')
			setScanError(
				'QR decoding is not supported in this browser. Try a modern mobile browser with BarcodeDetector support.'
			)
			return
		}

		setScanState('scanning')
		setScanError(null)
		const detector = new BarcodeDetector({ formats: ['qr_code'] })

		const handleDetectedValue = (value: string) => {
			setScanResult(value)

			const validation = validateEnclosureQrValue(value, orgId)
			if (!validation.ok) {
				if (lastRejectedValueRef.current !== value) {
					setScanError(validation.message)
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
			} catch {
				setScanState('error')
				setScanError('Camera is running, but QR decoding failed. Try better lighting or reposition the code.')
			} finally {
				detectorBusyRef.current = false
			}
		}

		scanIntervalRef.current = window.setInterval(() => {
			void detectFrame()
		}, 350)
	}, [orgId, router, stopScanningLoop])

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
						Step 4 scaffold: valid enclosure QR scans now route to the enclosure page for this organization.
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
							<span>Scanning camera feed for QR codes...</span>
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
