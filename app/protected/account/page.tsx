import { ProfileForm } from '@/components/account/profile-form'
import { PreferencesSection } from '@/components/account/preferences-section'
import { CredentialsSection } from '@/components/account/credentials-section'
import { NotificationsSection } from '@/components/account/notifications-section'
import { BackToOrgs } from '@/components/navigation/back-to-orgs'

export default async function Page() {
	return (
		<div className='space-y-4 w-full justify-center items-center'>
			<div className='flex-col mx-auto max-w-5xl'>
				<div className='pb-5 flex items-center justify-between'>
					<div>
						<h1 className='text-2xl font-semibold'>Account</h1>
						<p className='text-sm text-muted-foreground'>Manage your account settings and preferences.</p>
					</div>
					<BackToOrgs />
				</div>
				<div className='flex flex-col gap-4'>
					<ProfileForm />
					<PreferencesSection />
					<NotificationsSection />
					<CredentialsSection />
				</div>
			</div>
		</div>
	)
}
