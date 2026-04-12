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
	ChevronDown,
	Settings,
	Users,
	LayoutDashboard,
	Building2,
	CircleUserRound,
	MoreVertical,
	LogOut,
	Boxes,
	ClipboardList,
	FolderHeart,
	ArrowRightLeft,
	Calendar,
	MessageSquare,
	History
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { EnvVarWarning } from '@/components/env-var-warning'
import { cn, hasEnvVars } from '@/lib/utils'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useIsMobile } from '@/hooks/use-mobile'
import Link from 'next/link'
import Image from 'next/image'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { useOrgDetails } from '@/lib/react-query/queries'
import { UUID } from 'crypto'
import { useLogout } from '@/lib/react-query/auth'
import { getOrgIdFromPathname } from '@/context/verify-org-path'
import { FeedbackDialog } from '@/components/feedback/feedback-dialog'

export function AppSidebar() {
	const pathname = usePathname()
	const isMobile = useIsMobile()
	const { state, toggleSidebar, setOpenMobile } = useSidebar()
	const { data: currentUser } = useCurrentClientUser()
	const userEmail = currentUser?.email ?? ''
	const userFirstName = currentUser?.user_metadata.first_name ?? ''
	const userLastName = currentUser?.user_metadata.last_name ?? ''
	const orgId = getOrgIdFromPathname(pathname)

	const { data: orgDetails } = useOrgDetails(orgId as UUID)

	const items = [
		{
			title: 'Dashboard',
			url: orgId ? `/protected/orgs/${orgId}` : '/protected/orgs',
			icon: LayoutDashboard
		}
	]

	const [orgMenuOpen, setOrgMenuOpen] = useState(true)
	const [caretakingMenuOpen, setCaretakingMenuOpen] = useState(true)
	const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false)

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

	const logoutMutation = useLogout()

	const closeMobileOnNav = () => {
		if (isMobile) setOpenMobile(false)
	}

	return (
		<Sidebar variant='floating' collapsible='icon'>
			<FeedbackDialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen} />
			<SidebarContent>
				<SidebarGroup>
					<SidebarMenuButton
						className='mb-2.5 gap-0 cursor-default hover:bg-transparent active:bg-transparent group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0'
						size='lg'
					>
						<div className='flex aspect-square size-10 shrink-0 items-center justify-center rounded-lg overflow-hidden [background:radial-gradient(circle,rgba(255,255,255,0.15)_0%,rgba(255,255,255,0.05)_60%,rgba(255,255,255,0)_100%)]'>
							<Image src='/icons/icon-96x96.png' alt='Hivemind logo' width={32} height={32} className='size-8' />
						</div>
						<div className='grid flex-1 text-sm leading-tight group-data-[collapsible=icon]:hidden place-items-center'>
							{(() => {
								const MAX = 22
								const name = orgDetails?.name ?? ''
								const truncated = name.length > MAX
								const display = truncated ? name.slice(0, MAX - 3) + '...' : name
								return truncated ? (
									<Tooltip>
										<TooltipTrigger asChild>
											<span className='text-lg font-dancing-script cursor-default'>{display}</span>
										</TooltipTrigger>
										<TooltipContent>{name}</TooltipContent>
									</Tooltip>
								) : (
									<span className='text-lg font-dancing-script'>{display}</span>
								)
							})()}
						</div>
					</SidebarMenuButton>
					<SidebarGroupContent>
						<SidebarMenu>
							{items.map((item) => (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton className='text-xl my-1 font-bold' asChild tooltip={item.title}>
										<Link href={item.url} onClick={closeMobileOnNav}>
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
									<div className='flex items-center gap-2 font-bold text-lg'>
										<Building2 className='size-4' />
										<span>Organization</span>
									</div>
									<ChevronDown className={cn('size-4 ml-2 transition-transform', orgMenuOpen && 'rotate-180')} />
								</SidebarMenuButton>
								{orgMenuOpen && (
									<SidebarMenuSub>
										<SidebarMenuSubItem>
											<SidebarMenuSubButton asChild>
												<Link
													href={orgId ? `/protected/orgs/${orgId}/settings` : '/protected/orgs'}
													onClick={closeMobileOnNav}
												>
													<Settings className='size-4' />
													<span>Settings</span>
												</Link>
											</SidebarMenuSubButton>
										</SidebarMenuSubItem>
										<SidebarMenuSubItem>
											<SidebarMenuSubButton asChild>
												<Link
													href={orgId ? `/protected/orgs/${orgId}/members` : '/protected/orgs'}
													onClick={closeMobileOnNav}
												>
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
									<div className='flex items-center gap-2 text-lg font-bold'>
										<FolderHeart className='size-4' />
										<span>Caretaking</span>
									</div>
									<ChevronDown className={cn('size-4 ml-2 transition-transform', caretakingMenuOpen && 'rotate-180')} />
								</SidebarMenuButton>
								{caretakingMenuOpen && (
									<SidebarMenuSub>
										<SidebarMenuSubItem>
											<SidebarMenuSubButton asChild>
												<Link
													href={orgId ? `/protected/orgs/${orgId}/enclosures` : '/protected/orgs'}
													onClick={closeMobileOnNav}
												>
													<Boxes className='size-4' />
													<span>Enclosures</span>
												</Link>
											</SidebarMenuSubButton>
										</SidebarMenuSubItem>{' '}
										<SidebarMenuSubItem>
											<SidebarMenuSubButton asChild>
												<Link
													href={orgId ? `/protected/orgs/${orgId}/tasks` : '/protected/orgs'}
													onClick={closeMobileOnNav}
												>
													<ClipboardList className='size-4' />
													<span>Tasks</span>
												</Link>
											</SidebarMenuSubButton>
										</SidebarMenuSubItem>{' '}
										<SidebarMenuSubItem>
											<SidebarMenuSubButton asChild>
												<Link
													href={orgId ? `/protected/orgs/${orgId}/schedules` : '/protected/orgs'}
													onClick={closeMobileOnNav}
												>
													<Calendar className='size-4' />
													<span>Task Schedules</span>
												</Link>
											</SidebarMenuSubButton>
										</SidebarMenuSubItem>{' '}
										<SidebarMenuSubItem>
											<SidebarMenuSubButton asChild>
												<Link
													href={orgId ? `/protected/orgs/${orgId}/history` : '/protected/orgs'}
													onClick={closeMobileOnNav}
												>
													<History className='size-4' />
													<span>History</span>
												</Link>
											</SidebarMenuSubButton>
										</SidebarMenuSubItem>{' '}
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
							tooltip='Share Feedback / Report Bugs'
							className='justify-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 bg-sidebar-accent hover:bg-sidebar-accent-hover active:bg-sidebar-accent-active text-sidebar-accent-foreground'
						>
							<button
								type='button'
								onClick={() => {
									setFeedbackDialogOpen(true)
								}}
							>
								<MessageSquare className='size-4' />
								<span className='group-data-[collapsible=icon]:hidden'>Share Feedback/Bugs</span>
							</button>
						</SidebarMenuButton>
					</SidebarMenuItem>
					<SidebarMenuItem>
						<SidebarMenuButton
							asChild
							tooltip='Switch Organization'
							className='justify-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 bg-sidebar-accent hover:bg-sidebar-accent-hover active:bg-sidebar-accent-active text-sidebar-accent-foreground'
						>
							<Link href='/protected/orgs' onClick={closeMobileOnNav}>
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
										<Link
											href={orgId ? `/protected/orgs/${orgId}/account` : '/protected/account'}
											onClick={closeMobileOnNav}
										>
											<Settings className='size-4' />
											Account/Preferences
										</Link>
									</DropdownMenuItem>
								</DropdownMenuGroup>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									variant='destructive'
									onSelect={(e) => {
										e.preventDefault()
										logoutMutation.mutate()
									}}
									className='cursor-pointer'
								>
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
