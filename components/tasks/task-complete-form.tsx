'use client'

import * as React from 'react'
import { useState } from 'react'
import { ArrowLeftCircle, CheckCircle2Icon, CircleUserRound, LoaderCircle, MapPinIcon } from 'lucide-react'
import { UUID } from 'crypto'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

import {
	useTaskById,
	useTaskTemplateById,
	useEnclosureById,
	useOrgMemberProfiles,
	type QuestionTemplate
} from '@/lib/react-query/queries'
import { useSubmitTaskForm } from '@/lib/react-query/mutations'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { ReassignMemberButton } from '@/components/tasks/reassign-member-button'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

// ─── Card wrapper ─────────────────────────────────────────────────────────────

interface TaskCompleteFormProps {
	taskId: UUID
	orgId: UUID
	enclosureId: UUID
}

export function TaskCompleteForm({ taskId, orgId, enclosureId }: TaskCompleteFormProps) {
	const { data: task, isLoading: taskLoading } = useTaskById(taskId)
	const { data: enclosure } = useEnclosureById(enclosureId, orgId)
	const { data: members = [] } = useOrgMemberProfiles(orgId)
	const templateId = task?.template_id as UUID | undefined
	const { data: template, isLoading: templateLoading } = useTaskTemplateById(templateId as UUID)

	const submitForm = useSubmitTaskForm()
	const { data: currentUser } = useCurrentClientUser()
	const router = useRouter()

	// answers keyed by question_id
	const [answers, setAnswers] = useState<Record<string, string>>({})

	const isLoading = taskLoading || templateLoading

	const setAnswer = (questionId: string, value: string) => {
		setAnswers((prev) => ({ ...prev, [questionId]: value }))
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()

		const questions = template?.question_templates ?? []

		// Validate required fields
		for (const q of questions) {
			if (q.required) {
				const val = answers[q.id]
				if (!val || (typeof val === 'string' && val.trim() === '')) {
					toast.error(`"${q.label}" is required.`)
					return
				}
			}
		}

		const answerPayload = questions.map((q) => ({
			question_id: q.id as UUID,
			answer: answers[q.id] ?? ''
		}))

		submitForm.mutate(
			{ task_id: taskId, user_id: currentUser!.id as UUID, answers: answerPayload },
			{
				onSuccess: () => {
					router.back()
				}
			}
		)
	}

	if (isLoading) {
		return (
			<div className='flex items-center justify-center h-48'>
				<LoaderCircle className='h-8 w-8 animate-spin text-muted-foreground' />
			</div>
		)
	}

	if (!task) {
		return <p className='text-sm text-muted-foreground'>Task not found.</p>
	}

	const taskName = task.name ?? template?.type ?? 'Task'
	const taskDesc = task.description ?? template?.description
	const enclosureName = enclosure?.name ?? enclosureId
	const assignedMember = task?.assigned_to
		? members.find((m) => (m.id as string) === (task.assigned_to as string))
		: null
	const assignedMemberName = assignedMember
		? assignedMember.full_name || `${assignedMember.first_name} ${assignedMember.last_name}`.trim()
		: null
	const questions = template?.question_templates ?? []
	const isCompleted = task.status === 'completed'

	return (
		<div className='space-y-6 w-full max-w-xl mx-auto'>
			{/* ── Task header ── */}
			<div className='space-y-1'>
				<h1 className='text-2xl font-bold capitalize'>{taskName}</h1>
				{taskDesc && <p className='text-sm text-muted-foreground'>{taskDesc}</p>}

				<div className='flex flex-wrap items-center gap-4 pt-1 text-sm text-muted-foreground'>
					<span className='flex items-center gap-1.5'>
						<MapPinIcon className='h-3.5 w-3.5' />
						{enclosureName}
					</span>
					{isCompleted ? (
						<span className='flex items-center gap-1.5'>
							<CircleUserRound className='h-3.5 w-3.5' />
							{assignedMemberName ?? 'Unassigned'}
						</span>
					) : (
						<ReassignMemberButton
							taskId={taskId}
							assignedTo={task.assigned_to}
							assignedMemberName={assignedMemberName}
							members={members}
						/>
					)}
					{task.priority && (
						<Badge
							variant='secondary'
							className={
								task.priority === 'high'
									? 'bg-red-100 text-red-800'
									: task.priority === 'medium'
										? 'bg-yellow-100 text-yellow-800'
										: 'bg-blue-100 text-blue-800'
							}
						>
							{task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} priority
						</Badge>
					)}
					{isCompleted && (
						<Badge className='bg-green-100 text-green-800 border-green-200'>
							<CheckCircle2Icon className='h-3 w-3 mr-1' />
							Completed
						</Badge>
					)}
				</div>
			</div>

			{/* ── Form or completed state ── */}
			{isCompleted ? (
				<Card>
					<CardContent className='pt-6 text-center text-sm text-muted-foreground space-y-1'>
						<CheckCircle2Icon className='h-12 w-12 mx-auto mb-3 text-green-500' />
						<p className='font-medium text-foreground'>This task has been completed.</p>
						{task.completed_time && <p className='text-xs'>{new Date(task.completed_time).toLocaleString()}</p>}
						{(() => {
							const completedByMember = task.completed_by
								? members.find((m) => (m.id as string) === (task.completed_by as string))
								: null
							const completedByName = completedByMember
								? completedByMember.full_name || `${completedByMember.first_name} ${completedByMember.last_name}`.trim()
								: null
							return completedByName ? <p className='text-xs'>Completed by {completedByName}</p> : null
						})()}
						<Button
							variant='ghost'
							className='border-2 mt-2'
							onClick={() => {
								router.back()
							}}
						>
							<ArrowLeftCircle />
							Return to Enclosure Tasks
						</Button>
					</CardContent>
				</Card>
			) : questions.length > 0 ? (
				<form onSubmit={handleSubmit}>
					<Card>
						<CardHeader className='pb-3'>
							<CardTitle className='text-base'>Data Entry Form</CardTitle>
							<CardDescription>Complete all required fields before finishing the task</CardDescription>
						</CardHeader>
						<Separator />
						<CardContent className='pt-4 space-y-5'>
							{questions.map((q) => (
								<QuestionField
									key={q.id}
									question={q}
									value={answers[q.id] ?? ''}
									onChange={(val) => setAnswer(q.id, val)}
								/>
							))}
						</CardContent>
					</Card>

					<div className='flex gap-3 mt-4'>
						<Button type='button' variant='outline' className='flex-1' onClick={() => router.back()}>
							Cancel
						</Button>
						<Button type='submit' className='flex-1' disabled={submitForm.isPending}>
							{submitForm.isPending ? (
								<LoaderCircle className='h-4 w-4 animate-spin' />
							) : (
								<>
									<CheckCircle2Icon className='h-4 w-4' />
									Complete Task
								</>
							)}
						</Button>
					</div>
				</form>
			) : (
				// No form — custom task or template with no questions
				<div className='flex gap-3'>
					<Button type='button' variant='outline' className='flex-1' onClick={() => router.back()}>
						Cancel
					</Button>
					<Button
						className='flex-1'
						disabled={submitForm.isPending}
						onClick={() =>
							submitForm.mutate(
								{ task_id: taskId, user_id: currentUser!.id as UUID, answers: [] },
								{
									onSuccess: () => {
										router.back()
									}
								}
							)
						}
					>
						{submitForm.isPending ? (
							<LoaderCircle className='h-4 w-4 animate-spin' />
						) : (
							<>
								<CheckCircle2Icon className='h-4 w-4' />
								Complete Task
							</>
						)}
					</Button>
				</div>
			)}
		</div>
	)
}

