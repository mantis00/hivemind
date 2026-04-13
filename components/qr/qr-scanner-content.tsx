'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CameraOff, ImageUp, LoaderCircle, RotateCcw, ShieldAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { useCurrentClientUser } from '@/lib/react-query/auth'
import { useUserOrgs } from '@/lib/react-query/queries'
import type { Html5Qrcode } from 'html5-qrcode'

type CameraState = 'idle' | 'starting' | 'running' | 'unsupported' | 'error'
type ScanState = 'idle' | 'scanning' | 'detected' | 'unsupported' | 'error'

type ScanValidationResult = { ok: true; orgId: string; href: string } | { ok: false; message: string }

const HTML5_SCANNER_REGION_ID = 'qr-scanner-html5'
const INVALID_ENCLOSURE_QR_MESSAGE = 'QR code is not a valid enclosure URL.'

type QrScannerContentProps = {
	onRequestClose?: () => void
}

function validateEnclosureQrValue(rawValue: string): ScanValidationResult {
	const normalized = rawValue.trim()
	if (!normalized) {
		return { ok: false, message: 'QR code is empty.' }
	}

	let parsed: URL
	try {
		parsed = new URL(normalized, window.location.origin)
	} catch {
		return { ok: false, message: INVALID_ENCLOSURE_QR_MESSAGE }
	}

	const match = parsed.pathname.match(/^\/protected\/orgs\/([^/]+)\/enclosures\/([^/]+)\/?$/)
	if (!match) {
		return { ok: false, message: INVALID_ENCLOSURE_QR_MESSAGE }
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
		if (error.name === 'NotAllowedError') {
			return 'Camera access was denied. Allow camera permission for this site in your browser privacy settings, then retry.'
		}
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

function delay(ms: number) {
	return new Promise<void>((resolve) => {
		window.setTimeout(resolve, ms)
	})
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const objectUrl = URL.createObjectURL(file)
		const image = new Image()

		image.onload = () => {
			URL.revokeObjectURL(objectUrl)
			resolve(image)
		}
		image.onerror = () => {
			URL.revokeObjectURL(objectUrl)
			reject(new Error('Image could not be loaded for QR decoding.'))
		}

		image.src = objectUrl
	})
}

function renderImageVariantAsJpeg(image: HTMLImageElement, rotationDeg: number, maxEdge: number): Promise<Blob | null> {
	const rotation = ((rotationDeg % 360) + 360) % 360
	const sourceWidth = image.naturalWidth || image.width
	const sourceHeight = image.naturalHeight || image.height
	const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight))
	const drawWidth = Math.max(1, Math.round(sourceWidth * scale))
	const drawHeight = Math.max(1, Math.round(sourceHeight * scale))

	const isRightAngle = rotation === 90 || rotation === 270
	const canvas = document.createElement('canvas')
	canvas.width = isRightAngle ? drawHeight : drawWidth
	canvas.height = isRightAngle ? drawWidth : drawHeight

	const context = canvas.getContext('2d')
	if (!context) {
		return Promise.resolve(null)
	}

	context.translate(canvas.width / 2, canvas.height / 2)
	context.rotate((rotation * Math.PI) / 180)
	context.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)

	return new Promise((resolve) => {
		canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92)
	})
}

