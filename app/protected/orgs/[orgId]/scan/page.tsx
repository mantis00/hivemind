import { QrScannerPage } from '@/components/qr/qr-scanner-page'

export default async function Page({ params }: { params: Promise<{ orgId: string }> }) {
	const { orgId } = await params

	return (
		<div className='space-y-4 w-full justify-center items-center'>
			<div className='flex-col mx-auto max-w-5xl flex'>
				<QrScannerPage orgId={orgId} />
			</div>
		</div>
	)
}