// ─── QuestionField ────────────────────────────────────────────────────────────

function QuestionField({
	question,
	value,
	onChange
}: {
	question: QuestionTemplate
	value: string
	onChange: (val: string) => void
}) {
	const { label, type, required, choices } = question

	return (
		<div className='space-y-2'>
			<Label className='text-sm font-medium'>
				{label}
				{required && <span className='text-destructive ml-1'>*</span>}
			</Label>

			{type === 'text' && (
				<Textarea
					value={value}
					onChange={(e) => onChange(e.target.value)}
					required={required}
					rows={2}
					className='text-sm resize-none'
					placeholder='Enter your response…'
				/>
			)}

			{type === 'number' && (
				<Input
					type='number'
					value={value}
					onChange={(e) => onChange(e.target.value)}
					required={required}
					className='text-sm'
					placeholder='0'
				/>
			)}

			{type === 'boolean' && (
				<div className='flex items-center gap-2'>
					<Checkbox
						id={`q-${question.id}`}
						checked={value === 'true'}
						onCheckedChange={(checked) => onChange(checked ? 'true' : 'false')}
					/>
					<label htmlFor={`q-${question.id}`} className='text-sm cursor-pointer'>
						Yes
					</label>
				</div>
			)}

			{type === 'select' && choices && choices.length > 0 && (
				<Select value={value} onValueChange={onChange} required={required}>
					<SelectTrigger>
						<SelectValue placeholder='Select an option' />
					</SelectTrigger>
					<SelectContent>
						{choices.map((choice) => (
							<SelectItem key={choice} value={choice}>
								{choice}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			)}
		</div>
	)
}