async function buildNormalizedJpegCandidate(file: File): Promise<File> {
	const image = await loadImageFromFile(file)
	const blob = await renderImageVariantAsJpeg(image, 0, 1920)
	if (!blob) {
		throw new Error('Image normalization failed before QR decoding.')
	}

	return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'qr-photo'}-normalized.jpg`, { type: 'image/jpeg' })
}

export function QrScannerContent({ onRequestClose }: QrScannerContentProps) {
	const router = useRouter()
	const { data: currentUser, isLoading: isUserLoading } = useCurrentClientUser()
	const { data: userOrgs, isLoading: isOrgsLoading, error: userOrgsError } = useUserOrgs(currentUser?.id ?? '')

	const scannerRegionRef = useRef<HTMLDivElement | null>(null)
	const photoInputRef = useRef<HTMLInputElement | null>(null)
	const html5QrcodeRef = useRef<Html5Qrcode | null>(null)
	const html5StartingRef = useRef(false)
	const lastRejectedValueRef = useRef<string | null>(null)
	const hasNavigatedRef = useRef(false)
	const hasAutoStartedRef = useRef(false)

	const [cameraState, setCameraState] = useState<CameraState>('idle')
	const [cameraError, setCameraError] = useState<string | null>(null)
	const [scanState, setScanState] = useState<ScanState>('idle')
	const [scanError, setScanError] = useState<string | null>(null)
	const [isPhotoScanning, setIsPhotoScanning] = useState(false)

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
			setScanError(null)
			setScanState('detected')
			void stopHtml5Scanner()
			setCameraState('idle')
			onRequestClose?.()
			router.push(validation.href)
			return true
		},
		[currentUser, isOrgsLoading, isUserLoading, onRequestClose, router, stopHtml5Scanner, userOrgs, userOrgsError]
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
					aspectRatio: 1,
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

	const handlePhotoSelected = useCallback(
		async (file: File) => {
			setIsPhotoScanning(true)
			setCameraError(null)
			setScanError(null)
			let scanner: Html5Qrcode | null = null

			const disposePhotoScanner = async () => {
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
					// clear() can throw when DOM was re-rendered while scanning
				}

				if (html5QrcodeRef.current === scanner) {
					html5QrcodeRef.current = null
				}

				scanner = null
			}

			try {
				await stopHtml5Scanner()

				const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')
				scanner = new Html5Qrcode(HTML5_SCANNER_REGION_ID, {
					verbose: false,
					formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
				})

				const decodeCandidate = await buildNormalizedJpegCandidate(file)
				html5QrcodeRef.current = scanner
				const decodedText = await scanner.scanFile(decodeCandidate, false)
				const accepted = handleDecodedValue(decodedText)

				await disposePhotoScanner()

				// If the photo was not a valid/authorized enclosure QR, resume live scanning.
				if (!accepted) {
					await delay(1800)
					await startHtml5Scanner()
				}
			} catch {
				const fileType = (file.type ?? '').toLowerCase()
				const likelyHeic = fileType.includes('heic') || fileType.includes('heif')
				if (likelyHeic) {
					setScanError(
						'Unable to scan selected photo. iOS HEIC images can fail in-browser. Try a PNG/JPEG screenshot, or use live scan.'
					)
				} else {
					setScanError(INVALID_ENCLOSURE_QR_MESSAGE)
				}
				try {
					await disposePhotoScanner()
					await delay(1800)
					await startHtml5Scanner()
				} catch {
					setCameraError('Unable to restart camera. Tap Retry camera.')
					setScanState('error')
					setCameraState('error')
				}
			} finally {
				await disposePhotoScanner()
				setIsPhotoScanning(false)
				if (photoInputRef.current) {
					photoInputRef.current.value = ''
				}
			}
		},
		[handleDecodedValue, startHtml5Scanner, stopHtml5Scanner]
	)

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
		hasNavigatedRef.current = false
		setCameraError(null)
		setScanError(null)
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
		<div className='space-y-3'>
			<div className='relative mx-auto w-full max-w-md aspect-square overflow-hidden rounded-lg border bg-muted/30'>
				<div
					id={HTML5_SCANNER_REGION_ID}
					ref={scannerRegionRef}
					className='h-full w-full [&_canvas]:h-full [&_canvas]:w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover'
				/>

				{!isActivePreview && (
					<div className='absolute inset-0 grid place-items-center bg-background/75'>
						<div className='flex flex-col items-center gap-2 px-4 text-center'>
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

			<div className='flex justify-center'>
				<button
					type='button'
					onClick={() => photoInputRef.current?.click()}
					disabled={isPhotoScanning}
					className='inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60'
				>
					{isPhotoScanning ? <LoaderCircle className='size-4 animate-spin' /> : <ImageUp className='size-4' />}
					{isPhotoScanning ? 'Scanning photo...' : 'Scan from photo'}
				</button>
				<input
					ref={photoInputRef}
					type='file'
					accept='image/*'
					capture='environment'
					className='hidden'
					onChange={(event) => {
						const file = event.target.files?.[0]
						if (!file) {
							return
						}
						void handlePhotoSelected(file)
					}}
				/>
			</div>

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
		</div>
	)
}
