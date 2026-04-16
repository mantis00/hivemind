'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useIsMobile } from '@/hooks/use-mobile'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

type HelpFunction = {
	id: string
	name: string
	description: string
}

type PageHelpSection = {
	id: string
	title: string
	purpose: string
	functions: HelpFunction[]
	commonActions: string[]
	relatedPages: string[]
}

const quickStartSteps = [
	'Open your organization and use the sidebar as your primary navigation.',
	'From Enclosures, export active enclosure CSV data when you need QR label source data (includes enclosure URLs).',
	'Generate/print QR labels from that export, then scan with the top-bar QR scanner.',
	'Use Tasks to create work, complete tasks, and submit form data.',
	'Use History and Inbox to verify changes and follow-up actions.'
]

const pageSections: PageHelpSection[] = [
	{
		id: 'organizations',
		title: 'Organizations',
		purpose: 'Join, enter, request, create, and switch organizations.',
		functions: [
			{
				id: 'enter-org',
				name: 'Enter Organization',
				description: 'Open an organization workspace from your org list.'
			},
			{
				id: 'pending-invites',
				name: 'Pending Invites',
				description: 'Accept or decline organization invites when available.'
			},
			{
				id: 'sent-org-requests',
				name: 'Org Request Tracking',
				description: 'Review and cancel your submitted organization requests while they are pending.'
			},
			{
				id: 'create-or-request-org',
				name: 'Create or Request Organization',
				description: 'Superadmins create orgs directly; other users submit org requests for review.'
			}
		],
		commonActions: [
			'Accept an invite, then click Enter to open the org workspace.',
			'If needed, cancel pending org requests from your sent-request list.',
			'Use Switch Organization in the sidebar footer to move between orgs.'
		],
		relatedPages: ['Dashboard', 'Members', 'Organization Settings', 'Superadmin Tools']
	},
	{
		id: 'global-navigation',
		title: 'Global Navigation and Sidebar',
		purpose: 'Use cross-app tools that are available from most protected pages.',
		functions: [
			{
				id: 'qr-scanner',
				name: 'QR Scanner',
				description: 'Open scanner from the top bar and scan by live camera or photo upload.'
			},
			{
				id: 'notification-dropdown',
				name: 'Notification Bell Dropdown',
				description: 'See unread notifications, mark read, and jump to related records quickly.'
			},
			{
				id: 'sidebar-navigation',
				name: 'Sidebar Navigation',
				description: 'Navigate Dashboard, Caretaking pages, History pages, Help, and account actions.'
			},
			{
				id: 'feedback-bugs',
				name: 'Share Feedback/Bugs',
				description: 'Submit bug reports or product feedback directly from the sidebar footer.'
			}
		],
		commonActions: [
			'Use QR scan to jump directly into enclosure contexts.',
			'Use unread notification items as shortcuts into active work.',
			'Open Help or account tools from sidebar/footer without leaving protected app context.'
		],
		relatedPages: ['Inbox', 'Enclosures', 'Help', 'Account and Preferences']
	},
	{
		id: 'dashboard',
		title: 'Dashboard',
		purpose: 'Start your day with workload and risk visibility.',
		functions: [
			{
				id: 'kpis',
				name: 'KPI Overview',
				description: 'Track active enclosures, completed work, at-risk enclosures, and attention-needed counts.'
			},
			{
				id: 'at-risk-panel',
				name: 'At-Risk Enclosures Panel',
				description: 'Open high-risk enclosure records based on overdue and high-priority work.'
			},
			{
				id: 'today-action-center',
				name: 'Today Action Center',
				description: 'Use built-in shortcuts to Tasks, Schedules, Enclosures, and Inbox.'
			},
			{
				id: 'recent-activity',
				name: 'Recent Activity',
				description: 'Review recent events and click through to related records.'
			}
		],
		commonActions: [
			'Start here to decide where to focus first.',
			'Open at-risk entries directly from dashboard cards.',
			'Use action-center buttons to switch into execution pages quickly.'
		],
		relatedPages: ['Tasks', 'Task Schedules', 'Enclosures', 'Inbox']
	},
	{
		id: 'enclosures',
		title: 'Enclosures',
		purpose: 'Manage enclosure records, species grouping, and enclosure-level context.',
		functions: [
			{
				id: 'create-edit-status',
				name: 'Create, Edit, and Status Management',
				description: 'Create and edit enclosures, then set active/inactive status as needed.'
			},
			{
				id: 'search-sort-filter',
				name: 'Search, Sort, and Filter',
				description: 'Find enclosure groups quickly by search text, status filter, and sort mode.'
			},
			{
				id: 'selection-batch-status',
				name: 'Selection Mode and Batch Status Updates',
				description: 'Select multiple enclosures for bulk status operations.'
			},
			{
				id: 'export-csv-qr',
				name: 'Export Enclosures CSV for QR Labels',
				description:
					'Export selected or all active enclosures to CSV. This export is commonly used to generate enclosure QR labels because it includes enclosure URL data.'
			},
			{
				id: 'enclosure-detail-tools',
				name: 'Enclosure Detail Tools',
				description:
					'Open lineage graph, population history, notes/flags, metadata, and task navigation from enclosure details.'
			},
			{
				id: 'species-management',
				name: 'Species Management',
				description: 'Manage species assigned to your org and request new species when needed.'
			}
		],
		commonActions: [
			'Use selection mode for bulk status changes and CSV export.',
			'Use exported CSV URLs to generate/print enclosure QR labels.',
			'Open enclosure details to inspect population history and lineage tracking.'
		],
		relatedPages: ['Tasks', 'QR Scanner', 'Enclosure History', 'Task Schedules']
	},
	{
		id: 'tasks',
		title: 'Tasks',
		purpose: 'Review and execute daily task workloads across enclosures or within one enclosure.',
		functions: [
			{
				id: 'task-board-filters',
				name: 'Task Board Filters and Date Modes',
				description: 'Use day navigation, date range mode, and all-dates mode with search and filters.'
			},
			{
				id: 'create-single-batch',
				name: 'Create Tasks (Single or Batch)',
				description: 'Create one-time or recurring tasks for one enclosure or multiple compatible enclosures.'
			},
			{
				id: 'selection-mode',
				name: 'Selection Mode',
				description: 'Select tasks for batch complete or batch delete operations.'
			},
			{
				id: 'open-task-or-enclosure',
				name: 'Open Task or Enclosure Context',
				description: 'Open task details for completion, or jump to enclosure-level views as needed.'
			},
			{
				id: 'reassign-owner',
				name: 'Reassign Task Owner',
				description: 'Update assignee directly from task table controls where permitted.'
			}
		],
		commonActions: [
			'Filter first, then execute actions on narrowed task sets.',
			'Use create task workflows for single-enclosure and batch-enclosure scenarios.',
			'Use selection mode when completing or deleting many tasks in one pass.'
		],
		relatedPages: ['Task Completion and Forms', 'Task Schedules', 'Enclosures']
	},
	{
		id: 'task-completion',
		title: 'Task Completion and Forms',
		purpose: 'Submit task results and form answers for single tasks or compatible batch groups.',
		functions: [
			{
				id: 'single-completion',
				name: 'Single Task Completion',
				description: 'Complete individual tasks from task detail pages.'
			},
			{
				id: 'batch-completion',
				name: 'Batch Task Completion',
				description: 'Submit one response set for compatible task groups (same template and species).'
			},
			{
				id: 'dynamic-fields',
				name: 'Dynamic Form Fields',
				description: 'Use text, number, boolean, select, multiselect, and conditional question fields.'
			},
			{
				id: 'edit-resubmit',
				name: 'Edit and Resubmit',
				description: 'Edit previously submitted answers when resubmission is available.'
			}
		],
		commonActions: [
			'Complete required fields before submission.',
			'Use batch completion only for compatible selected tasks.',
			'Use edit/resubmit for corrections on completed records when enabled.'
		],
		relatedPages: ['Tasks', 'Enclosures', 'Enclosure History']
	},
	{
		id: 'task-schedules',
		title: 'Task Schedules',
		purpose: 'Manage recurring schedule behavior and ownership.',
		functions: [
			{
				id: 'schedule-filters',
				name: 'Schedule Filters',
				description: 'Search and filter schedules by status, priority, and schedule type.'
			},
			{
				id: 'pause-activate',
				name: 'Pause or Activate',
				description: 'Toggle recurring schedules between active and paused states.'
			},
			{
				id: 'edit-reassign',
				name: 'Edit and Reassign',
				description: 'Update schedule details and reassign schedule ownership.'
			},
			{
				id: 'delete-schedule',
				name: 'Delete Schedule',
				description: 'Remove schedule definitions with confirmation (pending generated tasks are removed).'
			},
			{
				id: 'view-template',
				name: 'View Template',
				description: 'Open the task template used by a schedule for field review.'
			}
		],
		commonActions: [
			'Filter schedules to isolate the set you need to adjust.',
			'Pause schedules during temporary workflow changes, then reactivate later.',
			'Check template details before editing recurring schedule behavior.'
		],
		relatedPages: ['Tasks', 'Task Completion and Forms', 'Enclosure History']
	},
	{
		id: 'history',
		title: 'History (Enclosure History and User History)',
		purpose: 'Audit what changed, when it changed, and who performed the action.',
		functions: [
			{
				id: 'enclosure-history-filters',
				name: 'Enclosure History Filters',
				description: 'Filter timeline records by activity type, species, enclosure, user, task type, and date range.'
			},
			{
				id: 'user-history-filters',
				name: 'User History Filters',
				description: 'Filter actor-based activity by action type, entity type, user, and dates.'
			},
			{
				id: 'all-dates-mode',
				name: 'All-Dates Mode',
				description: 'Expand beyond default 14-day fetch windows when older records are needed.'
			},
			{
				id: 'export-csv',
				name: 'Export Filtered CSV',
				description: 'Export currently filtered enclosure or user history sets to CSV.'
			}
		],
		commonActions: [
			'Apply filters first to narrow the record set before exporting.',
			'Use all-dates mode when expected records are outside the default window.',
			'Use history exports for reporting and verification workflows.'
		],
		relatedPages: ['Enclosures', 'Tasks', 'Members', 'Inbox']
	},
	{
		id: 'members',
		title: 'Members',
		purpose: 'Manage organization membership, invites, and role-limited operations.',
		functions: [
			{
				id: 'invite-members',
				name: 'Invite Members',
				description: 'Send invites with role levels to eligible users.'
			},
			{
				id: 'sent-invites',
				name: 'Sent Invites',
				description: 'Track invite status and cancel pending invites.'
			},
			{
				id: 'member-list',
				name: 'Member List and Roles',
				description: 'Review member profiles, role badges, and join metadata.'
			},
			{
				id: 'kick-member',
				name: 'Remove Members',
				description: 'Kick members when your role permissions allow this action.'
			}
		],
		commonActions: [
			'Invite users with the lowest role that still meets their responsibilities.',
			'Cancel stale pending invites when plans change.',
			'Check role restrictions when actions appear disabled.'
		],
		relatedPages: ['Organization Settings', 'User History', 'Superadmin Tools']
	},
	{
		id: 'organization-settings',
		title: 'Organization Settings',
		purpose: 'Manage organization-level configuration and irreversible actions.',
		functions: [
			{
				id: 'change-org-name',
				name: 'Change Organization Name',
				description: 'Update org display name for your workspace.'
			},
			{
				id: 'delete-organization',
				name: 'Delete Organization',
				description: 'Permanently delete organization data when role permissions allow.'
			}
		],
		commonActions: [
			'Use name changes for normal org maintenance.',
			'Reserve deletion for true decommission scenarios.',
			'Confirm permission level before attempting destructive operations.'
		],
		relatedPages: ['Members', 'Organizations', 'User History']
	},
	{
		id: 'inbox',
		title: 'Inbox and Notifications',
		purpose: 'Track and manage notification-driven work and follow-up.',
		functions: [
			{
				id: 'inbox-filters',
				name: 'Inbox Search, Sort, and Filters',
				description: 'Filter by type, sender, read state, and date range with sortable columns.'
			},
			{
				id: 'bulk-delete',
				name: 'Bulk Selection and Delete',
				description: 'Select multiple notifications and remove them in one action.'
			},
			{
				id: 'linked-record-navigation',
				name: 'Linked Record Navigation',
				description: 'Open related pages directly from notification rows.'
			},
			{
				id: 'mark-viewed',
				name: 'Read-State Updates',
				description: 'Mark notifications as viewed individually or from dropdown actions.'
			}
		],
		commonActions: [
			'Filter first, then bulk-delete low-value notifications.',
			'Use linked notifications as quick navigation shortcuts.',
			'Clear unread state to keep active work visible.'
		],
		relatedPages: ['Global Navigation and Sidebar', 'History', 'Tasks']
	},
	{
		id: 'account',
		title: 'Account and Preferences',
		purpose: 'Manage personal profile, preferences, notifications, and credentials.',
		functions: [
			{
				id: 'profile-info',
				name: 'Personal Information',
				description: 'Update first and last name profile fields.'
			},
			{
				id: 'theme-preferences',
				name: 'Theme Preferences',
				description: 'Set light, dark, or system theme behavior.'
			},
			{
				id: 'push-preferences',
				name: 'Push Notification Preferences',
				description: 'Enable or disable push notifications for the current device.'
			},
			{
				id: 'credentials',
				name: 'Email and Password',
				description: 'Change account email and password using credential workflows.'
			}
		],
		commonActions: [
			'Keep profile names updated for audit readability in history views.',
			'Enable push notifications on trusted devices.',
			'Use credential update tools for routine account security hygiene.'
		],
		relatedPages: ['Inbox and Notifications', 'Global Navigation and Sidebar']
	},
	{
		id: 'superadmin',
		title: 'Superadmin Tools',
		purpose: 'Moderate requests and maintain cross-organization standards.',
		functions: [
			{
				id: 'org-request-moderation',
				name: 'Organization Request Moderation',
				description: 'Approve or reject pending organization creation requests.'
			},
			{
				id: 'species-request-moderation',
				name: 'Species Request Moderation',
				description: 'Approve or reject pending species requests.'
			},
			{
				id: 'species-management',
				name: 'Species Management',
				description: 'Create, edit, delete species and maintain species metadata.'
			},
			{
				id: 'template-management',
				name: 'Task Template Management',
				description: 'Create, edit, enable/disable task templates and their field definitions.'
			},
			{
				id: 'member-and-feedback-review',
				name: 'Member and Feedback Review',
				description: 'Review all-members data plus submitted feedback and bug reports.'
			}
		],
		commonActions: [
			'Process org/species requests in moderation queues first.',
			'Maintain template/species quality to standardize downstream task workflows.',
			'Use feedback review to prioritize operational improvements.'
		],
		relatedPages: ['Organizations', 'Members', 'Enclosures', 'Tasks']
	}
]

