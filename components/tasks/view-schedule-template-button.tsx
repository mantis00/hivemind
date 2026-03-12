'use client'

import { useState } from 'react'
import { ClipboardListIcon, LoaderCircle } from 'lucide-react'
import { UUID } from 'crypto'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ResponsiveDialogDrawer } from '@/components/ui/dialog-to-drawer'
import { useTaskTemplateById, type QuestionTemplate } from '@/lib/react-query/queries'

// ─── Props ────────────────────────────────────────────────────────────────────

interface ViewScheduleTemplateButtonProps {
	templateId: UUID | null
	taskName: string | null
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ViewScheduleTemplateButton({ templateId, taskName }: ViewScheduleTemplateButtonProps) {
	const [open, setOpen] = useState(false)

	const { data: template, isLoading } = useTaskTemplateById(templateId as UUID)

	if (!templateId) return <span className='text-[10px] text-muted-foreground/60 italic shrink-0'>Custom</span>

	const questions = template?.question_templates ?? []

	return (
		<>
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant='ghost'
							size='icon'
							className='h-5 w-5 text-muted-foreground hover:text-foreground shrink-0'
							onClick={(e) => {
								e.stopPropagation()
								setOpen(true)
							}}
						>
							<ClipboardListIcon className='h-3 w-3' />
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p>View template</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>

			<ResponsiveDialogDrawer
				title='Task Template'
				description={taskName ? `Template used by "${taskName}"` : 'Template preview'}
				trigger={null}
				open={open}
				onOpenChange={setOpen}
			>
				{isLoading ? (
					<div className='flex justify-center items-center py-10'>
						<LoaderCircle className='h-5 w-5 animate-spin text-muted-foreground' />
					</div>
				) : !template ? (
					<div className='text-sm text-muted-foreground text-center py-10'>Template not found.</div>
				) : (
					<div className='space-y-4' data-vaul-no-drag>
						{/* ── Type + description ── */}
						<div className='flex flex-wrap items-center gap-2'>
							<Badge variant='outline' className='font-mono text-xs capitalize'>
								{template.type}
							</Badge>
							{template.description && <span className='text-sm text-muted-foreground'>{template.description}</span>}
						</div>

						{/* ── Fields ── */}
						{questions.length === 0 ? (
							<p className='text-sm text-muted-foreground'>This template has no form fields.</p>
						) : (
							<>
								<Separator />
								<div className='space-y-3'>
									<p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>
										Form Fields · {questions.length} {questions.length === 1 ? 'field' : 'fields'}
									</p>
									{questions.map((q, i) => (
										<ReadOnlyField key={q.id} index={i} question={q} />
									))}
								</div>
							</>
						)}
					</div>
				)}
			</ResponsiveDialogDrawer>
		</>
	)
}

// ─── ReadOnlyField ─────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
	text: 'Text',
	number: 'Number',
	boolean: 'Checkbox (Yes / No)',
	select: 'Select / Dropdown'
}

function ReadOnlyField({ index, question }: { index: number; question: QuestionTemplate }) {
	return (
		<div className='rounded-lg border bg-muted/30 p-3 space-y-2'>
			{/* ── Header ── */}
			<div className='flex items-center justify-between'>
				<span className='text-xs font-semibold text-muted-foreground'>Field {index + 1}</span>
				{question.required && (
					<Badge variant='secondary' className='text-[10px] h-4 px-1.5'>
						Required
					</Badge>
				)}
			</div>

			{/* ── Label + type ── */}
			<div className='grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm'>
				<div>
					<p className='text-xs text-muted-foreground'>Label</p>
					<p className='font-medium'>{question.label}</p>
				</div>
				<div>
					<p className='text-xs text-muted-foreground'>Type</p>
					<p>{TYPE_LABELS[question.type] ?? question.type}</p>
				</div>
			</div>

			{/* ── Select options ── */}
			{question.type === 'select' && question.choices && question.choices.length > 0 && (
				<div className='space-y-1 pt-0.5'>
					<p className='text-xs text-muted-foreground'>Options</p>
					<div className='flex flex-wrap gap-1'>
						{question.choices.map((c) => (
							<Badge key={c} variant='secondary' className='text-xs font-normal'>
								{c}
							</Badge>
						))}
					</div>
				</div>
			)}
		</div>
	)
}
