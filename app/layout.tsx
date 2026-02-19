import type { Metadata, Viewport } from 'next'
import { Geist, Dancing_Script } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { QueryProvider } from '@/lib/react-query/provider'
import './globals.css'

//consts for metadata and PWA top bar color, used in the metadata and viewport exports below
const APP_NAME = 'Hivemind'
const APP_DEFAULT_TITLE = 'Hivemind'
const APP_TITLE_TEMPLATE = '%s - PWA App'
const APP_DESCRIPTION = 'Hivemind is a platform for managing your invertebrates'
const APP_SURFACE_DARK = '#18181B'

const defaultUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
	? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
	: process.env.VERCEL_URL
		? `https://${process.env.VERCEL_URL}`
		: 'http://localhost:3000'

//used for PWA descriptions and titles on different devices
export const metadata: Metadata = {
	applicationName: APP_NAME,
	icons: {
		icon: ['/icons/icon-192x192.png', '/icons/icon-512x512.png'],
		apple: ['/icons/icon-152x152.png', '/icons/icon-192x192.png'],
		shortcut: '/favicon.ico'
	},
	title: {
		default: APP_DEFAULT_TITLE,
		template: APP_TITLE_TEMPLATE
	},
	description: APP_DESCRIPTION,
	appleWebApp: {
		capable: true,
		statusBarStyle: 'default',
		title: APP_DEFAULT_TITLE
		// startUpImage: [],
	},
	formatDetection: {
		telephone: false
	},
	openGraph: {
		type: 'website',
		siteName: APP_NAME,
		title: {
			default: APP_DEFAULT_TITLE,
			template: APP_TITLE_TEMPLATE
		},
		description: APP_DESCRIPTION
	},
	twitter: {
		card: 'summary',
		title: {
			default: APP_DEFAULT_TITLE,
			template: APP_TITLE_TEMPLATE
		},
		description: APP_DESCRIPTION
	},
	metadataBase: new URL(defaultUrl),
	manifest: '/manifest.json'
}

//used for the PWA top bar color
export const viewport: Viewport = {
	themeColor: APP_SURFACE_DARK
}

const geistSans = Geist({
	variable: '--font-geist-sans',
	display: 'swap',
	subsets: ['latin']
})

const dancingScript = Dancing_Script({
	variable: '--font-dancing-script',
	display: 'swap',
	subsets: ['latin']
})

export default function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang='en' suppressHydrationWarning>
			<body className={`${geistSans.className} ${dancingScript.variable} antialiased`}>
				<ThemeProvider attribute='class' defaultTheme='system' enableSystem disableTransitionOnChange>
					<QueryProvider>
						<div vaul-drawer-wrapper='' className='bg-background'>
							{children}
						</div>
					</QueryProvider>
					<Toaster
						closeButton
						// toast for SIX-SEVEN seconds
						duration={6500}
						position='bottom-right'
						theme='light'
						richColors
						expand
						visibleToasts={4}
						gap={14}
						offset={18}
						toastOptions={{
							classNames: {
								toast: 'ring-2 ring-red-500/35 shadow-xl'
							}
						}}
					/>
				</ThemeProvider>
			</body>
		</html>
	)
}
