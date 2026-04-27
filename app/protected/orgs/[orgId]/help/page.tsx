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
	commonActionsTitle: string
	commonActions: string[]
	relatedPages: string[]
}

const helpIntro =
	'Use this page as a practical reference for workflow rules, user choices, restrictions, and side effects across Hivemind.'

const pageSections: PageHelpSection[] = [
	{
		id: 'data-model',
		title: 'How Hivemind Data Is Organized',
		purpose: 'Use this section to understand how records relate to each other before you create or edit data.',
		functions: [
			{
				id: 'org-structure',
				name: 'Organizations, Species, and Enclosures',
				description:
					'Organizations contain members, species, enclosures, tasks, schedules, notifications, and history. Species group enclosure records, and enclosures are the main operational record for population, lineage, notes, and work.'
			},
			{
				id: 'tasks-vs-schedules',
				name: 'Tasks and Schedules Are Different',
				description:
					'Tasks are individual work items. Schedules are recurring rules that generate future work. One-time tasks and recurring schedules should be treated as different record types.'
			},
			{
				id: 'history-purpose',
				name: 'History Verifies What Changed',
				description:
					'Use History to confirm who changed a record, what changed, and when it happened after work is created, edited, completed, or deactivated.'
			},
			{
				id: 'inactive-records',
				name: 'Inactive Records Are Preserved',
				description:
					'Inactive enclosure records remain in the system instead of being erased. The record and its history stay available, but some actions become restricted.'
			},
			{
				id: 'future-vs-current-effects',
				name: 'Some Changes Affect Future Work Only',
				description:
					'Schedule edits and similar changes do not rewrite old completed work. Users should expect some actions to change future generation behavior without changing historical records.'
			}
		],
		commonActionsTitle: 'How to Apply This Model',
		commonActions: [
			'Use this model first: species group enclosures, enclosures hold operational data, tasks represent work, and schedules generate recurring future tasks.',
			'If you are deciding whether to edit a task or a schedule, ask whether you are changing one work item or the recurring rule behind future work.',
			'If you need proof that a change happened, check History instead of relying on current page state alone.'
		],
		relatedPages: ['Enclosures', 'Tasks', 'Task Schedules', 'History']
	},
	{
		id: 'creating-tasks',
		title: 'Creating Tasks',
		purpose: 'Use this section to choose the right task setup before work is created.',
		functions: [
			{
				id: 'single-vs-batch',
				name: 'Single Enclosure vs Batch Create',
				description:
					'Single-enclosure creation is for one specific enclosure. Batch create applies the same task setup across multiple enclosures and is species-scoped in the current workflow.'
			},
			{
				id: 'template-vs-custom',
				name: 'Template Task vs Custom Task',
				description:
					'Template tasks inherit the template-defined name and description. Custom tasks let users define their own details, but a custom task name is required.'
			},
			{
				id: 'task-assignment',
				name: 'Assigning an Owner',
				description:
					'Tasks can be assigned during creation or left unassigned. Assignment affects who appears responsible, but it is optional when users want open ownership.'
			},
			{
				id: 'task-priority',
				name: 'Setting Priority',
				description:
					'Priority should reflect how urgently a task needs attention and will influence filtering, review order, and how users interpret urgency across the organization.'
			},
			{
				id: 'due-date-or-recurrence',
				name: 'Choosing Due Date or Recurrence',
				description:
					'Users choose whether work should exist once on a selected date or repeat through a schedule. This decision controls whether the result is a one-time task or a recurring schedule.'
			},
			{
				id: 'time-window',
				name: 'Choosing a Time Window',
				description:
					'Time windows are Morning, Afternoon, or Any. They help communicate when the work should be completed, especially in recurring care routines.'
			}
		],
		commonActionsTitle: 'Before Creating Work',
		commonActions: [
			'Use single creation when only one enclosure needs the work, and batch create when the same work should be applied to multiple enclosures of the same species.',
			'If you choose a template task, make sure a template is actually selected before submitting.',
			'If task creation is blocked, confirm the target enclosure is active and that a required custom name or template selection is present.'
		],
		relatedPages: ['Tasks', 'Task Schedules', 'Enclosures']
	},
	{
		id: 'scheduling-work',
		title: 'Scheduling Work',
		purpose: 'Use this section to understand how one-time and recurring work behave before you save a schedule.',
		functions: [
			{
				id: 'one-time',
				name: 'One-Time Tasks',
				description:
					'One-time setup creates a single task due on one selected date. Use it for one-off care, temporary follow-up, or non-recurring work.'
			},
			{
				id: 'flexible-recurring',
				name: 'Flexible Recurring Schedules',
				description:
					'Flexible recurring schedules repeat relative to completion and are best when the next due point depends on when the last task was actually finished.'
			},
			{
				id: 'fixed-recurring',
				name: 'Fixed Recurring Schedules',
				description:
					'Fixed recurring schedules repeat on selected weekdays and are best for calendar-based routines that should happen on a steady weekly pattern.'
			},
			{
				id: 'end-conditions',
				name: 'End Conditions',
				description:
					'Recurring work can end Never, On date, or After X occurrences. This controls when schedule generation should stop without deleting the schedule history that already exists.'
			},
			{
				id: 'advance-count',
				name: 'Advance Task Count',
				description:
					'Advance task count controls how many future fixed-schedule task instances stay generated ahead of time so users can see upcoming work before its due date.'
			},
			{
				id: 'editing-schedules',
				name: 'Editing Schedules',
				description:
					'Editing a schedule changes future behavior. Users should not expect those edits to rewrite completed task records that already exist.'
			},
			{
				id: 'pausing-schedules',
				name: 'Pausing Schedules',
				description:
					'Pausing keeps the schedule record visible for review while stopping active generation until the schedule is reactivated.'
			},
			{
				id: 'deleting-schedules',
				name: 'Deleting Schedules',
				description:
					'Deleting a schedule removes the recurring rule and also deletes pending generated tasks linked to it, while completed tasks remain preserved.'
			}
		],
		commonActionsTitle: 'Schedule Checks',
		commonActions: [
			'Use One-time for work that should happen once, Flexible recurring when the next run depends on completion timing, and Fixed recurring when the work belongs on specific weekdays.',
			'If a fixed schedule will not save, confirm that at least one weekday and a valid advance task count have been selected.',
			'If you are not sure whether to pause or delete, pause when the work may return later and delete only when the schedule should no longer exist.'
		],
		relatedPages: ['Task Schedules', 'Tasks', 'History']
	},
	{
		id: 'task-completion',
		title: 'Completing Tasks and Forms',
		purpose:
			'Use this section to understand what is submitted when work is completed and how form behavior changes by task.',
		functions: [
			{
				id: 'single-completion',
				name: 'Single-Task Completion',
				description:
					'Single-task completion is for one task record and may require either a simple confirmation or a full set of form answers depending on the task template.'
			},
			{
				id: 'batch-completion',
				name: 'Batch Completion',
				description:
					'Batch completion submits one answer set across compatible tasks. It is intended for groups of tasks that can be completed together under the same response pattern.'
			},
			{
				id: 'required-optional-fields',
				name: 'Required and Optional Fields',
				description:
					'Required visible questions must be answered before submission. Optional questions can be left blank when the data is not needed.'
			},
			{
				id: 'conditional-questions',
				name: 'Conditional Questions',
				description:
					'Some questions appear only after earlier answers trigger them. Users should expect visible form fields to change as they work through a task.'
			},
			{
				id: 'no-form-tasks',
				name: 'No-Form Tasks',
				description:
					'Some tasks do not require answer fields at all and only need a completion action to mark the work done.'
			},
			{
				id: 'edit-resubmit',
				name: 'Edit and Resubmit',
				description:
					'Completed submissions can be edited and resubmitted when a correction is needed. This updates the recorded answers without creating a separate replacement task.'
			},
			{
				id: 'inactive-restrictions',
				name: 'Inactive Enclosure Restrictions',
				description:
					'Tasks in inactive enclosures cannot be completed or reassigned, even if the task record itself is still visible for review.'
			}
		],
		commonActionsTitle: 'Completion Checks',
		commonActions: [
			'If submit is unavailable, check for required visible questions that still need answers.',
			'If batch completion does not work, re-check that the selected tasks are actually compatible for one shared answer set.',
			'If completion or reassignment is blocked, confirm the enclosure is still active.'
		],
		relatedPages: ['Tasks', 'Enclosures', 'History']
	},
	{
		id: 'managing-enclosures',
		title: 'Managing Enclosure Records',
		purpose: 'Use this section to understand how enclosure records are created, edited, sourced, and exported.',
		functions: [
			{
				id: 'creating-enclosure',
				name: 'Creating an Enclosure',
				description:
					'Species, location, and count are the core inputs when creating a new enclosure. These choices define the record that later holds work, notes, and lineage context.'
			},
			{
				id: 'choosing-species',
				name: 'Choosing Species',
				description:
					'Species selection controls which species group the enclosure belongs to and influences suggested specimen tracking IDs and compatible source enclosure options.'
			},
			{
				id: 'location-choice',
				name: 'Choosing or Creating a Location',
				description:
					'Users can reuse an existing location or create a new one during enclosure creation or editing. Reusing the correct existing location helps keep reporting and search cleaner.'
			},
			{
				id: 'count-entry',
				name: 'Entering Count',
				description:
					'Current count should reflect the enclosure population represented by the record. Later count changes become part of the enclosure population history.'
			},
			{
				id: 'specimen-tracking',
				name: 'Using Specimen Tracking IDs',
				description:
					'Specimen tracking IDs can be reused from suggestions or entered manually. Reuse them when the enclosure belongs to the same tracked lineage, and create a new one when it should stand alone.'
			},
			{
				id: 'source-information',
				name: 'Recording Source Information',
				description:
					'Source data can come from outside institutions or other enclosures. Source enclosure links support lineage tracking inside the organization and should be used when provenance matters.'
			},
			{
				id: 'notes-lineage-history',
				name: 'Notes, Lineage, and Population History',
				description:
					'Enclosure detail tools let users review notes, lineage, and count-change history so operational context stays attached to the enclosure record itself.'
			},
			{
				id: 'exporting-data',
				name: 'Exporting Enclosure Data',
				description:
					'Exported enclosure data supports downstream operational workflows such as QR label generation because the export includes each enclosure URL.'
			}
		],
		commonActionsTitle: 'Record Quality Checks',
		commonActions: [
			'Reuse existing locations and specimen tracking IDs when continuity matters, and create new values only when the record should represent something distinct.',
			'Add source institution or source enclosure details when origin and lineage need to be preserved for later review.',
			'If export output is missing expected rows, check whether the selected enclosures are active and included in the export mode you are using.'
		],
		relatedPages: ['Enclosures', 'Tasks', 'History']
	},
	{
		id: 'qr-codes',
		title: 'QR Codes and Enclosure Labels',
		purpose:
			'Use this section to understand how enclosure QR labels are generated and what workflow Hivemind recommends.',
		functions: [
			{
				id: 'recommended-workflow',
				name: 'Recommended Label Workflow',
				description:
					'Hivemind recommends Avery as the intended label-printing workflow because it makes it easy to turn enclosure URLs into printable stickers that can be attached directly to enclosures.'
			},
			{
				id: 'avery-not-required',
				name: 'Avery Is Recommended, Not Required',
				description:
					'Users do not need to use Avery. Any tool or service that correctly generates QR codes from enclosure URLs will work with the app.'
			},
			{
				id: 'getting-urls',
				name: 'Getting Enclosure URLs',
				description:
					'The URLs used for QR generation come from the Enclosures page export. That export includes the enclosure URL needed for each label.'
			},
			{
				id: 'other-workflows',
				name: 'Other Supported Workflows',
				description:
					'Alternative workflows are acceptable as long as the QR code encodes the exported enclosure URL correctly. This can include external QR services or Microsoft Excel for the web with Microsoft 365 and a script-based generation workflow.'
			},
			{
				id: 'typical-process',
				name: 'Typical Process',
				description:
					'The standard flow is to export enclosure data, use the enclosure URL column in Avery or another QR workflow, print the labels, attach them to enclosures, and scan them in Hivemind.'
			}
		],
		commonActionsTitle: 'Label Workflow Checks',
		commonActions: [
			'Use Avery when you want the simplest label-printing path, but choose any other workflow that reliably encodes the exported enclosure URL if it better fits your operation.',
			'Always start from the Enclosures export so each label is generated from the correct enclosure URL.',
			'If a QR workflow produces working enclosure URLs, it is compatible even if it is not Avery.'
		],
		relatedPages: ['Enclosures', 'Help']
	},
	{
		id: 'lifecycle-rules',
		title: 'Active, Inactive, and Lifecycle Rules',
		purpose:
			'Use this section to understand what changes when enclosure records are activated, inactivated, or restored.',
		functions: [
			{
				id: 'active-meaning',
				name: 'What Active Means',
				description:
					'Active enclosures participate in normal operational workflows and can be used for task creation, note entry, and other day-to-day activity.'
			},
			{
				id: 'inactive-meaning',
				name: 'What Inactive Means',
				description:
					'Inactive enclosures remain in the system but are removed from active-focused workflows. Inactivity is a preservation state, not an erase action.'
			},
			{
				id: 'preserved-data',
				name: 'What Stays Preserved',
				description:
					'The enclosure record, its history, and related context stay preserved when an enclosure becomes inactive, allowing later review or reactivation.'
			},
			{
				id: 'restricted-actions',
				name: 'What Becomes Restricted',
				description:
					'Inactive enclosures restrict task creation, note entry, task completion, reassignment, and some edit actions even though the record itself still exists.'
			},
			{
				id: 'batch-status',
				name: 'Batch Status Changes',
				description:
					'Users can activate or inactivate multiple enclosure records at once through batch actions, which is useful when a large group of records changes operational state together.'
			},
			{
				id: 'reactivation',
				name: 'Reactivation Behavior',
				description:
					'Reactivating an enclosure returns it to active workflows so it can participate in normal work again without creating a brand-new enclosure record.'
			}
		],
		commonActionsTitle: 'Status Change Checks',
		commonActions: [
			'Set an enclosure inactive when the data should be preserved but normal operational actions should stop.',
			'If users cannot create tasks, add notes, or complete work, check whether the enclosure was moved to inactive status.',
			'Reactivation is the right choice when the same record should return to active use rather than be recreated.'
		],
		relatedPages: ['Enclosures', 'Tasks', 'Task Schedules', 'History']
	},
	{
		id: 'verifying-changes',
		title: 'Finding, Filtering, and Verifying Changes',
		purpose: 'Use this section to confirm results after tasks, schedules, enclosures, or notifications have changed.',
		functions: [
			{
				id: 'task-filters',
				name: 'When to Use Task Filters',
				description:
					'Task filters narrow work by search, status, priority, and date behavior so users can focus on the right operational slice before acting.'
			},
			{
				id: 'schedule-filters',
				name: 'When to Use Schedule Filters',
				description:
					'Schedule filters help isolate active, paused, priority-based, or type-based recurring work when a schedule list is too broad to review effectively.'
			},
			{
				id: 'history-usage',
				name: 'When to Use History',
				description:
					'History is the primary source for confirming who changed a record, what action occurred, and when the action happened.'
			},
			{
				id: 'inbox-usage',
				name: 'When to Use Inbox and Notifications',
				description:
					'Inbox and notifications support follow-up work, unread review, and quick navigation into records that need attention.'
			},
			{
				id: 'enclosure-detail',
				name: 'When to Open Enclosure Detail',
				description:
					'Open enclosure detail when users need one enclosure’s full operational context, including notes, lineage, current count, and direct access to enclosure-linked work.'
			}
		],
		commonActionsTitle: 'Verification Checks',
		commonActions: [
			'Use task and schedule filters before broad review when the result set is too large to work with directly.',
			'Use History when you need a trustworthy answer about whether a change actually happened and who performed it.',
			'Use enclosure detail when one record needs closer review instead of a whole-table workflow.'
		],
		relatedPages: ['Tasks', 'Task Schedules', 'History', 'Inbox and Notifications', 'Enclosures']
	},
	{
		id: 'dashboard',
		title: 'Dashboard',
		purpose: 'Use Dashboard as a summary and launch point, not as the primary place for deep workflow explanations.',
		functions: [
			{
				id: 'summary-view',
				name: 'Summary and Launch Point',
				description:
					'Dashboard is best for spotting what needs attention first and moving into operational pages such as Tasks, Task Schedules, or Enclosures.'
			},
			{
				id: 'attention-first',
				name: 'Use It to Prioritize',
				description:
					'Panels on Dashboard help users identify workload, at-risk records, and recent activity so the next action can be chosen quickly.'
			},
			{
				id: 'leave-dashboard',
				name: 'Move to Operational Pages for Detail',
				description:
					'Once a priority is identified, users should move into Tasks, Task Schedules, or Enclosures for the actual creation, review, or editing work.'
			}
		],
		commonActionsTitle: 'Dashboard Boundaries',
		commonActions: [
			'Use Dashboard to decide where to go next, not to understand the full rules behind task, schedule, enclosure, or QR workflows.',
			'If a dashboard panel raises a question, open the linked operational page and use this Help page for deeper process guidance.',
			'When in doubt about what needs action first, start with the most urgent task or enclosure surfaced by Dashboard.'
		],
		relatedPages: ['Tasks', 'Task Schedules', 'Enclosures', 'History']
	}
]

