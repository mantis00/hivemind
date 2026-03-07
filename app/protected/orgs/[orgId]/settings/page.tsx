import { OrgSettings } from '@/components/org/orgs-settings'

export default async function Page() {
	return (
		<div className='space-y-4 w-full justify-center items-center'>
			<div className='flex-col mx-auto max-w-5xl'>
				<div className='pb-5'>
					<h1 className='text-2xl font-semibold'>Organization settings</h1>
					<p className='text-sm text-muted-foreground'>Manage your organizationn&apos;s settings</p>
				</div>
				<div className='flex flex-col gap-4'>
					<OrgSettings />
				</div>
			</div>
		</div>
	)
}
