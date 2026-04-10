import { EnvVarWarning } from '@/components/env-var-warning'
import { hasEnvVars } from '@/lib/utils'
import { SidebarProvider } from '@/components/ui/sidebar'
import { ProtectedSidebar } from '@/components/navigation/protected-sidebar'
import { ProtectedNavActions } from '@/components/navigation/protected-nav-actions'
import { ProtectedNavHomeLink } from '@/components/navigation/protected-nav-home-link'
import { NavProgressBar } from '@/components/navigation/nav-progress-bar'
import LoginInstallPrompt from '@/components/pwa/login-install-prompt'
import { ThemeSync } from '@/components/account/theme-sync'
import { NotificationsRealtimeListener } from '@/components/notification/notification-live-listener'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
	return (
		<SidebarProvider>
			<NotificationsRealtimeListener /> {/* Listens for live notifications via Supabase WebSocket */}
			<ThemeSync />
			<LoginInstallPrompt />
			<ProtectedSidebar />
			<main className='flex w-full flex-col items-center overflow-x-clip'>
				<div className='flex-1 w-full flex flex-col gap-2'>
					<nav className='sticky top-0 z-40 w-full flex justify-center border-b border-b-foreground/10 h-16 bg-background'>
						<div className='w-full max-w-7xl flex justify-between px-3 items-center text-sm gap-3'>
							<ProtectedNavHomeLink />
							{!hasEnvVars && <EnvVarWarning />}
							<ProtectedNavActions />
						</div>
						<NavProgressBar />
					</nav>
					<div className='flex-1 flex flex-col gap-2 p-5'>{children}</div>

					{/* <footer className='w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-4 py-4'>
						<p>Powered by sdmay26-03</p>
						<ThemeSwitcher />
					</footer> */}
				</div>
			</main>
		</SidebarProvider>
	)
}
