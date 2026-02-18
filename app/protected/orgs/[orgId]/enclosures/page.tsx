import { CreateEnclosureButton } from '@/components/enclosures/create-enclosure-button'
import  EnclosureGrid  from '@/components/enclosures/enclosure-grid'

export default async function Page({ params }: { params: Promise<{ orgId: number }> }) {

	return (
		<div className='space-y-6 w-full justify-center items-center'>
			<div className='flex-col mx-auto w-full'>
				<div className='pb-5 flex-row flex items-center justify-between w-full'>
					<div className='flex-col w-full'>
						<EnclosureGrid />
					</div>
				</div>
				<div className='flex flex-col gap-4 text-center'>
					<p className='text-sm text-muted-foreground'>Manage your organization&apos;s enclosures.</p>
				</div>
			</div>
		</div>
	)
}
