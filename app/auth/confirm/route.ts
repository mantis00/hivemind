import { createClient } from '@/lib/supabase/server'
import { type EmailOtpType } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url)
	const token_hash = searchParams.get('token_hash')
	const type = searchParams.get('type') as EmailOtpType | null
	const code = searchParams.get('code')
	const next = searchParams.get('next') ?? '/protected/profile-setup'

	const supabase = await createClient()

	// PKCE flow — email_change (and other flows) redirect here with a `code`
	if (code) {
		const { data, error } = await supabase.auth.exchangeCodeForSession(code)
		if (!error) {
			// Sync updated email into public.profiles
			const user = data.user
			if (user?.email) {
				await supabase
					.from('profiles')
					.update({ email: user.email, updated_at: new Date().toISOString() })
					.eq('id', user.id)
			}
			redirect(next)
		} else {
			redirect(`/auth/error?error=${error.message}`)
		}
	}

	// OTP / magic-link flow — redirected here with token_hash + type
	if (token_hash && type) {
		const { error } = await supabase.auth.verifyOtp({ type, token_hash })
		if (!error) {
			// Sync updated email into public.profiles for email_change
			if (type === 'email_change') {
				const {
					data: { user }
				} = await supabase.auth.getUser()
				if (user?.email) {
					await supabase
						.from('profiles')
						.update({ email: user.email, updated_at: new Date().toISOString() })
						.eq('id', user.id)
				}
			}
			redirect(next)
		} else {
			redirect(`/auth/error?error=${error.message}`)
		}
	}

	redirect(`/auth/error?error=No token hash or type`)
}
