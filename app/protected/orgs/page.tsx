import { ViewOrgs } from '@/components/org/view-orgs'
import { OrgCreationButtons } from '@/components/org/org-creation-buttons'

export default function Page() {
	return (
		<div className='space-y-4 w-full justify-center items-center'>
			<div className='flex-col mx-auto max-w-5xl'>
				<div className='pb-5 flex-row flex items-center justify-between gap-2'>
					<div className='flex-col'>
						<h1 className='text-2xl font-semibold'>Your organizations</h1>
					</div>
					<OrgCreationButtons />
				</div>
				<ViewOrgs />
			</div>
		</div>
	)
}
