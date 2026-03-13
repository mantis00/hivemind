import { OrgSettingsSection } from '@/components/org/org-settings-section'

export default async function Page() {
	return (
		<div className='space-y-4 w-full justify-center items-center'>
			<div className='flex-col mx-auto max-w-5xl'>
				<div className='pb-5 flex items-center justify-between'>
					<div>
						<h1 className='text-2xl font-semibold'>Organization Settings</h1>
						<p className='text-sm text-muted-foreground'>Manage your organization&apos;s settings.</p>
					</div>
				</div>
				<div className='flex flex-col gap-4'>
					<OrgSettingsSection />
				</div>
			</div>
		</div>
	)
}
