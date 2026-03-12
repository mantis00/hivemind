import { createClient } from '@/lib/supabase/server'
import { type EmailOtpType } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url)
	const token_hash = searchParams.get('token_hash')
	const type = searchParams.get('type') as EmailOtpType | null
	const code = searchParams.get('code')
	const next = searchParams.get('next') ?? '/protected/account'

	const supabase = await createClient()

	// PKCE flow — the new-address email link goes through Supabase's server first,
	// which verifies the token there and then redirects here with a `code`.
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
		}

		// If the PKCE code verifier is missing it means the link was opened in a
		// different browser/device than the one that initiated the flow. Supabase
		// already verified and applied the email change server-side before
		// redirecting here, so the change is done — just redirect silently.
		if (error.message.toLowerCase().includes('pkce') || error.message.toLowerCase().includes('code verifier')) {
			redirect(next)
		}

		redirect(`/auth/error?error=${encodeURIComponent(error.message)}`)
	}

	// OTP / magic-link flow — old-address confirmation arrives with token_hash + type
	if (token_hash && type) {
		const { error } = await supabase.auth.verifyOtp({ type, token_hash })

		if (!error) {
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
		}

		redirect(`/auth/error?error=${encodeURIComponent(error.message)}`)
	}

	// Old-email confirmation — Supabase verifies the token on their server and
	// redirects here with no query params (just a #message hash we can't read).
	// The verification is already done, so redirect silently to the next page.
	redirect(next)
}