function getFunctionAnchor(sectionId: string, functionId: string) {
	return `${sectionId}-${functionId}`
}

export default function HelpPage() {
	const isMobile = useIsMobile()
	const [openMobileSection, setOpenMobileSection] = useState(pageSections[0]?.id ?? '')
	const [openDesktopTocSection, setOpenDesktopTocSection] = useState(pageSections[0]?.id ?? '')

	const renderSectionBody = (section: PageHelpSection, showPurpose = true) => (
		<div className='space-y-4'>
			{showPurpose ? (
				<div>
					<p className='text-sm text-muted-foreground'>{section.purpose}</p>
				</div>
			) : null}
			<div>
				<p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>Key Rules and Choices</p>
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
				<p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
					{section.commonActionsTitle}
				</p>
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
						<p className='text-sm text-muted-foreground'>{helpIntro}</p>
					</div>

					<Card className='gap-3 py-4'>
						<CardHeader>
							<CardTitle className='text-base'>Topics</CardTitle>
							<CardDescription>Tap a topic to expand one section at a time.</CardDescription>
						</CardHeader>
						<CardContent className='space-y-2'>
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
					<p className='text-sm text-muted-foreground'>{helpIntro}</p>
				</div>

				<div className='grid items-start gap-4 lg:grid-cols-[18rem_1fr]'>
					<aside className='lg:sticky lg:top-20'>{renderContentsCard()}</aside>

					<div className='space-y-4'>{pageSections.map((section) => renderSectionCard(section))}</div>
				</div>
			</div>
		</div>
	)
}
