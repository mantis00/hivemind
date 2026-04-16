'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useIsMobile } from '@/hooks/use-mobile'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

type HelpSection = {
	id: string
	title: string
	description: string
	whatYouCanDo: string[]
	howToUseIt: string[]
}

const quickStartSteps = [
	'Open your organization, then use the left sidebar to move between Dashboard, Enclosures, Tasks, Schedules, History, and Help.',
	'Start each day in Tasks to review late, due-today, and upcoming work.',
	'Use Create Task for one enclosure or batch create for multiple enclosures of the same species.',
	'Open a task to complete it, enter form answers, and submit.',
	'Use History pages to confirm what changed and who changed it.'
]

const sections: HelpSection[] = [
	{
		id: 'qr-scanning',
		title: 'QR Scanning',
		description: 'Scan enclosure QR codes quickly from anywhere in the app.',
		whatYouCanDo: [
			'Open the scanner from the top navigation without leaving your current page.',
			'Scan live with camera or use scan-from-photo upload.',
			'Open the linked enclosure/task context when a valid code is found.'
		],
		howToUseIt: [
			'Click the QR icon in the top bar, then choose camera scan or photo upload.',
			'If scanning fails, first check browser camera permission settings and retry.',
			'Printed codes are generally more reliable than scanning from another screen.',
			'Only valid enclosure URLs in organizations you can access will open correctly.'
		]
	},
	{
		id: 'daily-task-workflow',
		title: 'Daily Task Workflow',
		description: 'The fastest path for day-to-day caretaking work.',
		whatYouCanDo: [
			'See pending, late, and completed work in one task table.',
			'Move across days, or expand to all dates/date range when needed.',
			'Open task details from the table to complete, reassign, or review.'
		],
		howToUseIt: [
			'Go to Tasks from the sidebar.',
			'Use search and filters first (status, priority, date) to narrow the list.',
			'Click a row to open the task details and complete the workflow.'
		]
	},
	{
		id: 'creating-tasks',
		title: 'Creating Tasks',
		description: 'Create one-time or recurring work from templates or custom entries.',
		whatYouCanDo: [
			'Create a single task for one enclosure.',
			'Batch create the same task across multiple enclosures.',
			'Set assignee, priority, and time window (AM / Any / PM).',
			'Choose one-time, flexible recurring, or fixed recurring scheduling.'
		],
		howToUseIt: [
			'From org-wide Tasks, click Create Task and choose Single Enclosure or Batch Create.',
			'Pick template or custom task details, then fill assignment and scheduling fields.',
			'Submit to create tasks/schedules. If an enclosure is inactive, creation is disabled.'
		]
	},
	{
		id: 'completing-tasks-and-forms',
		title: 'Completing Tasks and Entering Form Data',
		description: 'Submit task answers for single tasks or compatible task batches.',
		whatYouCanDo: [
			'Complete a single task from its detail page.',
			'Batch complete compatible tasks from the org-wide task table.',
			'Enter dynamic form fields: text, number, boolean, select, multiselect, and conditional fields.',
			'Edit/resubmit completed answers when allowed.'
		],
		howToUseIt: [
			'For single tasks: open task row, complete required fields, then submit.',
			'For batch complete: use Select Tasks, choose Batch Complete, then submit one form for the selected set.',
			'Batch Complete only allows compatible groups (same template and species). Use Batch Delete for mixed selections.'
		]
	},
	{
		id: 'batch-actions',
		title: 'Batch Actions (Complete and Delete)',
		description: 'Use selection mode for faster multi-task operations.',
		whatYouCanDo: [
			'Batch complete compatible tasks.',
			'Batch delete selected tasks.',
			'Cancel selection mode at any time.'
		],
		howToUseIt: [
			'In Tasks, click Select Tasks and choose Batch Complete or Batch Delete.',
			'Select rows in the table; disabled rows indicate unsupported actions for that mode.',
			'Confirm the action from the selection toolbar.'
		]
	},
	{
		id: 'enclosures-and-care-views',
		title: 'Enclosures and Care Views',
		description: 'Manage enclosure data and move into enclosure-scoped task work.',
		whatYouCanDo: [
			'Add enclosures, manage species membership, and request species.',
			'Search/sort/filter enclosure groups.',
			'Bulk set active/inactive and export enclosure data to CSV.',
			'Open enclosure details for tasks, lineage, notes/flags, population history, and metadata.'
		],
		howToUseIt: [
			'Use Enclosures from the sidebar for structure-level edits.',
			'Open an enclosure detail to switch from overview into direct task execution.',
			'If an enclosure is inactive, you can still review tasks/history but create and completion actions are restricted.'
		]
	},
	{
		id: 'task-schedules',
		title: 'Task Schedules',
		description: 'Control recurring task generation.',
		whatYouCanDo: [
			'View and filter recurring schedules.',
			'Pause/activate, edit, delete, and reassign schedule owner.',
			'Open the underlying task template.'
		],
		howToUseIt: [
			'Go to Task Schedules from the sidebar.',
			'Use filters to find active or priority-specific schedules.',
			'Before deleting, note that pending tasks from that schedule are removed while completed tasks remain.'
		]
	},
	{
		id: 'history-and-audit',
		title: 'History and Audit',
		description: 'Track what happened in your organization and who performed actions.',
		whatYouCanDo: [
			'Use Enclosure History for task/enclosure event timelines.',
			'Use User History for actor-based action logs.',
			'Apply filters and export CSV on both pages.'
		],
		howToUseIt: [
			'Open History in the sidebar, then choose Enclosure History or User History.',
			'Use all-dates/global-search when you need records older than the default 14-day window.',
			'Use filters first, then export only the narrowed set when sharing reports.'
		]
	},
	{
		id: 'members-and-permissions',
		title: 'Members and Permissions',
		description: 'Control access and understand why some actions are disabled.',
		whatYouCanDo: [
			'Invite members with role level, review sent invites, and manage member list.',
			'Kick members when role permissions allow.',
			'Change organization name or delete organization from settings.',
			'See permission-based disabled controls with tooltip guidance.'
		],
		howToUseIt: [
			'Go to Members for people/role operations, and Settings for organization-level changes.',
			'If an action is disabled, hover/read the tooltip and verify your access level.',
			'Superadmin users can access all organizations, even without direct membership.'
		]
	},
	{
		id: 'notifications-and-account',
		title: 'Notifications and Account',
		description: 'Manage inbox activity and personal preferences.',
		whatYouCanDo: [
			'Use inbox search/filter/sort and bulk/single delete actions.',
			'Open notification items to mark viewed and jump to related pages.',
			'Update profile, theme, push preferences, password, and email.'
		],
		howToUseIt: [
			'Use the bell for quick unread management, or open full Inbox for advanced filtering.',
			'Expect notifications for key org events such as invites and request outcomes.',
			'Use Account/Preferences from the sidebar menu for profile and credentials.',
			'Password changes require current password; email changes require confirmation on current and new addresses.'
		]
	},
	{
		id: 'superadmin-tools',
		title: 'Superadmin Tools',
		description: 'Role-gated administration and moderation tools.',
		whatYouCanDo: [
			'Approve/reject organization and species requests.',
			'Manage species and task templates.',
			'Review all-members visibility and feedback/bug reports.'
		],
		howToUseIt: [
			'Open Superadmin from the organizations area.',
			'Use moderation tables for approvals and operational follow-up.',
			'Use template/species tools to maintain standardized task workflows.'
		]
	},
	{
		id: 'common-issues',
		title: 'Common Issues and Fixes',
		description: 'Quick checks before reporting a bug.',
		whatYouCanDo: [
			'Resolve missing rows by checking date range and all-dates/global-search.',
			'Resolve disabled buttons by checking role permissions or enclosure status.',
			'Confirm changes by checking the matching History page.'
		],
		howToUseIt: [
			'If you cannot find data, reset filters and re-run with all-dates.',
			'If you cannot perform an action, verify role and enclosure active status.',
			'If behavior still looks wrong, send a report from Share Feedback/Bugs in the sidebar.'
		]
	}
]

