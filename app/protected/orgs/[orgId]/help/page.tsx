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
	'Open your organization from the Organizations page, then use the left sidebar to move between pages.',
	'Start on Dashboard to see what needs attention first.',
	'Open Enclosures and confirm active status and species before starting task work.',
	'Use Tasks to create work, complete work, and submit form answers.',
	'Use Inbox and the bell icon for updates and shortcuts into active work.',
	'Use History to verify what changed and who made the change.'
]

const pageSections: PageHelpSection[] = [
	{
		id: 'organizations',
		title: 'Organizations',
		purpose: 'Use this page to get into the correct organization workspace.',
		functions: [
			{
				id: 'enter-org',
				name: 'Enter Organization',
				description: 'Click Enter on an organization card to open that workspace.'
			},
			{
				id: 'pending-invites',
				name: 'Pending Invites',
				description: 'Accept or decline invites to join organizations.'
			},
			{
				id: 'sent-org-requests',
				name: 'Org Request Tracking',
				description: 'Track requests you submitted and cancel them while they are still pending.'
			},
			{
				id: 'create-or-request-org',
				name: 'Create or Request Organization',
				description: 'Create an organization directly (superadmin) or submit a request for review.'
			},
			{
				id: 'request-visibility-window',
				name: 'Recent Decision Visibility',
				description: 'Recently approved or rejected requests stay visible briefly so you can confirm outcomes.'
			},
			{
				id: 'leave-org',
				name: 'Leave Organization',
				description: 'Use Leave Organization on a card when your role allows it.'
			},
			{
				id: 'superadmin-shortcut',
				name: 'Superadmin Shortcut',
				description: 'Superadmins can jump to Superadmin Tools directly from this page.'
			}
		],
		commonActions: [
			'If you do not see an expected org, check Pending Invites and Sent Requests first.',
			'If Enter fails, your access may have changed or the request may still be pending.',
			'Use Switch Organization in the sidebar footer whenever you need to move quickly between orgs.'
		],
		relatedPages: ['Dashboard', 'Members', 'Organization Settings', 'Superadmin Tools']
	},
	{
		id: 'global-navigation',
		title: 'Global Navigation and Sidebar',
		purpose: 'Use these tools from the top bar and sidebar on most protected pages.',
		functions: [
			{
				id: 'qr-scanner',
				name: 'QR Scanner',
				description: 'Use the top-bar scanner to open an enclosure by live camera or by scanning a photo.'
			},
			{
				id: 'notification-dropdown',
				name: 'Notification Bell Dropdown',
				description: 'Open unread notifications, mark all read, and jump to Inbox.'
			},
			{
				id: 'sidebar-navigation',
				name: 'Sidebar Navigation',
				description: 'Use the sidebar to open Dashboard, Caretaking pages, History pages, and Help.'
			},
			{
				id: 'account-and-session-menu',
				name: 'Account and Session Menu',
				description: 'Open Account/Preferences and log out from account menus on desktop or mobile.'
			},
			{
				id: 'install-app',
				name: 'Install App',
				description: 'Install the app from prompts or account menus for faster launch and better notification support.'
			},
			{
				id: 'push-prompt-shortcut',
				name: 'Push Prompt Shortcut',
				description: 'When push is not enabled, notification flows can prompt you to enable it.'
			},
			{
				id: 'feedback-bugs',
				name: 'Share Feedback/Bugs',
				description: 'Send feedback or report bugs from the sidebar footer.'
			}
		],
		commonActions: [
			'If a QR code does not open a page, retry scan and confirm it belongs to your organization.',
			'If unread counts look wrong, open Inbox and check filters and read state.',
			'If push is unavailable on iPhone or iPad, install the app to Home Screen first.'
		],
		relatedPages: ['Inbox and Notifications', 'Enclosures', 'Help', 'Account and Preferences']
	},
	{
		id: 'dashboard',
		title: 'Dashboard',
		purpose: 'Start here each day to see workload, risk, and quick navigation shortcuts.',
		functions: [
			{
				id: 'kpis',
				name: 'KPI Overview',
				description: 'Review key counts like active enclosures, completed work, and attention-needed items.'
			},
			{
				id: 'at-risk-panel',
				name: 'At-Risk Enclosures Panel',
				description: 'Open enclosures with overdue or high-priority work first.'
			},
			{
				id: 'today-action-center',
				name: 'Today Action Center and Next Up',
				description: 'Use quick buttons and Next Up links to move directly into task work.'
			},
			{
				id: 'recent-activity',
				name: 'Recent Activity',
				description: 'Review recent activity and open linked records when you need details.'
			},
			{
				id: 'dashboard-warnings',
				name: 'Dashboard Warnings',
				description: 'Watch for warnings that tell you dashboard data is partially loaded.'
			}
		],
		commonActions: [
			'If numbers look low or missing, refresh and check for warning messages.',
			'If you are not sure where to start, open At-Risk Enclosures first.',
			'If you need detail, open Tasks or Enclosures from the dashboard shortcuts.'
		],
		relatedPages: ['Tasks', 'Task Schedules', 'Enclosures', 'Inbox and Notifications']
	},
	{
		id: 'enclosures',
		title: 'Enclosures',
		purpose: 'Create and manage enclosure records, species grouping, and enclosure details.',
		functions: [
			{
				id: 'create-edit-status',
				name: 'Create, Edit, and Active Status',
				description: 'Add new enclosures, edit details, and set active or inactive status.'
			},
			{
				id: 'search-sort-filter',
				name: 'Search, Sort, and Status Filters',
				description: 'Use search, sort, and active or inactive filters to find enclosure groups quickly.'
			},
			{
				id: 'selection-batch-status',
				name: 'Selection Mode and Batch Status Updates',
				description: 'Turn on Select mode to update status on multiple enclosures at once.'
			},
			{
				id: 'export-csv-qr',
				name: 'Export Enclosures CSV for QR Labels',
				description:
					'Export selected or all active enclosures to CSV. This file is often used to generate QR labels because it includes enclosure URLs.'
			},
			{
				id: 'enclosure-detail-tools',
				name: 'Enclosure Detail Tools',
				description: 'Open enclosure details to view notes, lineage, population history, and task links.'
			},
			{
				id: 'notes-and-flags',
				name: 'Notes and Flags',
				description: 'Add notes and flagged notes to track issues and important context.'
			},
			{
				id: 'source-tracking',
				name: 'Source Tracking and Lineage Inputs',
				description: 'Record source details and specimen IDs during create or edit to keep lineage accurate.'
			},
			{
				id: 'species-management',
				name: 'Species Management',
				description: 'Manage org species, switch common or scientific view, and request new species when needed.'
			},
			{
				id: 'inactive-rules',
				name: 'Inactive Enclosure Rules',
				description: 'Inactive enclosures remain visible but restrict some actions like task work and note entry.'
			}
		],
		commonActions: [
			'If you cannot create tasks or notes, check whether the enclosure is inactive.',
			'If export is empty, switch to active enclosures or select active rows.',
			'If species are missing in create flows, add them in Manage Species first.'
		],
		relatedPages: ['Tasks', 'Global Navigation and Sidebar', 'History', 'Task Schedules']
	},
	{
		id: 'tasks',
		title: 'Tasks',
		purpose: 'Review daily work and complete tasks across the organization or inside one enclosure.',
		functions: [
			{
				id: 'task-board-filters',
				name: 'Task Board Date Modes',
				description: 'Start on Today, then use date range or all dates when you need broader results.'
			},
			{
				id: 'day-navigator-behavior',
				name: 'Day Navigator Behavior',
				description: 'Use left and right day navigation to move through task workload by date.'
			},
			{
				id: 'all-dates-confirmation',
				name: 'All-Dates Confirmation',
				description: 'All dates mode shows a warning because large datasets can load more slowly.'
			},
			{
				id: 'search-and-filters',
				name: 'Search and Filters',
				description: 'Filter tasks by search, status, priority, and date range.'
			},
			{
				id: 'org-mode-search-fields',
				name: 'Organization Task Search Fields',
				description: 'In organization task view, search can match task name, species, enclosure, and assignee.'
			},
			{
				id: 'columns-toggle',
				name: 'Columns Toggle',
				description: 'Show or hide optional columns so the table matches your workflow.'
			},
			{
				id: 'create-single-batch',
				name: 'Create Tasks (Single or Batch)',
				description: 'Create one-time or recurring tasks for one enclosure or batch-create across many enclosures.'
			},
			{
				id: 'selection-mode',
				name: 'Selection Mode Rules',
				description:
					'Use Select mode for batch actions. Batch complete requires compatible tasks (same template and species).'
			},
			{
				id: 'open-task-or-enclosure',
				name: 'Open Task or Enclosure Context',
				description: 'Open a task for completion or jump to the enclosure page when you need more context.'
			},
			{
				id: 'reassign-owner',
				name: 'Reassign Task Owner',
				description: 'Change task assignees from table controls when allowed.'
			}
		],
		commonActions: [
			'If batch complete is unavailable, reselect tasks that match template and species.',
			'If you see too many rows, apply status and date range filters before all dates.',
			'If reassign is disabled, the task may be completed or in an inactive enclosure.'
		],
		relatedPages: ['Task Completion and Forms', 'Task Schedules', 'Enclosures']
	},
	{
		id: 'task-completion',
		title: 'Task Completion and Forms',
		purpose: 'Submit task results for one task or for a compatible batch of tasks.',
		functions: [
			{
				id: 'single-completion',
				name: 'Single Task Completion',
				description: 'Open a task and submit answers to mark it complete.'
			},
			{
				id: 'batch-completion',
				name: 'Batch Task Completion',
				description: 'Submit one set of answers for selected tasks that are compatible.'
			},
			{
				id: 'dynamic-fields',
				name: 'Dynamic Form Fields',
				description:
					'Fill required and optional fields, including conditional questions that appear from prior answers.'
			},
			{
				id: 'no-form-completion',
				name: 'No-Form Completion',
				description: 'Complete tasks that have no form fields with one click.'
			},
			{
				id: 'edit-resubmit',
				name: 'Edit and Resubmit',
				description: 'Edit a completed submission and resubmit when correction is needed.'
			},
			{
				id: 'completion-state-and-followup',
				name: 'Completion State and Follow-Up',
				description: 'Review completed status, completion time, and follow-up actions after submission.'
			},
			{
				id: 'inactive-enclosure-restrictions',
				name: 'Inactive Enclosure Restrictions',
				description: 'Completion and reassignment are disabled when the enclosure is inactive.'
			},
			{
				id: 'task-level-controls',
				name: 'Task-Level Controls',
				description: 'Use task controls to delete open tasks, reassign owners, or open enclosure details.'
			}
		],
		commonActions: [
			'If submit is disabled, check for required fields that are still empty.',
			'If completion is blocked, confirm the enclosure is active.',
			'If data was entered incorrectly, use Edit Submission and resubmit.'
		],
		relatedPages: ['Tasks', 'Enclosures', 'History']
	},
	{
		id: 'task-schedules',
		title: 'Task Schedules',
		purpose: 'Manage recurring schedule behavior, ownership, and generation settings.',
		functions: [
			{
				id: 'schedule-filters',
				name: 'Schedule Filters',
				description: 'Find schedules quickly with search, status, priority, and type filters.'
			},
			{
				id: 'pause-activate',
				name: 'Pause or Activate',
				description: 'Pause schedules during workflow changes, then reactivate when ready.'
			},
			{
				id: 'edit-reassign',
				name: 'Edit and Reassign',
				description: 'Edit schedule settings and reassign ownership when responsibilities change.'
			},
			{
				id: 'recurrence-controls',
				name: 'Recurrence Controls',
				description: 'Set recurrence pattern, end rules, advance count, and time window.'
			},
			{
				id: 'occurrence-progress',
				name: 'Occurrence Progress',
				description: 'Schedules with occurrence limits show progress so you can track remaining runs.'
			},
			{
				id: 'delete-schedule',
				name: 'Delete Schedule',
				description: 'Delete a schedule with confirmation when it is no longer needed.'
			},
			{
				id: 'view-template',
				name: 'View Template',
				description: 'Open the linked template to review included fields.'
			},
			{
				id: 'template-locked-fields',
				name: 'Template-Locked Fields',
				description: 'Some fields are locked when the schedule was created from a template.'
			},
			{
				id: 'paused-readonly-behavior',
				name: 'Paused Schedule Behavior',
				description: 'Paused schedules stay visible for review and can be reactivated anytime.'
			}
		],
		commonActions: [
			'If new tasks are not generating, check whether the schedule is paused or ended.',
			'If a field cannot be edited, the linked template may control that field.',
			'If you delete a schedule, pending generated tasks are removed by design.'
		],
		relatedPages: ['Tasks', 'Task Completion and Forms', 'History']
	},
	{
		id: 'history',
		title: 'History (Enclosure History and User History)',
		purpose: 'Use History to verify what changed, when it changed, and who did it.',
		functions: [
			{
				id: 'default-window',
				name: 'Default 14-Day Window',
				description: 'History loads the most recent 14 days by default.'
			},
			{
				id: 'enclosure-history-filters',
				name: 'Enclosure History Filters',
				description: 'Filter enclosure history by activity type, species, enclosure, user, task type, and date.'
			},
			{
				id: 'user-history-filters',
				name: 'User History Filters',
				description: 'Filter user history by action type, entity type, user, and date.'
			},
			{
				id: 'all-dates-mode',
				name: 'All-Dates Mode',
				description: 'Enable all dates when you need records older than the default range.'
			},
			{
				id: 'date-range-mode',
				name: 'Date Range Mode',
				description: 'Set a specific date range to narrow results before review or export.'
			},
			{
				id: 'export-csv',
				name: 'Export Filtered CSV',
				description: 'Export the filtered history result set to CSV.'
			}
		],
		commonActions: [
			'If a record is missing, expand the date range or turn on all dates.',
			'If there are too many rows, filter by type, user, species, or enclosure first.',
			'If export output is too broad, apply filters before exporting.'
		],
		relatedPages: ['Enclosures', 'Tasks', 'Members', 'Inbox and Notifications']
	},
	{
		id: 'members',
		title: 'Members',
		purpose: 'Manage organization membership, invites, and role-based access.',
		functions: [
			{
				id: 'invite-members',
				name: 'Invite Members',
				description: 'Invite eligible users and assign the correct role level.'
			},
			{
				id: 'invite-eligibility',
				name: 'Invite Eligibility Rules',
				description: 'Invite lists exclude users who already have access.'
			},
			{
				id: 'sent-invites',
				name: 'Sent Invites and Expiration',
				description: 'Track invite status, check expiration timing, and cancel pending invites.'
			},
			{
				id: 'member-list',
				name: 'Member List and Roles',
				description: 'Review members, role badges, and join information.'
			},
			{
				id: 'kick-member',
				name: 'Remove Members',
				description: 'Remove members when your role allows it, including mobile overflow controls.'
			},
			{
				id: 'permission-gated-controls',
				name: 'Permission-Gated Controls',
				description: 'Invite and remove actions are shown or disabled based on your role.'
			}
		],
		commonActions: [
			'If a user is missing from invite search, they may already be a member or already have global access.',
			'If remove is disabled, your role likely does not allow that action.',
			'If invite status is unclear, check Sent Invites and expiration details.'
		],
		relatedPages: ['Organization Settings', 'History', 'Superadmin Tools']
	},
	{
		id: 'organization-settings',
		title: 'Organization Settings',
		purpose: 'Manage organization-level settings and high-impact actions.',
		functions: [
			{
				id: 'change-org-name',
				name: 'Change Organization Name',
				description: 'Update the organization name shown across the workspace.'
			},
			{
				id: 'delete-organization',
				name: 'Delete Organization',
				description: 'Permanently delete the organization when role permissions allow it.'
			},
			{
				id: 'permission-protection',
				name: 'Permission Protection',
				description: 'Disabled actions show permission guidance when your role cannot perform them.'
			}
		],
		commonActions: [
			'If buttons are disabled, check the permission message and role restrictions.',
			'Use rename for normal maintenance, and reserve deletion for true decommission only.',
			'If you need admin-level changes, contact an owner or superadmin.'
		],
		relatedPages: ['Members', 'Organizations', 'History']
	},
	{
		id: 'inbox',
		title: 'Inbox and Notifications',
		purpose: 'Use Inbox to track alerts and jump into follow-up work quickly.',
		functions: [
			{
				id: 'inbox-filters',
				name: 'Inbox Search, Sort, and Filters',
				description: 'Use search, sorting, and filters for type, sender, read state, and date range.'
			},
			{
				id: 'selection-controls',
				name: 'Selection Controls',
				description: 'Select notifications, use select all, clear selection, and batch delete.'
			},
			{
				id: 'sortable-columns',
				name: 'Sortable Inbox Columns',
				description: 'Sort by date, sender, type, or title to prioritize review.'
			},
			{
				id: 'linked-record-navigation',
				name: 'Linked Record Navigation',
				description: 'Open linked tasks and records directly from notification rows.'
			},
			{
				id: 'mark-viewed',
				name: 'Read-State Updates',
				description: 'Mark individual notifications read or use Mark all read from the bell menu.'
			},
			{
				id: 'bell-dropdown-shortcuts',
				name: 'Bell Dropdown Shortcuts',
				description: 'Use the top-bar bell for unread summaries and a quick link into Inbox.'
			},
			{
				id: 'push-opt-in',
				name: 'Push Opt-In Prompt',
				description: 'Enable push notifications on this device from notification prompts.'
			},
			{
				id: 'delete-confirmations',
				name: 'Delete Confirmations',
				description: 'Single and bulk delete actions both require confirmation.'
			}
		],
		commonActions: [
			'If expected notifications are missing, clear filters and date range first.',
			'If unread count looks high, use Mark all read after review.',
			'If push does not work on iPhone or iPad, install to Home Screen and retry enable.'
		],
		relatedPages: ['Global Navigation and Sidebar', 'History', 'Tasks']
	},
	{
		id: 'account',
		title: 'Account and Preferences',
		purpose: 'Manage your profile, theme, device notifications, and login credentials.',
		functions: [
			{
				id: 'profile-info',
				name: 'Personal Information',
				description: 'Update first and last name so records and history stay readable.'
			},
			{
				id: 'theme-preferences',
				name: 'Theme Preferences',
				description: 'Choose light, dark, or system theme.'
			},
			{
				id: 'push-preferences',
				name: 'Push Notification Preferences',
				description: 'Enable or disable push notifications for the current device.'
			},
			{
				id: 'profile-save-controls',
				name: 'Profile Save Controls',
				description: 'Save is enabled only after profile values are changed.'
			},
			{
				id: 'email-change-verification',
				name: 'Email Change Verification',
				description: 'Changing email requires confirmation links from both current and new addresses.'
			},
			{
				id: 'password-change',
				name: 'Password Change Workflow',
				description: 'Change password with current password and matching new password confirmation.'
			}
		],
		commonActions: [
			'If save is disabled on profile details, make sure a value has actually changed.',
			'If email change seems incomplete, confirm both email links.',
			'If password update fails, verify current password and matching new password fields.'
		],
		relatedPages: ['Inbox and Notifications', 'Global Navigation and Sidebar', 'Authentication and Access']
	},
	{
		id: 'superadmin',
		title: 'Superadmin Tools',
		purpose: 'For superadmins: moderate requests and maintain shared app standards.',
		functions: [
			{
				id: 'org-request-moderation',
				name: 'Organization Request Moderation',
				description: 'Approve or reject org creation requests and review recently resolved items.'
			},
			{
				id: 'species-request-moderation',
				name: 'Species Request Moderation',
				description: 'Approve or reject species requests and review recently resolved items.'
			},
			{
				id: 'species-management',
				name: 'Species Management',
				description: 'Create and edit species metadata and images in the shared species library.'
			},
			{
				id: 'template-management',
				name: 'Task Template Management',
				description: 'Create and edit task templates, including question fields, options, and template state.'
			},
			{
				id: 'member-review',
				name: 'All Members and Org Roles',
				description: 'Review global member lists and open per-user org role breakdowns.'
			},
			{
				id: 'feedback-review',
				name: 'Feedback and Bug Review',
				description: 'Search and review submitted feedback and bug reports across organizations.'
			},
			{
				id: 'request-queue-timing',
				name: 'Moderation Queue Timing',
				description: 'Recently reviewed requests stay visible for a short period for follow-up checks.'
			}
		],
		commonActions: [
			'If a request is not in pending, check the recently resolved list before searching elsewhere.',
			'If species delete is disabled, the species is still in use by one or more organizations.',
			'If template updates do not affect old records, that is expected; changes apply to future task creation.'
		],
		relatedPages: ['Organizations', 'Members', 'Enclosures', 'Tasks']
	},
	{
		id: 'authentication-access',
		title: 'Authentication and Access',
		purpose: 'Sign in, recover credentials, and understand access and error states.',
		functions: [
			{
				id: 'login-signup',
				name: 'Login and Sign Up',
				description: 'Create an account or sign in, then move into protected app pages.'
			},
			{
				id: 'email-confirmation',
				name: 'Email Confirmation',
				description: 'Use email confirmation links for signup and email-change flows.'
			},
			{
				id: 'signup-success-flow',
				name: 'Sign-Up Success Flow',
				description: 'After signup, users are prompted to check email before first full access.'
			},
			{
				id: 'password-recovery',
				name: 'Forgot and Reset Password',
				description: 'Request a reset link, then set a new password from the reset page.'
			},
			{
				id: 'auth-error-page',
				name: 'Auth Error Handling',
				description: 'Use auth error pages to diagnose expired, invalid, or already-used links.'
			},
			{
				id: 'org-access-guardrails',
				name: 'Organization Access Guardrails',
				description: 'Organization routes check membership or superadmin access before allowing entry.'
			},
			{
				id: 'offline-and-protected-errors',
				name: 'Offline and Protected Error Screens',
				description: 'Use offline and protected error screens to retry or return home when a page fails.'
			},
			{
				id: 'default-auth-redirects',
				name: 'Default Auth Redirects',
				description: 'App entry routes send users to login or protected pages based on session state.'
			}
		],
		commonActions: [
			'If a login or email link fails, request a new link and try again from a fresh email.',
			'If you are redirected to login unexpectedly, your session may have expired.',
			'If you see the offline page, reconnect and reload.'
		],
		relatedPages: ['Organizations', 'Account and Preferences', 'Global Navigation and Sidebar']
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
			<Card className='gap-3 border-l-4 border-l-primary/25 py-4'>
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
				<p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
					What You&apos;ll Do Most Days
				</p>
				<div className='mt-2 space-y-2'>
					{section.functions.map((feature) => (
						<div
							key={feature.id}
							id={getFunctionAnchor(section.id, feature.id)}
							className='scroll-mt-24 space-y-1 rounded-md border border-border/70 bg-muted/20 p-3'
						>
							<h4 className='text-sm font-semibold'>{feature.name}</h4>
							<p className='text-sm text-muted-foreground'>{feature.description}</p>
						</div>
					))}
				</div>
			</div>

			<div>
				<p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>If Something Looks Wrong</p>
				<div className='mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3'>
					<ol className='list-decimal space-y-1 pl-5 text-sm'>
						{section.commonActions.map((action) => (
							<li key={action}>{action}</li>
						))}
					</ol>
				</div>
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
			<Card className='gap-3 border-l-4 border-l-primary/25 py-4'>
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
			<Card className='gap-3 py-4 lg:max-h-[calc(100vh-6rem)] lg:overflow-hidden'>
				<CardHeader className='px-4'>
					<CardTitle className='text-base'>Contents</CardTitle>
					<CardDescription>Open a page entry to jump directly to a function.</CardDescription>
				</CardHeader>
				<CardContent className='space-y-2 px-4 lg:overflow-y-auto'>
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
				<div className='flex-col mx-auto max-w-4xl flex space-y-4'>
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
			<div className='flex-col mx-auto max-w-4xl flex space-y-4'>
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
