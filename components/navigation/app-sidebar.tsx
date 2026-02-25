'use client'

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuItem,
	SidebarMenuButton,
	SidebarMenuSub,
	SidebarMenuSubItem,
	SidebarMenuSubButton,
	useSidebar
} from '@/components/ui/sidebar'
import {
	Command,
	ChevronDown,
	Settings,
	Users,
	LayoutDashboard,
	Building2,
	CircleUserRound,
	MoreVertical,
	LogOut,
	Box,
	FolderHeart,
	ArrowRightLeft
} from 'lucide-react'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuGroup
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { EnvVarWarning } from '@/components/env-var-warning'
import { cn, hasEnvVars } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useIsMobile } from '@/hooks/use-mobile'
import Link from 'next/link'
import { useCurrentClientUser } from '@/lib/react-query/auth'

export function AppSidebar() {
	const pathname = usePathname()
	const router = useRouter()
	const isMobile = useIsMobile()
	const { state, toggleSidebar } = useSidebar()
	const { data: currentUser } = useCurrentClientUser()
	const userEmail = currentUser?.email ?? ''
	const userFirstName = currentUser?.user_metadata.first_name ?? ''
	const userLastName = currentUser?.user_metadata.last_name ?? ''
	const orgId = useMemo(() => {
		// Match UUIDs (8-4-4-4-12 hex)
		const match = pathname?.match(
			/^\/protected\/orgs\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/
		)
		return match?.[1] ?? null
	}, [pathname])

	const items = [
		{
			title: 'Dashboard',
			url: orgId ? `/protected/orgs/${orgId}` : '/protected/orgs',
			icon: LayoutDashboard
		}
	]

	const [orgMenuOpen, setOrgMenuOpen] = useState(true)
	const [caretakingMenuOpen, setCaretakingMenuOpen] = useState(true)

	const handleOrgClick = () => {
		if (state === 'collapsed') {
			toggleSidebar()
			return
		}
		setOrgMenuOpen((open) => !open)
	}

	const handleCaretakingClick = () => {
		if (state === 'collapsed') {
			toggleSidebar()
			return
		}
		setCaretakingMenuOpen((open) => !open)
	}

	const handleLogout = async () => {
		const supabase = createClient()
		await supabase.auth.signOut()
		router.replace('/auth/login') // replace, makes it so the cant click browser back button to go back to the previous page
	}

	return (
		<Sidebar variant='floating' collapsible='icon'>
			<SidebarContent>
				<SidebarGroup>
					<SidebarMenuButton className='mb-2.5 hover:bg-transparent active:bg-transparent' size='lg' asChild>
						{/* <Link href='/protected'> */}
						<div className='flex items-center gap-3 w-full'>
							<div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg'>
								<Command className='size-4' />
							</div>
							<div className='grid flex-1 text-left text-sm leading-tight'>
								<span className='text-lg font-dancing-script'>Invertebrate Caretaking</span>
							</div>
						</div>
						{/* </Link> */}
					</SidebarMenuButton>
					<SidebarGroupContent>
						<SidebarMenu>
							{items.map((item) => (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton className='text-xl my-1' asChild tooltip={item.title}>
										<Link href={item.url}>
											<item.icon className='size-4' />
											<span>{item.title}</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
							<Separator className='my-2' />
							<SidebarMenuItem>
								<SidebarMenuButton
									className='text-xl my-1 justify-between w-full'
									tooltip='Organization'
									onClick={handleOrgClick}
								>
									<div className='flex items-center gap-2'>
										<Building2 className='size-4' />
										<span>Organization</span>
									</div>
									<ChevronDown className={cn('size-4 ml-2 transition-transform', orgMenuOpen && 'rotate-180')} />
								</SidebarMenuButton>
								{orgMenuOpen && (
									<SidebarMenuSub>
										<SidebarMenuSubItem>
											<SidebarMenuSubButton asChild>
												<Link href={orgId ? `/protected/orgs/${orgId}/settings` : '/protected/orgs'}>
													<Settings className='size-4' />
													<span>Settings</span>
												</Link>
											</SidebarMenuSubButton>
										</SidebarMenuSubItem>
										<SidebarMenuSubItem>
											<SidebarMenuSubButton asChild>
												<Link href={orgId ? `/protected/orgs/${orgId}/members` : '/protected/orgs'}>
													<Users className='size-4' />
													<span>Members</span>
												</Link>
											</SidebarMenuSubButton>
										</SidebarMenuSubItem>
									</SidebarMenuSub>
								)}
							</SidebarMenuItem>
							<SidebarMenuItem>
								<SidebarMenuButton
									className='text-xl my-1 justify-between w-full'
									tooltip='Caretaking'
									onClick={handleCaretakingClick}
								>
									<div className='flex items-center gap-2'>
										<FolderHeart className='size-4' />
										<span>Caretaking</span>
									</div>
									<ChevronDown className={cn('size-4 ml-2 transition-transform', caretakingMenuOpen && 'rotate-180')} />
								</SidebarMenuButton>
								{caretakingMenuOpen && (
									<SidebarMenuSub>
										<SidebarMenuSubItem>
											<SidebarMenuSubButton asChild>
												<Link href={orgId ? `/protected/orgs/${orgId}/enclosures` : '/protected/orgs'}>
													<Box className='size-4' />
													<span>Enclosures</span>
												</Link>
											</SidebarMenuSubButton>
										</SidebarMenuSubItem>
									</SidebarMenuSub>
								)}
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter>
				<SidebarMenu className='gap-2'>
					<SidebarMenuItem>
						<SidebarMenuButton
							asChild
							tooltip='Switch Organization'
							className='justify-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 bg-sidebar-accent hover:bg-sidebar-accent-hover active:bg-sidebar-accent-active text-sidebar-accent-foreground'
						>
							<Link href='/protected/orgs'>
								<ArrowRightLeft className='size-4' />
								<span className='group-data-[collapsible=icon]:hidden'>Switch Organization</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
					<SidebarMenuItem>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<SidebarMenuButton
									size='lg'
									className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
									tooltip='Account'
								>
									{!hasEnvVars ? (
										<EnvVarWarning />
									) : (
										<>
											<div className='bg-sidebar-primary text-sidebar-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg'>
												<CircleUserRound className='size-4' />
											</div>
											<div className='grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden'>
												<span className='truncate font-medium'>{userFirstName + ' ' + userLastName}</span>
												<span className='text-muted-foreground truncate text-xs'>{userEmail ?? 'unknown'}</span>
											</div>
											<MoreVertical className='ml-auto size-4 group-data-[collapsible=icon]:hidden' />
										</>
									)}
								</SidebarMenuButton>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								side={isMobile ? 'bottom' : 'right'}
								align='end'
								sideOffset={4}
								className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
							>
								<DropdownMenuLabel className='p-0 font-normal'>
									<div className='flex items-center gap-2 px-1 py-1.5 text-left text-sm'>
										<div className='bg-sidebar-primary text-sidebar-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg'>
											<CircleUserRound className='size-4' />
										</div>
										<div className='grid flex-1 text-left text-sm leading-tight'>
											<span className='truncate font-medium'>{userFirstName + ' ' + userLastName}</span>
											<span className='text-muted-foreground truncate text-xs'>{userEmail ?? 'unknown'}</span>
										</div>
									</div>
								</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuGroup>
									<DropdownMenuItem asChild className='cursor-pointer'>
										<Link href={orgId ? `/protected/orgs/${orgId}/account` : '/protected/account'}>
											<Settings className='size-4' />
											Account settings
										</Link>
									</DropdownMenuItem>
								</DropdownMenuGroup>
								<DropdownMenuSeparator />
								<DropdownMenuItem onSelect={handleLogout} className='cursor-pointer'>
									<LogOut className='size-4' />
									Log out
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	)
}
