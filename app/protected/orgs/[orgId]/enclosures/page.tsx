import EnclosureGrid from '@/components/enclosures/enclosure-grid'
import { Warehouse } from 'lucide-react'
import ExportQR from '@/components/enclosures/exportQR'
import { EnclosureCounts } from '@/components/enclosures/enclosure-counts'

export default async function Page({ params }: { params: { orgId: string } }) {
	return (
		<div className='space-y-4 w-full justify-center items-center'>
			<div className='flex-col mx-auto max-w-5xl flex'>
				<div className='pb-5'>
					<div className='flex items-center gap-3'>
						<h1 className='text-2xl font-semibold'>Enclosures</h1>
						<div className='sm:hidden'>
							<EnclosureCounts />
						</div>
					</div>
					<p className='text-sm text-muted-foreground'>
						Manage your organization&apos;s enclosures and details
					</p>
				</div>
				<div className='flex flex-col gap-4'>
					{/* <ExportQR orgId={params.orgId} /> */}
					<EnclosureGrid />
				</div>
			</div>
		</div>
	)
}