export default function HelpPage() {
	const isMobile = useIsMobile()
	const [openMobileSection, setOpenMobileSection] = useState('quick-start')

	const renderQuickStartBody = () => (
		<ol className='list-decimal space-y-2 pl-5 text-sm'>
			{quickStartSteps.map((step) => (
				<li key={step}>{step}</li>
			))}
		</ol>
	)

	const renderSectionBody = (section: HelpSection) => (
		<div className='space-y-3'>
			<p className='text-sm text-muted-foreground'>{section.description}</p>
			<div>
				<p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>What You Can Do</p>
				<ul className='mt-1 list-disc space-y-1 pl-5 text-sm'>
					{section.whatYouCanDo.map((item) => (
						<li key={item}>{item}</li>
					))}
				</ul>
			</div>
			<div>
				<p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>How To Use It</p>
				<ul className='mt-1 list-disc space-y-1 pl-5 text-sm'>
					{section.howToUseIt.map((item) => (
						<li key={item}>{item}</li>
					))}
				</ul>
			</div>
		</div>
	)

	if (isMobile) {
		return (
			<div className='space-y-4 w-full justify-center items-center'>
				<div className='flex-col mx-auto max-w-5xl flex space-y-4'>
					<div className='pb-1'>
						<h1 className='text-2xl font-semibold'>Help</h1>
						<p className='text-sm text-muted-foreground'>
							This page is your user reference sheet for how to use Hivemind day-to-day.
						</p>
					</div>

					<Card className='gap-3 py-4'>
						<CardHeader>
							<CardTitle>Contents</CardTitle>
							<CardDescription>Tap a topic to expand that section.</CardDescription>
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

							{sections.map((section) => (
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
						This page is your user reference sheet for how to use Hivemind day-to-day.
					</p>
				</div>

				<div className='grid items-start gap-4 lg:grid-cols-[17rem_1fr]'>
					<aside className='lg:sticky lg:top-20'>
						<Card className='gap-3 py-4'>
							<CardHeader className='px-4'>
								<CardTitle className='text-base'>Contents</CardTitle>
								<CardDescription>Jump to what you need</CardDescription>
							</CardHeader>
							<CardContent className='px-4'>
								<ul className='space-y-1 text-sm'>
									<li>
										<a href='#quick-start' className='text-primary hover:underline'>
											Quick Start
										</a>
									</li>
									{sections.map((section) => (
										<li key={section.id}>
											<a href={`#${section.id}`} className='text-primary hover:underline'>
												{section.title}
											</a>
										</li>
									))}
								</ul>
							</CardContent>
						</Card>
					</aside>

					<div className='space-y-4'>
						<section id='quick-start' className='scroll-mt-24'>
							<Card className='gap-3 py-4'>
								<CardHeader>
									<CardTitle>Quick Start</CardTitle>
									<CardDescription>Recommended path for new and returning users.</CardDescription>
								</CardHeader>
								<CardContent>{renderQuickStartBody()}</CardContent>
							</Card>
						</section>

						{sections.map((section) => (
							<section key={section.id} id={section.id} className='scroll-mt-24'>
								<Card className='gap-3 py-4'>
									<CardHeader>
										<CardTitle>{section.title}</CardTitle>
										<CardDescription>{section.description}</CardDescription>
									</CardHeader>
									<CardContent>{renderSectionBody(section)}</CardContent>
								</Card>
							</section>
						))}
					</div>
				</div>
			</div>
		</div>
	)
}