function getFunctionAnchor(sectionId: string, functionId: string) {
	return `${sectionId}-${functionId}`
}

export default function HelpPage() {
	const isMobile = useIsMobile()
	const [openMobileSection, setOpenMobileSection] = useState('quick-start')
	const [openDesktopTocSection, setOpenDesktopTocSection] = useState(pageSections[0]?.id ?? '')

	const renderQuickStartBody = () => (
		<ol className='list-decimal space-y-2 pl-5 text-sm'>
			{quickStartSteps.map((step) => (
				<li key={step}>{step}</li>
			))}
		</ol>
	)

	const renderQuickStartCard = () => (
		<section id='quick-start' className='scroll-mt-24'>
			<Card className='gap-3 py-4'>
				<CardHeader>
					<CardTitle>Quick Start</CardTitle>
					<CardDescription>Use this sequence when onboarding or restarting a workflow.</CardDescription>
				</CardHeader>
				<CardContent>{renderQuickStartBody()}</CardContent>
			</Card>
		</section>
	)

	const renderSectionBody = (section: PageHelpSection, showPurpose = true) => (
		<div className='space-y-4'>
			{showPurpose ? (
				<div>
					<p className='text-sm text-muted-foreground'>{section.purpose}</p>
				</div>
			) : null}
			<div>
				<p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>Functions On This Page</p>
				<div className='mt-2 space-y-2'>
					{section.functions.map((feature) => (
						<div
							key={feature.id}
							id={getFunctionAnchor(section.id, feature.id)}
							className='rounded-md border p-3 space-y-1 scroll-mt-24'
						>
							<h4 className='text-sm font-semibold'>{feature.name}</h4>
							<p className='text-sm text-muted-foreground'>{feature.description}</p>
						</div>
					))}
				</div>
			</div>

			<div>
				<p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>Common Actions</p>
				<ol className='mt-2 list-decimal space-y-1 pl-5 text-sm'>
					{section.commonActions.map((action) => (
						<li key={action}>{action}</li>
					))}
				</ol>
			</div>

			<div>
				<p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>Related Pages</p>
				<ul className='mt-2 list-disc space-y-1 pl-5 text-sm'>
					{section.relatedPages.map((related) => (
						<li key={related}>{related}</li>
					))}
				</ul>
			</div>
		</div>
	)

	const renderSectionCard = (section: PageHelpSection) => (
		<section key={section.id} id={section.id} className='scroll-mt-24'>
			<Card className='gap-3 py-4'>
				<CardHeader>
					<CardTitle>{section.title}</CardTitle>
					<CardDescription>{section.purpose}</CardDescription>
				</CardHeader>
				<CardContent>{renderSectionBody(section, false)}</CardContent>
			</Card>
		</section>
	)

	const renderContentsCard = () => {
		return (
			<Card className='gap-3 py-4'>
				<CardHeader className='px-4'>
					<CardTitle className='text-base'>Contents</CardTitle>
					<CardDescription>Open a page entry to jump directly to a function.</CardDescription>
				</CardHeader>
				<CardContent className='space-y-2 px-4'>
					<div className='text-sm'>
						<a href='#quick-start' className='text-primary hover:underline'>
							Quick Start
						</a>
					</div>

					{pageSections.map((section) => (
						<Collapsible
							key={section.id}
							open={openDesktopTocSection === section.id}
							onOpenChange={(open) => setOpenDesktopTocSection(open ? section.id : '')}
						>
							<CollapsibleTrigger asChild>
								<button
									type='button'
									className='w-full rounded-md border px-3 py-2 flex items-center justify-between text-left text-sm font-medium'
								>
									<span>{section.title}</span>
									<ChevronDown
										className={cn(
											'h-4 w-4 text-muted-foreground transition-transform',
											openDesktopTocSection === section.id && 'rotate-180'
										)}
									/>
								</button>
							</CollapsibleTrigger>
							<CollapsibleContent className='pt-2 px-2 pb-1'>
								<ul className='space-y-1 text-sm'>
									{section.functions.map((feature) => (
										<li key={feature.id}>
											<a
												href={`#${getFunctionAnchor(section.id, feature.id)}`}
												className='text-primary hover:underline'
											>
												{feature.name}
											</a>
										</li>
									))}
								</ul>
							</CollapsibleContent>
						</Collapsible>
					))}
				</CardContent>
			</Card>
		)
	}

	if (isMobile) {
		return (
			<div className='space-y-4 w-full justify-center items-center'>
				<div className='flex-col mx-auto max-w-5xl flex space-y-4'>
					<div className='pb-1'>
						<h1 className='text-2xl font-semibold'>Help</h1>
						<p className='text-sm text-muted-foreground'>
							This page is a page-by-page user reference sheet for how to use Hivemind.
						</p>
					</div>

					<Card className='gap-3 py-4'>
						<CardHeader>
							<CardTitle className='text-base'>Topics</CardTitle>
							<CardDescription>Tap a topic to expand one section at a time.</CardDescription>
						</CardHeader>
						<CardContent className='space-y-2'>
							<Collapsible
								open={openMobileSection === 'quick-start'}
								onOpenChange={(open) => setOpenMobileSection(open ? 'quick-start' : '')}
							>
								<CollapsibleTrigger asChild>
									<button
										type='button'
										className='w-full rounded-md border px-3 py-2 flex items-center justify-between text-left text-sm font-medium'
									>
										<span>Quick Start</span>
										<ChevronDown
											className={cn(
												'h-4 w-4 text-muted-foreground transition-transform',
												openMobileSection === 'quick-start' && 'rotate-180'
											)}
										/>
									</button>
								</CollapsibleTrigger>
								<CollapsibleContent className='pt-3'>{renderQuickStartBody()}</CollapsibleContent>
							</Collapsible>

							{pageSections.map((section) => (
								<Collapsible
									key={section.id}
									open={openMobileSection === section.id}
									onOpenChange={(open) => setOpenMobileSection(open ? section.id : '')}
								>
									<CollapsibleTrigger asChild>
										<button
											type='button'
											className='w-full rounded-md border px-3 py-2 flex items-center justify-between text-left text-sm font-medium'
										>
											<span>{section.title}</span>
											<ChevronDown
												className={cn(
													'h-4 w-4 text-muted-foreground transition-transform',
													openMobileSection === section.id && 'rotate-180'
												)}
											/>
										</button>
									</CollapsibleTrigger>
									<CollapsibleContent className='pt-3'>{renderSectionBody(section)}</CollapsibleContent>
								</Collapsible>
							))}
						</CardContent>
					</Card>
				</div>
			</div>
		)
	}

	return (
		<div className='space-y-4 w-full justify-center items-center'>
			<div className='flex-col mx-auto max-w-5xl flex space-y-4'>
				<div className='pb-1'>
					<h1 className='text-2xl font-semibold'>Help</h1>
					<p className='text-sm text-muted-foreground'>
						This page is a page-by-page user reference sheet for how to use Hivemind.
					</p>
				</div>

				<div className='grid items-start gap-4 lg:grid-cols-[18rem_1fr]'>
					<aside className='lg:sticky lg:top-20'>{renderContentsCard()}</aside>

					<div className='space-y-4'>
						{renderQuickStartCard()}
						{pageSections.map((section) => renderSectionCard(section))}
					</div>
				</div>
			</div>
		</div>
	)
}
