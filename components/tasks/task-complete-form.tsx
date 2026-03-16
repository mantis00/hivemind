'use client'

import * as React from 'react'
import { useState, useEffect, useRef, startTransition } from 'react'
import { ArrowLeftCircle, CheckCircle2Icon, CircleUserRound, LoaderCircle, MapPinIcon, Pencil } from 'lucide-react'
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

import { cn } from '@/lib/utils'
import {
	useTaskById,
	useTaskTemplateById,
	useEnclosureById,
	useOrgMemberProfiles,
	useTaskFormAnswers,
	type QuestionTemplate
} from '@/lib/react-query/queries'
import { decodeChoices } from '@/components/superadmin/template-fields'
import { useSubmitTaskForm, useResubmitTaskForm } from '@/lib/react-query/mutations'
import { useCurrentClientUser } from '@/lib/react-query/auth'
import { ReassignMemberButton } from '@/components/tasks/reassign-member-button'
import { DeleteTaskButton } from '@/components/tasks/delete-task-button'
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
	const resubmitForm = useResubmitTaskForm()
	const { data: currentUser } = useCurrentClientUser()
	const router = useRouter()

	const { data: existingAnswers } = useTaskFormAnswers(taskId)

	// answers keyed by question_id
	const [answers, setAnswers] = useState<Record<string, string>>({})
	const [isEditing, setIsEditing] = useState(false)
	const prevExistingAnswersRef = useRef<typeof existingAnswers>(undefined)

	// Sync answers from DB when loaded/refetched (skip while actively editing)
	useEffect(() => {
		if (existingAnswers && existingAnswers !== prevExistingAnswersRef.current && !isEditing) {
			prevExistingAnswersRef.current = existingAnswers
			const mapped: Record<string, string> = {}
			for (const a of existingAnswers) {
				mapped[a.question_id] = a.answer ?? ''
			}
			startTransition(() => setAnswers(mapped))
		}
	}, [existingAnswers, isEditing])

	const isLoading = taskLoading || templateLoading

	const setAnswer = (questionId: string, value: string) => {
		setAnswers((prev) => ({ ...prev, [questionId]: value }))
	}

	const handleSubmit = () => {
		const rawQuestions = template?.question_templates ?? []

		// Decode conditions and build enriched question list
		type QuestionMeta = QuestionTemplate & {
			conditionFieldKey: string
			conditionValue: string
			decodedChoices: string[]
		}
		const allQMeta: QuestionMeta[] = rawQuestions.map((q) => {
			const { choices, conditionFieldKey, conditionValue } = decodeChoices(q.choices)
			return { ...q, conditionFieldKey, conditionValue, decodedChoices: choices }
		})

		const isVisible = (q: QuestionMeta): boolean => {
			if (!q.conditionFieldKey) return true
			const trigger = allQMeta.find((t) => t.question_key === q.conditionFieldKey)
			if (!trigger) return true
			const triggerAnswer = answers[trigger.id] ?? ''
			if (trigger.type === 'multiselect') {
				return triggerAnswer
					.split(',')
					.map((v) => v.trim())
					.filter(Boolean)
					.includes(q.conditionValue)
			}
			return triggerAnswer === q.conditionValue
		}

		const visibleQuestions = allQMeta.filter(isVisible)

		// Validate required visible fields only
		for (const q of visibleQuestions) {
			if (q.required) {
				const val = answers[q.id]
				if (!val || (typeof val === 'string' && val.trim() === '')) {
					toast.error(`"${q.label}" is required.`)
					return
				}
			}
		}

		const answerPayload = visibleQuestions.map((q) => ({
			question_id: q.id as UUID,
			answer: answers[q.id] ?? ''
		}))

		submitForm.mutate(
			{ task_id: taskId, user_id: currentUser!.id as UUID, answers: answerPayload },
			{
				onSuccess: () => {
					if (visibleQuestions.length === 0) router.back()
					// With questions, form stays and grays out once isCompleted becomes true
				}
			}
		)
	}

	const handleResubmit = () => {
		const rawQuestions = template?.question_templates ?? []
		type ResubmitQuestionMeta = QuestionTemplate & {
			conditionFieldKey: string
			conditionValue: string
			decodedChoices: string[]
		}
		const allQMeta: ResubmitQuestionMeta[] = rawQuestions.map((q) => {
			const { choices, conditionFieldKey, conditionValue } = decodeChoices(q.choices)
			return { ...q, conditionFieldKey, conditionValue, decodedChoices: choices }
		})
		const isVisible = (q: ResubmitQuestionMeta): boolean => {
			if (!q.conditionFieldKey) return true
			const trigger = allQMeta.find((t) => t.question_key === q.conditionFieldKey)
			if (!trigger) return true
			const triggerAnswer = answers[trigger.id] ?? ''
			if (trigger.type === 'multiselect') {
				return triggerAnswer
					.split(',')
					.map((v) => v.trim())
					.filter(Boolean)
					.includes(q.conditionValue)
			}
			return triggerAnswer === q.conditionValue
		}
		const visibleQuestions = allQMeta.filter(isVisible)

		for (const q of visibleQuestions) {
			if (q.required) {
				const val = answers[q.id]
				if (!val || (typeof val === 'string' && val.trim() === '')) {
					toast.error(`"${q.label}" is required.`)
					return
				}
			}
		}

		const answerPayload = visibleQuestions.map((q) => ({
			question_id: q.id as UUID,
			answer: answers[q.id] ?? ''
		}))

		resubmitForm.mutate(
			{ task_id: taskId, user_id: currentUser!.id as UUID, answers: answerPayload },
			{ onSuccess: () => setIsEditing(false) }
		)
	}

	const handleCancelEdit = () => {
		if (existingAnswers) {
			const mapped: Record<string, string> = {}
			for (const a of existingAnswers) {
				mapped[a.question_id] = a.answer ?? ''
			}
			setAnswers(mapped)
		}
		setIsEditing(false)
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
	const rawQuestions = template?.question_templates ?? []
	type QuestionMeta = QuestionTemplate & { conditionFieldKey: string; conditionValue: string; decodedChoices: string[] }
	const allQMeta: QuestionMeta[] = rawQuestions.map((q) => {
		const { choices, conditionFieldKey, conditionValue } = decodeChoices(q.choices)
		return { ...q, conditionFieldKey, conditionValue, decodedChoices: choices }
	})
	const isQuestionVisible = (q: QuestionMeta): boolean => {
		if (!q.conditionFieldKey) return true
		const trigger = allQMeta.find((t) => t.question_key === q.conditionFieldKey)
		if (!trigger) return true
		const triggerAnswer = answers[trigger.id] ?? ''
		if (trigger.type === 'multiselect') {
			return triggerAnswer
				.split(',')
				.map((v) => v.trim())
				.filter(Boolean)
				.includes(q.conditionValue)
		}
		return triggerAnswer === q.conditionValue
	}
	const visibleQMeta = allQMeta.filter(isQuestionVisible)
	const questions = visibleQMeta
	const isCompleted = task.status === 'completed'
	const completedByMember = task.completed_by
		? members.find((m) => (m.id as string) === (task.completed_by as string))
		: null
	const completedByName = completedByMember
		? completedByMember.full_name || `${completedByMember.first_name} ${completedByMember.last_name}`.trim()
		: null

	return (
		<div className='space-y-6 w-full max-w-xl mx-auto'>
			{/* ── Task header ── */}
			<div className='space-y-1'>
				<div className='flex items-start justify-between gap-2'>
					<h1 className='text-2xl font-bold capitalize'>{taskName}</h1>
					{!isCompleted && (
						<DeleteTaskButton
							taskId={taskId}
							taskName={taskName}
							redirectTo={`/protected/orgs/${orgId}/enclosures/${enclosureId}`}
						/>
					)}
				</div>
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
				</div>
			</div>

			{/* ── Completion info card ── */}
			{isCompleted && (
				<Card className='border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900'>
					<CardContent className='py-3 px-4 flex items-center gap-3'>
						<div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900'>
							<CheckCircle2Icon className='h-4 w-4 text-green-600 dark:text-green-400' />
						</div>
						<div>
							<p className='text-sm font-semibold text-green-800 dark:text-green-300'>Task Completed</p>
							<p className='text-xs text-green-700/80 dark:text-green-400 mt-0.5'>
								{task.completed_time ? new Date(task.completed_time).toLocaleString() : ''}
								{completedByName ? ` · by ${completedByName}` : ''}
							</p>
						</div>
					</CardContent>
				</Card>
			)}

			{/* ── Form or buttons ── */}
			{questions.length > 0 ? (
				<div>
					<Card className={cn(!isEditing && isCompleted && 'opacity-60')}>
						<CardHeader className='pb-3'>
							<CardTitle className='text-base'>Data Entry Form</CardTitle>
							<CardDescription>
								{isCompleted && !isEditing
									? 'Submitted answers — click Edit to make changes'
									: 'Complete all required fields before finishing the task'}
							</CardDescription>
						</CardHeader>
						<Separator />
						<CardContent
							className={cn('pt-4 space-y-5', !isEditing && isCompleted && 'pointer-events-none select-none')}
						>
							{questions.map((q) => (
								<QuestionField
									key={q.id}
									question={q}
									choices={q.decodedChoices}
									value={answers[q.id] ?? ''}
									onChange={(val) => setAnswer(q.id, val)}
									disabled={!isEditing && isCompleted}
								/>
							))}
						</CardContent>
					</Card>

					<div className='flex gap-3 mt-4'>
						{isCompleted ? (
							isEditing ? (
								<>
									<Button variant='outline' className='flex-1' onClick={handleCancelEdit}>
										Cancel
									</Button>
									<Button className='flex-1' disabled={resubmitForm.isPending} onClick={handleResubmit}>
										{resubmitForm.isPending ? (
											<LoaderCircle className='h-4 w-4 animate-spin' />
										) : (
											<>
												<CheckCircle2Icon className='h-4 w-4' />
												Resubmit
											</>
										)}
									</Button>
								</>
							) : (
								<>
									<Button variant='outline' className='flex-1' onClick={() => router.back()}>
										<ArrowLeftCircle className='h-4 w-4' />
										Back
									</Button>
									<Button variant='secondary' className='flex-1' onClick={() => setIsEditing(true)}>
										<Pencil className='h-4 w-4' />
										Edit Submission
									</Button>
								</>
							)
						) : (
							<>
								<Button variant='outline' className='flex-1' onClick={() => router.back()}>
									Cancel
								</Button>
								<Button className='flex-1' disabled={submitForm.isPending} onClick={handleSubmit}>
									{submitForm.isPending ? (
										<LoaderCircle className='h-4 w-4 animate-spin' />
									) : (
										<>
											<CheckCircle2Icon className='h-4 w-4' />
											Complete Task
										</>
									)}
								</Button>
							</>
						)}
					</div>
				</div>
			) : isCompleted ? (
				// No questions, already completed — completion info shown above
				<Button variant='outline' className='w-full' onClick={() => router.back()}>
					<ArrowLeftCircle className='h-4 w-4' />
					Return to Tasks
				</Button>
			) : (
				// No questions, not completed — simple complete button
				<div className='flex gap-3'>
					<Button variant='outline' className='flex-1' onClick={() => router.back()}>
						Cancel
					</Button>
					<Button
						className='flex-1'
						disabled={submitForm.isPending}
						onClick={() =>
							submitForm.mutate(
								{ task_id: taskId, user_id: currentUser!.id as UUID, answers: [] },
								{ onSuccess: () => router.back() }
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
	choices,
	value,
	onChange,
	disabled
}: {
	question: QuestionTemplate
	choices: string[]
	value: string
	onChange: (val: string) => void
	disabled?: boolean
}) {
	const { label, type, required } = question

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
					disabled={disabled}
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
					disabled={disabled}
				/>
			)}

			{type === 'boolean' && (
				<div className='flex items-center gap-2'>
					<Checkbox
						id={`q-${question.id}`}
						checked={value === 'true'}
						onCheckedChange={(checked) => onChange(checked ? 'true' : 'false')}
						disabled={disabled}
					/>
					<label htmlFor={`q-${question.id}`} className='text-sm cursor-pointer'>
						Yes
					</label>
				</div>
			)}

			{type === 'select' && choices.length > 0 && (
				<Select value={value} onValueChange={onChange} required={required} disabled={disabled}>
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

			{type === 'multiselect' && choices.length > 0 && (
				<div className='space-y-2'>
					{choices.map((choice) => {
						const selected = value
							? value
									.split(',')
									.map((v) => v.trim())
									.filter(Boolean)
							: []
						const isChecked = selected.includes(choice)
						return (
							<div key={choice} className='flex items-center gap-2'>
								<Checkbox
									id={`q-${question.id}-${choice}`}
									checked={isChecked}
									onCheckedChange={(checked) => {
										const newSelected = checked ? [...selected, choice] : selected.filter((v) => v !== choice)
										onChange(newSelected.join(','))
									}}
									disabled={disabled}
								/>
								<label htmlFor={`q-${question.id}-${choice}`} className='text-sm cursor-pointer'>
									{choice}
								</label>
							</div>
						)
					})}
				</div>
			)}
		</div>
	)
}
