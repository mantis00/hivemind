import EnclosureGrid from '@/components/enclosures/enclosure-grid'
import { EnclosureCounts } from '@/components/enclosures/enclosure-counts'

export default async function Page() {
	return (
		<div className='space-y-4 w-full justify-center items-center'>
			<div className='flex-col mx-auto max-w-5xl flex'>
				<div className='pb-5 flex items-center gap-3'>
					<h1 className='text-2xl font-semibold'>Enclosures</h1>
					<EnclosureCounts />
				</div>
				<div className='flex flex-col gap-4'>
					<p className='text-sm text-muted-foreground'>Manage your organization&apos;s enclosures and details</p>
					<EnclosureGrid />
				</div>
			</div>
		</div>
	)
}
