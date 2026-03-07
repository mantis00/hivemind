import { UpdatePasswordButton } from '@/components/account/update-password-button'
import { BackToOrgs } from '@/components/navigation/back-to-orgs'

export default async function Page() {
	return (
		<div className='space-y-6 w-full justify-center items-center'>
			<div className='flex-col mx-auto max-w-5xl'>
				<div className='pb-5 flex-row flex items-center justify-between'>
					<div className='flex-col'>
						<h1 className='text-2xl font-semibold'>Account</h1>
						<p className='text-sm text-muted-foreground'>Manage your account settings and security.</p>
					</div>
					<BackToOrgs />
				</div>
				<div className='flex flex-col gap-4'>
					<UpdatePasswordButton />
				</div>
			</div>
		</div>
	)
}
